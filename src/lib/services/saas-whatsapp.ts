import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db/mongodb";
import type { DbOrganization, DbPublicSite } from "@/lib/db/types";
import { getSystemSettings } from "./system-settings";
import { normalizeWhatsAppNumber } from "./whatsapp";

export interface SaasDispatchResult {
  success: boolean;
  message: string;
  deliveredVia: "gateway" | "recorded";
  phone: string;
}

/**
 * Send a WhatsApp message from the SaaS Platform official WhatsApp account.
 */
export async function sendSaasWhatsAppMessage(
  rawPhone: string,
  message: string,
  metadata?: Record<string, any>,
): Promise<SaasDispatchResult> {
  const targetPhone = normalizeWhatsAppNumber(rawPhone);
  if (!targetPhone) {
    return {
      success: false,
      message: "Invalid target phone number format.",
      deliveredVia: "recorded",
      phone: rawPhone,
    };
  }

  const sys = await getSystemSettings();
  const gateway = sys.whatsappGateway;
  const saasConfig = sys.saasWhatsapp;
  const sessionName = saasConfig?.instanceName || "saas_platform";

  let deliveredVia: "gateway" | "recorded" = "recorded";
  let gatewaySuccess = false;

  if (gateway?.enabled && gateway?.serverUrl) {
    try {
      const cleanGateway = gateway.serverUrl.replace(/\/$/, "");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(gateway.apiKey
          ? {
              "x-api-secret": gateway.apiKey,
              "X-Api-Key": gateway.apiKey,
              apikey: gateway.apiKey,
              Authorization: `Bearer ${gateway.apiKey}`,
            }
          : {}),
      };

      // 1. Try Nectar multi-tenant format: POST /sessions/:sessionName/send
      let res = await fetch(`${cleanGateway}/sessions/${encodeURIComponent(sessionName)}/send`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          phone: targetPhone,
          message,
        }),
      });

      // 2. If 404, try WAHA format: POST /api/sendText
      if (!res.ok && res.status === 404) {
        res = await fetch(`${cleanGateway}/api/sendText`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            session: sessionName,
            chatId: `${targetPhone}@c.us`,
            text: message,
          }),
        });
      }

      // 3. If 404, try Evolution API format
      if (!res.ok && res.status === 404) {
        res = await fetch(`${cleanGateway}/message/sendText/${encodeURIComponent(sessionName)}`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            number: targetPhone,
            text: message,
          }),
        });
      }

      // 4. Fallback legacy /send
      if (!res.ok && res.status === 404) {
        res = await fetch(`${cleanGateway}/send`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            phone: targetPhone,
            message,
          }),
        });
      }

      if (res.ok) {
        gatewaySuccess = true;
        deliveredVia = "gateway";
      } else {
        console.warn(`SaaS WhatsApp gateway responded with status: ${res.status}`);
      }
    } catch (err) {
      console.warn("Could not reach WhatsApp Gateway for SaaS dispatch, logging locally:", err);
    }
  }

  // Record dispatch log in MongoDB
  try {
    const db = await getDb();
    await db.collection("saas_whatsapp_logs").insertOne({
      phone: targetPhone,
      message,
      deliveredVia,
      gatewaySuccess,
      metadata: metadata || {},
      createdAt: Date.now(),
    });
  } catch (err) {
    console.error("Failed to log SaaS WhatsApp message:", err);
  }

  return {
    success: true,
    message: gatewaySuccess
      ? `SaaS WhatsApp update sent to ${targetPhone} via Gateway.`
      : `SaaS WhatsApp update recorded for ${targetPhone} (Gateway offline or not connected).`,
    deliveredVia,
    phone: targetPhone,
  };
}

/**
 * Triggered when a tenant links or uploads their WhatsApp number.
 * Sends an automated welcome message from the SaaS platform.
 */
export async function sendSaasWelcomeOnWhatsAppLinked(options: {
  orgId: string;
  phone?: string;
}): Promise<SaasDispatchResult | null> {
  const { orgId, phone } = options;
  const db = await getDb();

  const orgFilter = ObjectId.isValid(orgId) ? { _id: new ObjectId(orgId) } : { clerkOrgId: orgId };
  const org = await db.collection<DbOrganization>("organizations").findOne(orgFilter);
  if (!org) return null;

  // Don't send duplicate welcome messages to the same organization
  if ((org as any).saasWelcomeSentAt) {
    return null;
  }

  const sys = await getSystemSettings();
  if (sys.saasWhatsapp?.welcomeOnWaUpload === false) {
    return null;
  }

  // Resolve target phone
  const rawPhone = phone || org.whatsappInstance?.phone || (org as any).contactPhone;
  if (!rawPhone) return null;

  const targetPhone = normalizeWhatsAppNumber(rawPhone);
  if (!targetPhone) return null;

  const template =
    sys.saasWhatsapp?.welcomeTemplate ||
    `🎉 *Welcome to Qwilo!*\n\nHello *{businessName}*, your business WhatsApp number (*{phone}*) has been linked to Qwilo.\n\nYour clients will now automatically receive instant booking confirmations, invoices, and reminders directly from your business.\n\nIf you ever need help or support, simply reply to this message!\n— The Qwilo Team`;

  const finalMessage = template
    .replace(/{businessName}/g, org.name || "Business")
    .replace(/{phone}/g, rawPhone);

  const res = await sendSaasWhatsAppMessage(targetPhone, finalMessage, {
    type: "tenant_welcome",
    orgId: org._id!.toString(),
    orgName: org.name,
  });

  await db.collection("organizations").updateOne(
    { _id: org._id as any },
    {
      $set: {
        saasWelcomeSentAt: Date.now(),
        updatedAt: Date.now(),
      },
    },
  );

  return res;
}

