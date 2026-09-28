/**
 * WhatsApp Order Notification Service
 * Sends automated order status messages via Evolution API.
 * Gracefully skips if whatsappAlerts is deactivated for the org.
 */

import { getDb } from "@/lib/db/mongodb";
import type { DbOrganization, DbOrder } from "@/lib/db/types";
import { isFeatureActive } from "@/lib/services/commerce-quota";

interface EvolutionSendResponse {
  key?: { id: string };
  error?: string;
}

async function sendWhatsAppMessage(
  phone: string,
  message: string,
  instanceName: string,
  evolutionBaseUrl: string,
  evolutionApiKey: string,
): Promise<boolean> {
  try {
    const normalizedPhone = phone.replace(/\D/g, "");
    const res = await fetch(
      `${evolutionBaseUrl}/message/sendText/${instanceName}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: evolutionApiKey,
        },
        body: JSON.stringify({
          number: normalizedPhone,
          text: message,
        }),
      },
    );

    const data: EvolutionSendResponse = await res.json();
    return !!data.key?.id;
  } catch (err) {
    console.error("[WhatsApp] Failed to send message", err);
    return false;
  }
}

function buildOrderMessage(org: DbOrganization, order: DbOrder): string {
  const storeName = org.name;
  const { orderNumber, deliveryAddress, totalMinor, currency, status } = order;
  const amount = (totalMinor / 100).toLocaleString("en-NG");

  const MESSAGES: Partial<Record<DbOrder["status"], string>> = {
    pending: `🛍️ Hi ${deliveryAddress.fullName}! Your order *${orderNumber}* from *${storeName}* has been received.\n\n💰 Total: ₦${amount}\n\nPlease complete payment to confirm your order. Reply here if you need help!`,
    confirmed: `✅ Great news, ${deliveryAddress.fullName}! Your payment for order *${orderNumber}* at *${storeName}* is confirmed.\n\nWe're now preparing your items! 🎁`,
    processing: `📦 Your order *${orderNumber}* from *${storeName}* is being packed and prepared for dispatch!`,
    shipped: `🚚 Your order *${orderNumber}* from *${storeName}* is on its way!\n\n${order.courierName ? `Courier: ${order.courierName}` : ""}${order.trackingNumber ? `\nTracking: ${order.trackingNumber}` : ""}\n\nExpected delivery within 1-3 business days.`,
    delivered: `🎉 Your order *${orderNumber}* from *${storeName}* has been delivered!\n\nWe hope you love your purchase. Thank you for shopping with us! 💚`,
    cancelled: `❌ Your order *${orderNumber}* from *${storeName}* has been cancelled.\n\nIf you have questions, reply to this message and we'll help you right away.`,
  };

  return MESSAGES[status] ?? `Your order ${orderNumber} status: ${status}`;
}

export async function sendOrderNotification(
  orgId: string,
  order: DbOrder,
): Promise<{ sent: boolean; reason?: string }> {
  try {
    const db = await getDb();
    const orgFilter = {
      $or: [
        ...(orgId.length === 24 ? [{ _id: { $eq: orgId } as any }] : []),
        { clerkOrgId: orgId },
        { slug: orgId },
      ],
    };
    const org = await db
      .collection<DbOrganization>("organizations")
      .findOne(orgFilter as any);

    if (!org) return { sent: false, reason: "Organization not found" };

    // Check feature flag — Super Admin can kill-switch WhatsApp alerts
    if (!isFeatureActive(org, "whatsappAlerts")) {
      return { sent: false, reason: "whatsappAlerts feature is deactivated for this store" };
    }

    const instance = org.whatsappInstance;
    if (!instance || instance.status !== "connected") {
      return { sent: false, reason: "WhatsApp instance not connected" };
    }

    const evolutionBaseUrl =
      process.env.EVOLUTION_API_BASE_URL ?? "http://localhost:8080";
    const evolutionApiKey = process.env.EVOLUTION_API_KEY ?? "";
    const instanceName = instance.phone ?? org.slug;

    if (!evolutionApiKey) {
      return { sent: false, reason: "Evolution API key not configured" };
    }

    const phone = order.deliveryAddress.phone;
    if (!phone) return { sent: false, reason: "No customer phone number" };

    const message = buildOrderMessage(org, order);
    const sent = await sendWhatsAppMessage(
      phone,
      message,
      instanceName,
      evolutionBaseUrl,
      evolutionApiKey,
    );

    return { sent, reason: sent ? undefined : "WhatsApp API returned no message ID" };
  } catch (err) {
    console.error("[sendOrderNotification]", err);
    return { sent: false, reason: String(err) };
  }
}
