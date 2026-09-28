/**
 * WhatsApp AI Shopping Assistant Service
 * Provides automated, conversational shopping responses for ecommerce stores.
 * Handles product inquiries, pricing, stock checks, order tracking, and checkout guidance.
 * Respects Super Admin kill-switches via isFeatureActive(org, "aiShoppingAssistant").
 */

import { getDb } from "@/lib/db/mongodb";
import type { DbOrganization, DbProduct, DbOrder } from "@/lib/db/types";
import { isFeatureActive } from "@/lib/services/commerce-quota";
import { getOrganizationByIdOrSlug } from "@/lib/services/organizations";

interface ShoppingAssistantInput {
  orgSlugOrId: string;
  senderPhone: string;
  senderName?: string;
  messageText: string;
}

interface ShoppingAssistantOutput {
  handled: boolean;
  replyMessage: string;
  intent: "order_lookup" | "product_search" | "payment_faq" | "shipping_faq" | "general";
}

function formatMoney(minor: number, currency = "NGN"): string {
  const major = minor / 100;
  if (currency === "NGN") {
    return `₦${major.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }
  return `${currency} ${major.toLocaleString()}`;
}

export async function processCustomerMessage({
  orgSlugOrId,
  senderPhone,
  senderName,
  messageText,
}: ShoppingAssistantInput): Promise<ShoppingAssistantOutput> {
  const org = await getOrganizationByIdOrSlug(orgSlugOrId);
  if (!org) {
    return {
      handled: false,
      replyMessage: "Store configuration not found.",
      intent: "general",
    };
  }

  const orgId = String(org._id || org.clerkOrgId);
  const storeName = org.name;
  const baseUrl = process.env.NEXTAUTH_URL || "https://qwilo.com";
  const storeUrl = `${baseUrl}/${org.slug}/shop`;
  const cleanText = messageText.trim();
  const lowerText = cleanText.toLowerCase();

  // ─── 1. Check Feature Kill-Switch ──────────────────────────────────────────
  if (!isFeatureActive(org as any, "aiShoppingAssistant")) {
    return {
      handled: true,
      replyMessage: `Hello ${senderName || "there"}! Thank you for contacting *${storeName}*.\n\nOur team is currently reviewing incoming messages and will get back to you shortly.\n\n🛍️ In the meantime, browse our online catalog here:\n👉 ${storeUrl}`,
      intent: "general",
    };
  }

  const db = await getDb();

  // ─── 2. Order Lookup Intent ────────────────────────────────────────────────
  const orderNumberMatch = cleanText.match(/\b(ORD-\d{4,8}|\bORD\d{4,8}\b)/i);
  if (orderNumberMatch || lowerText.includes("my order") || lowerText.includes("track order")) {
    let order: DbOrder | null = null;

    if (orderNumberMatch) {
      const orderNum = orderNumberMatch[1].toUpperCase();
      order = await db.collection<DbOrder>("orders").findOne({
        organizationId: orgId,
        orderNumber: { $regex: new RegExp(`^${orderNum}$`, "i") },
      });
    }

    if (!order && senderPhone) {
      // Find latest order for this customer phone
      const cleanPhone = senderPhone.replace(/\D/g, "");
      order = await db
        .collection<DbOrder>("orders")
        .findOne(
          {
            organizationId: orgId,
            "deliveryAddress.phone": { $regex: cleanPhone.slice(-10) },
          },
          { sort: { createdAt: -1 } },
        );
    }

    if (order) {
      const statusLabels: Record<string, string> = {
        pending: "⏳ Awaiting Payment Confirmation",
        confirmed: "✅ Payment Confirmed",
        processing: "📦 Being Packed & Prepared",
        shipped: "🚚 Dispatched & On the Way",
        delivered: "🎉 Successfully Delivered",
        cancelled: "❌ Cancelled",
      };

      const trackingUrl = `${baseUrl}/${org.slug}/orders/${order.orderNumber}`;
      return {
        handled: true,
        replyMessage: `📦 *Order Update: ${order.orderNumber}*\n\nStatus: *${statusLabels[order.status] || order.status}*\nTotal: *${formatMoney(order.totalMinor, order.currency)}*\nPayment: *${order.paymentStatus.toUpperCase()}*\n\n${order.courierName ? `Courier: ${order.courierName}\n` : ""}${order.trackingNumber ? `Tracking No: ${order.trackingNumber}\n` : ""}🔗 View full order details & receipt:\n👉 ${trackingUrl}`,
        intent: "order_lookup",
      };
    } else if (orderNumberMatch) {
      return {
        handled: true,
        replyMessage: `We couldn't find an order matching *${orderNumberMatch[1]}* for *${storeName}*.\n\nPlease double check your order number or visit your tracking portal:\n👉 ${baseUrl}/${org.slug}/track`,
        intent: "order_lookup",
      };
    }
  }

  // ─── 3. Payment & Bank Account FAQs ────────────────────────────────────────
  if (
    lowerText.includes("how to pay") ||
    lowerText.includes("account number") ||
    lowerText.includes("bank details") ||
    lowerText.includes("account details") ||
    lowerText.includes("transfer")
  ) {
    const deposit = (org as any).depositSettings;
    if (deposit?.accountNumber && deposit?.bankName) {
      return {
        handled: true,
        replyMessage: `🏦 *${storeName} — Bank Transfer Details*\n\n• Bank: *${deposit.bankName}*\n• Account Number: *${deposit.accountNumber}*\n• Account Name: *${deposit.accountName || storeName}*\n\n📌 After transfer, please send your receipt or payment screenshot right here in this chat to confirm!`,
        intent: "payment_faq",
      };
    }

    return {
      handled: true,
      replyMessage: `💳 *Payment Options at ${storeName}*\n\nYou can pay securely via:\n1. 🏦 Direct Bank Transfer\n2. 🟢 WhatsApp Guided Checkout\n3. 💳 Card via Paystack\n\nChoose your preferred method at checkout:\n👉 ${storeUrl}`,
      intent: "payment_faq",
    };
  }

  // ─── 4. Shipping & Delivery FAQs ───────────────────────────────────────────
  if (
    lowerText.includes("delivery") ||
    lowerText.includes("shipping") ||
    lowerText.includes("deliver to") ||
    lowerText.includes("location")
  ) {
    const zones = await db
      .collection("shippingZones")
      .find({ organizationId: orgId, active: true })
      .toArray();

    if (zones.length > 0) {
      const zoneList = zones
        .map((z: any) => `• *${z.name}*: ${formatMoney(z.rateMinor, org.currency)} (${z.estimatedDeliveryDays})`)
        .join("\n");

      return {
        handled: true,
        replyMessage: `🚚 *Delivery Rates & Zones for ${storeName}*\n\n${zoneList}\n\nAll items are packaged safely with tracking provided!`,
        intent: "shipping_faq",
      };
    }

    return {
      handled: true,
      replyMessage: `🚚 We offer nationwide delivery across Nigeria! Delivery rates are calculated automatically at checkout based on your address:\n👉 ${storeUrl}`,
      intent: "shipping_faq",
    };
  }

  // ─── 5. Product Search & Catalog Recommendations ───────────────────────────
  // Remove common stop words to extract search keywords
  const stopWords = new Set([
    "do", "you", "have", "any", "is", "there", "i", "want", "to", "buy", "looking",
    "for", "can", "get", "the", "a", "an", "please", "price", "of", "cost", "much",
    "hello", "hi", "hey", "good", "morning", "afternoon", "evening",
  ]);

  const searchTokens = lowerText
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !stopWords.has(t));

  let matchedProducts: DbProduct[] = [];

  if (searchTokens.length > 0) {
    const regexQuery = searchTokens.map((t) => ({
      $or: [
        { name: { $regex: t, $options: "i" } },
        { category: { $regex: t, $options: "i" } },
        { tags: { $regex: t, $options: "i" } },
        { "variants.label": { $regex: t, $options: "i" } },
      ],
    }));

    matchedProducts = await db
      .collection<DbProduct>("products")
      .find({
        organizationId: orgId,
        active: true,
        $and: regexQuery,
      })
      .limit(3)
      .toArray();
  }

  // If no specific match, get top featured products
  if (matchedProducts.length === 0) {
    matchedProducts = await db
      .collection<DbProduct>("products")
      .find({ organizationId: orgId, active: true })
      .sort({ featured: -1, createdAt: -1 })
      .limit(3)
      .toArray();
  }

  if (matchedProducts.length > 0) {
    const productItems = matchedProducts
      .map((p) => {
        const lowestPrice = p.variants?.[0]?.priceMinor ?? 0;
        const inStock = p.variants?.some((v) => v.stock > 0);
        return `• *${p.name}* — ${formatMoney(lowestPrice, p.currency)} ${inStock ? "✅ In Stock" : "⚠️ Low/Out of Stock"}\n  👉 ${baseUrl}/${org.slug}/products/${p.slug}`;
      })
      .join("\n\n");

    return {
      handled: true,
      replyMessage: `👋 Hello ${senderName || "there"}! Welcome to *${storeName}*.\n\nHere are some of our top items:\n\n${productItems}\n\n🛍️ Tap any link to select your size and checkout instantly!`,
      intent: "product_search",
    };
  }

  // ─── 6. Fallback Response ──────────────────────────────────────────────────
  return {
    handled: true,
    replyMessage: `Hello ${senderName || "there"}! Welcome to *${storeName}*.\n\nHow can we help you today? You can:\n• Browse products: ${storeUrl}\n• Check an order: Reply with your Order Number (e.g. ORD-00042)\n• Ask about delivery or payment details\n\nWe're happy to assist you! 😊`,
    intent: "general",
  };
}