/**
 * Triggered by subscription expiry cron when a tenant's subscription is expiring soon.
 */
export async function sendSaasSubscriptionExpiryAlert(options: {
  orgId: string;
  daysLeft: number;
  expiryDateStr: string;
  renewUrl: string;
}): Promise<SaasDispatchResult | null> {
  const { orgId, daysLeft, expiryDateStr, renewUrl } = options;
  const db = await getDb();

  const orgFilter = ObjectId.isValid(orgId) ? { _id: new ObjectId(orgId) } : { clerkOrgId: orgId };
  const org = await db.collection<DbOrganization>("organizations").findOne(orgFilter);
  if (!org) return null;

  // Avoid spamming: only send once per 20 hours
  const lastSent = (org as any).lastExpiryWarningSentAt;
  if (lastSent && Date.now() - lastSent < 20 * 60 * 60 * 1000) {
    return null;
  }

  const sys = await getSystemSettings();
  if (sys.saasWhatsapp?.subscriptionExpiryAlert === false) {
    return null;
  }

  // Resolve target phone from organization or public site
  let rawPhone = org.whatsappInstance?.phone || (org as any).contactPhone;
  if (!rawPhone) {
    const site = await db.collection<DbPublicSite>("publicSites").findOne({ organizationId: orgId });
    rawPhone = site?.published?.contact?.whatsapp || site?.draft?.contact?.whatsapp;
  }
  if (!rawPhone) return null;

  const targetPhone = normalizeWhatsAppNumber(rawPhone);
  if (!targetPhone) return null;

  const planName =
    org.plan === "voice"
      ? "Voice Agent"
      : org.plan === "engage"
        ? "Engage"
        : "Core Receptionist";

  const template =
    sys.saasWhatsapp?.expiryAlertTemplate ||
    `⚠️ *Qwilo Subscription Expiry Notice*\n\nHello *{businessName}*,\n\nYour Qwilo *{planName}* subscription is expiring in *{daysLeft} day(s)* on *{expiryDate}*.\n\nTo keep your AI receptionist and automated booking workflows active without interruption, please renew now:\n👉 {renewUrl}\n\nThank you for choosing Qwilo!`;

  const finalMessage = template
    .replace(/{businessName}/g, org.name || "Business")
    .replace(/{planName}/g, planName)
    .replace(/{daysLeft}/g, String(daysLeft))
    .replace(/{expiryDate}/g, expiryDateStr)
    .replace(/{renewUrl}/g, renewUrl);

  const res = await sendSaasWhatsAppMessage(targetPhone, finalMessage, {
    type: "subscription_expiry_alert",
    orgId: org._id!.toString(),
    daysLeft,
  });

  await db.collection("organizations").updateOne(
    { _id: org._id as any },
    {
      $set: {
        lastExpiryWarningSentAt: Date.now(),
        updatedAt: Date.now(),
      },
    },
  );

  return res;
}

/**
 * Triggered when a tenant's subscription has expired.
 */
export async function sendSaasSubscriptionExpiredAlert(options: {
  orgId: string;
  renewUrl: string;
}): Promise<SaasDispatchResult | null> {
  const { orgId, renewUrl } = options;
  const db = await getDb();

  const orgFilter = ObjectId.isValid(orgId) ? { _id: new ObjectId(orgId) } : { clerkOrgId: orgId };
  const org = await db.collection<DbOrganization>("organizations").findOne(orgFilter);
  if (!org) return null;

  if ((org as any).lastExpiredAlertSentAt) {
    return null;
  }

  let rawPhone = org.whatsappInstance?.phone || (org as any).contactPhone;
  if (!rawPhone) {
    const site = await db.collection<DbPublicSite>("publicSites").findOne({ organizationId: orgId });
    rawPhone = site?.published?.contact?.whatsapp || site?.draft?.contact?.whatsapp;
  }
  if (!rawPhone) return null;

  const targetPhone = normalizeWhatsAppNumber(rawPhone);
  if (!targetPhone) return null;

  const message = `🚨 *Your Qwilo Subscription Has Expired*\n\nHello *${org.name}*,\n\nYour Qwilo subscription has expired. Your automated reception, voice agent, and customer WhatsApp automations are temporarily paused.\n\nPlease renew your plan now to restore immediate access:\n👉 ${renewUrl}\n\nNeed assistance? Reply directly to this WhatsApp message!`;

  const res = await sendSaasWhatsAppMessage(targetPhone, message, {
    type: "subscription_expired_notice",
    orgId: org._id!.toString(),
  });

  await db.collection("organizations").updateOne(
    { _id: org._id as any },
    {
      $set: {
        lastExpiredAlertSentAt: Date.now(),
        updatedAt: Date.now(),
      },
    },
  );

  return res;
}

