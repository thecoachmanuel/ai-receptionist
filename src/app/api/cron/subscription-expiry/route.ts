import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/mongodb";
import type { DbOrganization } from "@/lib/db/types";
import {
  chargeAuthorizationForOrg,
  getPriceForCycle,
  PAYSTACK_PLANS,
  updateOrgPlanFromPaystack,
} from "@/lib/paystack";
import { getPlatformSettings } from "@/lib/services/settings";
import { getSystemSettings } from "@/lib/services/system-settings";
import {
  sendSaasSubscriptionExpiryAlert,
  sendSaasSubscriptionExpiredAlert,
  sendSaasSubscriptionRenewedAlert,
} from "@/lib/services/saas-whatsapp";

/**
 * Subscription management cron — run every hour (or every 6 hours on Vercel).
 *
 * Three passes:
 * 1. Auto-charge  — orgs that expire within the next 3 days AND have a reusable
 *                   Paystack authorization are charged proactively.
 * 2. Mark expired — orgs whose subscriptionExpiresAt has passed are set to "expired".
 * 3. Expiry alerts — orgs expiring soon receive automated WhatsApp alerts from SaaS account.
 *
 * Protect this endpoint with the CRON_SECRET env var.
 */
export async function GET(request: Request) {
  // Security: require CRON_SECRET header (set the same value in Vercel cron config)
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const db = await getDb();
  const now = Date.now();
  const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
  const renewBaseUrl = process.env.NEXTAUTH_URL || "https://qwilo.com";

  const results = {
    autoCharged: [] as { orgId: string; success: boolean; message: string }[],
    expired: [] as string[],
    expiryWarningsSent: 0,
    errors: [] as string[],
  };

  try {
    const settings = await getPlatformSettings();
    const sysSettings = await getSystemSettings().catch(() => null);

    // ── PASS 1: Auto-charge orgs expiring within 3 days that have a saved card ──
    const soonExpiring = await db
      .collection<DbOrganization>("organizations")
      .find({
        planStatus: "active",
        subscriptionExpiresAt: { $gt: now, $lt: now + threeDaysMs },
        "paystack.authorizationCode": { $exists: true, $ne: "" },
        "paystack.reusable": true,
      })
      .toArray();

    for (const org of soonExpiring) {
      try {
        const orgId = org._id!.toString();
        const planId = org.plan ?? "free_org";
        const billingCycle = org.billingCycle ?? "monthly";
        const priceKey = planId === "free_org" ? "core" : planId;
        const monthlyAmount = settings.planPrices[priceKey] ?? PAYSTACK_PLANS[planId]?.ngnPrice ?? 1000;
        const chargeAmount = getPriceForCycle(monthlyAmount, billingCycle);
        const amountKobo = Math.round(chargeAmount * 100);
        const customerEmail = (org.paystack as any)?.customerEmail ?? "";
        const authCode = org.paystack!.authorizationCode!;

        if (!customerEmail) {
          results.errors.push(`${orgId}: missing customer email for auto-charge`);
          continue;
        }

        const chargeResult = await chargeAuthorizationForOrg(
          orgId,
          customerEmail,
          authCode,
          amountKobo,
          { orgId, planId, billingCycle, auto_renew: true },
        );

        if (chargeResult.success) {
          // Extend subscription from the current expiry date
          const baseTime =
            org.subscriptionExpiresAt && org.subscriptionExpiresAt > now
              ? org.subscriptionExpiresAt
              : now;
          const durationMs =
            billingCycle === "yearly"
              ? 365 * 24 * 60 * 60 * 1000
              : 30 * 24 * 60 * 60 * 1000;

          const newExpiry = baseTime + durationMs;

          await db.collection<DbOrganization>("organizations").updateOne(
            { _id: org._id },
            {
              $set: {
                planStatus: "active",
                subscriptionExpiresAt: newExpiry,
                "paystack.lastPaymentDate": now,
                "paystack.nextBillingDate": newExpiry,
                updatedAt: now,
              },
            },
          );

          // Automated SaaS WhatsApp confirmation: Renewal successful
          const planTitle = planId === "voice" ? "Voice Agent" : planId === "engage" ? "Engage" : "Core Receptionist";
          const expiryDateStr = new Date(newExpiry).toLocaleDateString("en-US", { dateStyle: "medium" });
          void sendSaasSubscriptionRenewedAlert({
            orgId,
            planName: planTitle,
            expiryDateStr,
          }).catch((err) => console.error("SaaS renewed alert error:", err));
        }

        results.autoCharged.push({
          orgId,
          success: chargeResult.success,
          message: chargeResult.message,
        });
      } catch (err) {
        results.errors.push(
          `Auto-charge error for ${org._id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    // ── PASS 2: Mark orgs as expired ──
    const expiredOrgs = await db
      .collection<DbOrganization>("organizations")
      .find({
        planStatus: { $in: ["active", "trialing", "past_due"] },
        subscriptionExpiresAt: { $lt: now },
      })
      .toArray();

    for (const org of expiredOrgs) {
      try {
        await db.collection<DbOrganization>("organizations").updateOne(
          { _id: org._id },
          {
            $set: {
              planStatus: "expired",
              updatedAt: now,
            },
          },
        );
        results.expired.push(org._id!.toString());

        // Automated SaaS WhatsApp alert: Subscription Expired
        const renewUrl = `${renewBaseUrl}/app/billing`;
        void sendSaasSubscriptionExpiredAlert({
          orgId: org._id!.toString(),
          renewUrl,
        }).catch((err) => console.error("SaaS expired alert error:", err));
      } catch (err) {
        results.errors.push(
          `Expiry error for ${org._id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    // ── PASS 3: Send SaaS WhatsApp Expiry Warnings ──
    const warningDays = sysSettings?.saasWhatsapp?.expiryWarningDays || 3;
    const warningWindowMs = warningDays * 24 * 60 * 60 * 1000;

    const expiringSoonOrgs = await db
      .collection<DbOrganization>("organizations")
      .find({
        planStatus: "active",
        subscriptionExpiresAt: { $gt: now, $lt: now + warningWindowMs },
      })
      .toArray();

    for (const org of expiringSoonOrgs) {
      const daysLeft = Math.max(1, Math.ceil((org.subscriptionExpiresAt! - now) / (24 * 60 * 60 * 1000)));
      const expiryDateStr = new Date(org.subscriptionExpiresAt!).toLocaleDateString("en-US", { dateStyle: "medium" });
      const renewUrl = `${renewBaseUrl}/app/billing`;

      void sendSaasSubscriptionExpiryAlert({
        orgId: org._id!.toString(),
        daysLeft,
        expiryDateStr,
        renewUrl,
      }).catch((err) => console.error("SaaS expiry alert error:", err));

      results.expiryWarningsSent++;
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date(now).toISOString(),
      autoCharged: results.autoCharged.length,
      expired: results.expired.length,
      expiryWarningsSent: results.expiryWarningsSent,
      errors: results.errors.length,
      details: results,
    });
  } catch (error) {
    console.error("Subscription expiry cron error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 },
    );
  }
}

export const POST = GET;
