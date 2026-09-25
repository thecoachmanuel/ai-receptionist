import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db/mongodb";
import type { DbBooking, DbOrganization, DbPublicSite } from "@/lib/db/types";
import { generateFreeAIMessage, type MessageType } from "./free-ai";
import { getSystemSettings } from "./system-settings";

/**
 * Standardize phone number for WhatsApp dispatch (E.164 without plus sign).
 * Handles Nigerian local numbers (e.g. 080... -> 23480...), US numbers, and international formats.
 */
export function normalizeWhatsAppNumber(rawPhone: string): string {
  let cleaned = rawPhone.replace(/[^0-9]/g, "");
  if (!cleaned) return "";

  // If local Nigerian number starting with 0, convert to 234
  if (cleaned.startsWith("0") && (cleaned.length === 11 || cleaned.length === 10)) {
    cleaned = "234" + cleaned.slice(1);
  }

  // If 10 digits without country code, assume local or 234/1 based on context
  if (cleaned.length === 10 && !cleaned.startsWith("1")) {
    cleaned = "234" + cleaned;
  }

  return cleaned;
}

export interface SendWhatsAppOptions {
  orgId: string;
  bookingId: string;
  type: MessageType;
  customText?: string;
}

export interface SendWhatsAppResult {
  success: boolean;
  message: string;
  phone?: string;
  previewText?: string;
  deliveredVia?: "gateway" | "recorded";
}

/**
 * Automatically dispatches an automated WhatsApp notification to the client
 * using Free AI without paid Meta APIs.
 */