/**
 * Triggered on successful subscription renewal.
 */
export async function sendSaasSubscriptionRenewedAlert(options: {
  orgId: string;
  planName: string;
  expiryDateStr: string;
}): Promise<SaasDispatchResult | null> {
  const { orgId, planName, expiryDateStr } = options;
  const db = await getDb();

  const orgFilter = ObjectId.isValid(orgId) ? { _id: new ObjectId(orgId) } : { clerkOrgId: orgId };
  const org = await db.collection<DbOrganization>("organizations").findOne(orgFilter);
  if (!org) return null;

  const sys = await getSystemSettings();
  if (sys.saasWhatsapp?.subscriptionRenewedAlert === false) {
    return null;
  }

  let rawPhone = org.whatsappInstance?.phone || (org as any).contactPhone;
  if (!rawPhone) {
    const site = await db.collection<DbPublicSite>("publicSites").findOne({ organizationId: orgId });
    rawPhone = site?.published?.contact?.whatsapp || site?.draft?.contact?.whatsapp;
  }
  if (!rawPhone) return null;

  const targetPhone = normalizeWhatsAppNumber(rawPhone);
  if (!targetPhone) return null;

  const template =
    sys.saasWhatsapp?.renewedTemplate ||
    `✅ *Qwilo Subscription Renewed!*\n\nHello *{businessName}*,\n\nYour Qwilo *{planName}* subscription has been successfully renewed until *{expiryDate}*.\n\nAll your automated bookings, AI reception, and WhatsApp notifications remain fully active.\nThank you for your business!`;

  const finalMessage = template
    .replace(/{businessName}/g, org.name || "Business")
    .replace(/{planName}/g, planName)
    .replace(/{expiryDate}/g, expiryDateStr);

  return sendSaasWhatsAppMessage(targetPhone, finalMessage, {
    type: "subscription_renewed",
    orgId: org._id!.toString(),
  });
}

/**
 * Super Admin Broadcast: Send an update message to all (or filtered) tenant businesses.
 */
export async function broadcastSaasWhatsAppUpdate(options: {
  message: string;
  targetAudience: "all" | "active" | "expiring" | "expired";
  adminEmail?: string;
}): Promise<{
  success: boolean;
  totalTargeted: number;
  sentCount: number;
  failedCount: number;
  results: { orgId: string; orgName: string; phone: string; success: boolean }[];
}> {
  const { message, targetAudience, adminEmail } = options;
  const db = await getDb();
  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  const filter: Record<string, any> = {};
  if (targetAudience === "active") {
    filter.planStatus = "active";
  } else if (targetAudience === "expiring") {
    filter.planStatus = "active";
    filter.subscriptionExpiresAt = { $gt: now, $lt: now + sevenDaysMs };
  } else if (targetAudience === "expired") {
    filter.planStatus = { $in: ["expired", "unpaid"] };
  }

  const organizations = await db
    .collection<DbOrganization>("organizations")
    .find(filter)
    .toArray();

  const results: { orgId: string; orgName: string; phone: string; success: boolean }[] = [];
  let sentCount = 0;
  let failedCount = 0;

  for (const org of organizations) {
    let rawPhone = org.whatsappInstance?.phone || (org as any).contactPhone;
    if (!rawPhone) {
      const site = await db
        .collection<DbPublicSite>("publicSites")
        .findOne({ organizationId: org._id!.toString() });
      rawPhone = site?.published?.contact?.whatsapp || site?.draft?.contact?.whatsapp;
    }

    if (!rawPhone) {
      failedCount++;
      continue;
    }

    const targetPhone = normalizeWhatsAppNumber(rawPhone);
    if (!targetPhone) {
      failedCount++;
      continue;
    }

    const personalized = message.replace(/{businessName}/g, org.name);

    try {
      const dispatch = await sendSaasWhatsAppMessage(targetPhone, personalized, {
        type: "admin_broadcast",
        targetAudience,
        broadcastBy: adminEmail,
        orgId: org._id!.toString(),
      });

      results.push({
        orgId: org._id!.toString(),
        orgName: org.name,
        phone: targetPhone,
        success: dispatch.success,
      });
      sentCount++;
    } catch (err) {
      results.push({
        orgId: org._id!.toString(),
        orgName: org.name,
        phone: targetPhone,
        success: false,
      });
      failedCount++;
    }
  }

  // Save broadcast history
  await db.collection("saas_whatsapp_broadcasts").insertOne({
    message,
    targetAudience,
    adminEmail,
    totalTargeted: organizations.length,
    sentCount,
    failedCount,
    createdAt: Date.now(),
  });

  return {
    success: true,
    totalTargeted: organizations.length,
    sentCount,
    failedCount,
    results,
  };
}