export async function sendAutomatedWhatsAppNotification(
  options: SendWhatsAppOptions,
): Promise<SendWhatsAppResult> {
  const { orgId, bookingId, type, customText } = options;
  const db = await getDb();

  // 1. Fetch Booking
  const bookingFilter = ObjectId.isValid(bookingId)
    ? { _id: new ObjectId(bookingId), organizationId: orgId }
    : { _id: bookingId as any, organizationId: orgId };
  const booking = await db.collection<DbBooking>("bookings").findOne(bookingFilter);
  if (!booking) {
    return { success: false, message: "Booking not found." };
  }

  const rawPhone = booking.customerSnapshot?.phone;
  if (!rawPhone) {
    return { success: false, message: "Customer has no phone number on file." };
  }

  const targetPhone = normalizeWhatsAppNumber(rawPhone);
  if (!targetPhone) {
    return { success: false, message: "Invalid customer phone number format." };
  }

  // 2. Fetch Organization
  const orgFilter = ObjectId.isValid(orgId) ? { _id: new ObjectId(orgId) } : { clerkOrgId: orgId };
  const organization = await db.collection<DbOrganization>("organizations").findOne(orgFilter);
  if (!organization) {
    return { success: false, message: "Organization not found." };
  }

  // 3. Fetch Site Draft/Published for Deposit Settings
  const publicSite = await db.collection<DbPublicSite>("publicSites").findOne({ organizationId: orgId });
  const siteConfig = publicSite?.published || publicSite?.draft;
  const depositSettings = siteConfig?.booking?.deposit;
  const whatsappAutomation = (organization as any)?.whatsappSettings || (siteConfig as any)?.whatsappAutomation;

  // Check if this type of notification is enabled
  if (whatsappAutomation) {
    if (whatsappAutomation.enabled === false) {
      return { success: false, message: "WhatsApp automation is disabled for this organization." };
    }
    if (type === "confirmation" && whatsappAutomation.autoConfirm === false) {
      return { success: false, message: "Auto-confirmation is turned off." };
    }
    if (type === "invoice" && whatsappAutomation.autoInvoice === false) {
      return { success: false, message: "Auto-invoice is turned off." };
    }
    if (type === "reminder" && whatsappAutomation.autoReminder === false) {
      return { success: false, message: "Auto-reminder is turned off." };
    }
  }

  // 4. Generate Message via Free AI
  let messageContent = customText;
  if (!messageContent) {
    messageContent = await generateFreeAIMessage(
      {
        customerName: booking.customerSnapshot.name,
        customerPhone: targetPhone,
        confirmationCode: booking.confirmationCode,
        offeringName: booking.offeringSnapshot.name,
        offeringPriceMinor: booking.offeringSnapshot.priceMinor,
        currency: booking.offeringSnapshot.currency || organization.currency || "NGN",
        locale: organization.locale || "en-US",
        startAt: booking.startAt,
        timezone: organization.timezone || "Africa/Lagos",
        teamMemberName: booking.teamMemberSnapshot?.name,
        locationName: booking.locationSnapshot?.name,
        locationAddress: booking.locationSnapshot?.address,
        depositSettings,
      },
      {
        businessName: siteConfig?.businessName || organization.name,
        aiTone: whatsappAutomation?.aiTone || "warm",
      },
      type,
      (organization as any)?.geminiApiKey || process.env.GEMINI_API_KEY,
    );
  }

  // 5. Send via Free WhatsApp Gateway (prioritizing tenant's connected scanned session)
  const sysSettings = await getSystemSettings().catch(() => null);
  const gatewayUrl =
    organization.whatsappInstance?.status === "connected" && sysSettings?.whatsappGateway?.serverUrl
      ? sysSettings.whatsappGateway.serverUrl
      : whatsappAutomation?.gatewayUrl ||
        sysSettings?.whatsappGateway?.serverUrl ||
        process.env.WHATSAPP_GATEWAY_URL ||
        process.env.WAHA_SERVER_URL ||
        process.env.EVOLUTION_API_URL;

  const gatewayApiKey =
    sysSettings?.whatsappGateway?.apiKey ||
    whatsappAutomation?.gatewayApiKey ||
    process.env.WHATSAPP_GATEWAY_API_KEY ||
    process.env.WAHA_API_KEY ||
    process.env.EVOLUTION_API_KEY;

  let deliveredVia: "gateway" | "recorded" = "recorded";
  let gatewaySuccess = false;

  if (gatewayUrl) {
    try {
      const cleanGateway = gatewayUrl.replace(/\/$/, "");
      const sessionName = organization.whatsappInstance?.instanceName || organization.slug;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(gatewayApiKey
          ? {
              "x-api-secret": gatewayApiKey,
              "X-Api-Key": gatewayApiKey,
              apikey: gatewayApiKey,
              Authorization: `Bearer ${gatewayApiKey}`,
            }
          : {}),
      };

      // 1. Try Nectar multi-tenant format: POST /sessions/:orgSlug/send
      let res = await fetch(`${cleanGateway}/sessions/${encodeURIComponent(sessionName)}/send`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          phone: targetPhone,
          message: messageContent,
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
            text: messageContent,
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
            text: messageContent,
          }),
        });
      }

      // 4. If 404, try legacy single-session format: POST /send
      if (!res.ok && res.status === 404) {
        res = await fetch(`${cleanGateway}/send`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            phone: targetPhone,
            message: messageContent,
          }),
        });
      }

      if (res.ok) {
        gatewaySuccess = true;
        deliveredVia = "gateway";
      } else {
        console.warn("WhatsApp Gateway responded with status:", res.status);
      }
    } catch (gatewayErr) {
      console.warn("Could not reach free WhatsApp Gateway, logging notification locally:", gatewayErr);
    }
  }

  // 6. Update Booking with WhatsApp delivery status
  const now = Date.now();
  const updateField =
    type === "confirmation"
      ? "whatsappStatus.confirmationSentAt"
      : type === "invoice"
        ? "whatsappStatus.invoiceSentAt"
        : "whatsappStatus.reminderSentAt";

  await db.collection("bookings").updateOne(
    { _id: new ObjectId(booking._id) },
    {
      $set: {
        [updateField]: now,
        "whatsappStatus.lastMessage": messageContent,
        "whatsappStatus.targetPhone": targetPhone,
        updatedAt: now,
      },
    },
  );

  return {
    success: true,
    message: gatewaySuccess
      ? `Automated WhatsApp ${type} sent successfully to ${targetPhone} via Free Gateway.`
      : `WhatsApp ${type} prepared & recorded for ${targetPhone}. Available for instant 1-click dispatch.`,
    phone: targetPhone,
    previewText: messageContent,
    deliveredVia,
  };
}
