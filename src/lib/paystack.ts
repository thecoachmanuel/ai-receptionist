import crypto from "node:crypto";
import { getDb } from "@/lib/db/mongodb";
import type { BillingCycle, DbOrganization, PlanType } from "@/lib/db/types";
import { ObjectId } from "mongodb";
import { getPlatformSettings } from "@/lib/services/settings";

/** Compile-time defaults in NGN — live values come from getPlatformSettings() at runtime. */
export const PAYSTACK_PLANS: Record<
  PlanType,
  { name: string; ngnPrice: number }
> = {
  free_org: { name: "Core Plan", ngnPrice: 1000 },
  engage:   { name: "Engage Plan", ngnPrice: 5000 },
  voice:    { name: "Voice Plan", ngnPrice: 15000 },
};

/** Yearly discount: 10 months for the price of 12 (2 months free). */
export function getYearlyPrice(monthlyPrice: number): number {
  return monthlyPrice * 10;
}

export function getPriceForCycle(
  monthlyPrice: number,
  cycle: BillingCycle,
): number {
  return cycle === "yearly" ? getYearlyPrice(monthlyPrice) : monthlyPrice;
}

/** Duration in milliseconds for each billing cycle. */
export const CYCLE_DURATION_MS: Record<BillingCycle, number> = {
  monthly: 30 * 24 * 60 * 60 * 1000,
  yearly:  365 * 24 * 60 * 60 * 1000,
};

export function getPaystackSecretKey(): string | null {
  return process.env.PAYSTACK_SECRET_KEY?.trim() || null;
}

export function verifyPaystackSignature(
  rawBody: string,
  signature: string | null,
): boolean {
  const secret = getPaystackSecretKey();
  if (!secret || !signature) return false;
  const hash = crypto
    .createHmac("sha512", secret)
    .update(rawBody)
    .digest("hex");
  return hash === signature;
}

export async function initializePaystackTransaction({
  email,
  planId,
  orgId,
  callbackUrl,
  billingCycle = "monthly",
}: {
  email: string;
  planId: PlanType;
  orgId: string;
  callbackUrl: string;
  billingCycle?: BillingCycle;
}) {
  const secretKey = getPaystackSecretKey();
  if (!secretKey) {
    throw new Error(
      "Paystack secret key is not configured. Please set PAYSTACK_SECRET_KEY in .env.local",
    );
  }

  const settings = await getPlatformSettings();
  const planInfo = PAYSTACK_PLANS[planId];
  if (!planInfo) throw new Error("Invalid plan selected for Paystack checkout.");

  const priceKey = planId === "free_org" ? "core" : planId;
  const monthlyAmount = settings.planPrices[priceKey] ?? planInfo.ngnPrice;
  const ngnAmount = getPriceForCycle(monthlyAmount, billingCycle);
  const amountInKobo = Math.round(ngnAmount * 100);

  // Try to create/fetch a recurring Paystack plan code for monthly subscriptions
  let planCode: string | null = null;
  if (billingCycle === "monthly") {
    try {
      planCode = await getOrCreatePaystackPlan(planId, monthlyAmount, "monthly");
    } catch (planErr) {
      console.warn("Could not create/fetch Paystack recurring plan, falling back to standard checkout:", planErr);
    }
  }

  const cycleLabel = billingCycle === "yearly"
    ? `₦${ngnAmount.toLocaleString()} NGN/yr (2 months free)`
    : `₦${ngnAmount.toLocaleString()} NGN/mo`;

  const payload: Record<string, unknown> = {
    email,
    amount: amountInKobo,
    currency: "NGN",
    callback_url: callbackUrl,
    metadata: {
      orgId,
      planId,
      ngnAmount,
      billingCycle,
      monthlyAmount,
      planCode: planCode || undefined,
      custom_fields: [
        {
          display_name: "Plan Name",
          variable_name: "plan_name",
          value: `${planInfo.name} (${cycleLabel})`,
        },
        {
          display_name: "Organization ID",
          variable_name: "org_id",
          value: orgId,
        },
        {
          display_name: "Billing Cycle",
          variable_name: "billing_cycle",
          value: billingCycle,
        },
      ],
    },
  };

  if (planCode) {
    payload.plan = planCode;
  }

  const response = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok || !data.status) {
    throw new Error(data.message || "Failed to initialize transaction with Paystack.");
  }

  return {
    authorizationUrl: data.data.authorization_url as string,
    accessCode: data.data.access_code as string,
    reference: data.data.reference as string,
    planCode: planCode || undefined,
    billingCycle,
    ngnAmount,
  };
}

/** Cache for Paystack plan codes to avoid redundant API calls */
const planCodeCache = new Map<string, string>();

export async function getOrCreatePaystackPlan(
  planId: PlanType,
  ngnAmount: number,
  interval: "monthly" | "annually" = "monthly",
): Promise<string | null> {
  const secretKey = getPaystackSecretKey();
  if (!secretKey) return null;

  const planInfo = PAYSTACK_PLANS[planId];
  if (!planInfo) return null;

  const cacheKey = `${planId}_${ngnAmount}_${interval}`;
  if (planCodeCache.has(cacheKey)) return planCodeCache.get(cacheKey)!;

  const amountInKobo = Math.round(ngnAmount * 100);
  const planName = `${planInfo.name} (₦${ngnAmount.toLocaleString()}/${interval === "monthly" ? "mo" : "yr"})`;

  try {
    const listRes = await fetch("https://api.paystack.co/plan", {
      headers: { Authorization: `Bearer ${secretKey}` },
    });
    if (listRes.ok) {
      const listData = await listRes.json();
      const existing = (listData.data || []).find(
        (p: any) =>
          p.amount === amountInKobo &&
          p.interval === interval &&
          p.currency === "NGN",
      );
      if (existing?.plan_code) {
        planCodeCache.set(cacheKey, existing.plan_code);
        return existing.plan_code;
      }
    }

    const createRes = await fetch("https://api.paystack.co/plan", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: planName,
        interval,
        amount: amountInKobo,
        currency: "NGN",
      }),
    });

    if (createRes.ok) {
      const createData = await createRes.json();
      const code = createData.data?.plan_code;
      if (code) {
        planCodeCache.set(cacheKey, code);
        return code;
      }
    }
  } catch (err) {
    console.warn("Paystack recurring plan lookup/creation notice:", err);
  }

  return null;
}

export async function verifyPaystackTransaction(reference: string) {
  const secretKey = getPaystackSecretKey();
  if (!secretKey) throw new Error("Paystack secret key is not configured.");

  const response = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    { method: "GET", headers: { Authorization: `Bearer ${secretKey}` } },
  );

  const data = await response.json();

  if (!response.ok || !data.status) {
    throw new Error(data.message || "Unable to verify transaction with Paystack.");
  }

  return data.data as {
    status: string;
    reference: string;
    amount: number;
    currency: string;
    customer: { email: string; customer_code?: string };
    metadata?: {
      orgId?: string;
      planId?: PlanType;
      planCode?: string;
      billingCycle?: BillingCycle;
      monthlyAmount?: number;
    };
    paid_at?: string;
    plan?: string;
    subscription_code?: string;
    authorization?: {
      authorization_code?: string;
      card_type?: string;
      last4?: string;
      exp_month?: string;
      exp_year?: string;
      brand?: string;
      reusable?: boolean;
    };
  };
}

export async function updateOrgPlanFromPaystack(
  orgId: string,
  planId: PlanType,
  paystackDetails: Record<string, unknown>,
  billingCycle: BillingCycle = "monthly",
) {
  const db = await getDb();
  const filter = ObjectId.isValid(orgId)
    ? { _id: new ObjectId(orgId) }
    : { clerkOrgId: orgId };

  const now = Date.now();
  const durationMs = CYCLE_DURATION_MS[billingCycle];
  const subscriptionExpiresAt = now + durationMs;
  const nextBillingDate = subscriptionExpiresAt;

  await db.collection<DbOrganization>("organizations").updateOne(filter, {
    $set: {
      plan: planId,
      planStatus: "active",
      billingCycle,
      subscriptionExpiresAt,
      paystack: {
        ...paystackDetails,
        channel: "paystack",
        lastPaymentDate: now,
        nextBillingDate,
        billingCycle,
      },
      updatedAt: now,
    },
  });
}

/**
 * Attempt to automatically charge an organization using their saved Paystack
 * authorization code (card on file). Called by the subscription renewal cron.
 */
export async function chargeAuthorizationForOrg(
  orgId: string,
  email: string,
  authorizationCode: string,
  amountKobo: number,
  metadata: Record<string, unknown>,
): Promise<{ success: boolean; reference?: string; message: string }> {
  const secretKey = getPaystackSecretKey();
  if (!secretKey) return { success: false, message: "Paystack not configured" };

  try {
    const res = await fetch("https://api.paystack.co/transaction/charge_authorization", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: amountKobo,
        authorization_code: authorizationCode,
        currency: "NGN",
        metadata: { ...metadata, orgId, auto_charge: true },
      }),
    });

    const data = await res.json();

    if (res.ok && data.status && data.data?.status === "success") {
      return { success: true, reference: data.data.reference, message: "Auto-charged successfully" };
    }

    return {
      success: false,
      message: data.data?.gateway_response || data.message || "Auto-charge failed",
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Auto-charge error",
    };
  }
}

export interface ManualSubscriptionUpdateOptions {
  orgId: string;
  plan: PlanType;
  planStatus: "active" | "trialing" | "canceled" | "past_due" | "expired" | "unpaid";
  billingCycle?: BillingCycle;
  durationMonths?: number;
  customExpiresAt?: number;
  channel: "bank_transfer" | "cash" | "paystack" | "complimentary";
  amount?: number;
  manualNotes?: string;
  adminEmail?: string;
}

export async function updateOrgSubscriptionManually(
  options: ManualSubscriptionUpdateOptions,
) {
  const db = await getDb();
  const {
    orgId, plan, planStatus, billingCycle = "monthly",
    durationMonths, customExpiresAt, channel, amount, manualNotes, adminEmail,
  } = options;

  const filter = ObjectId.isValid(orgId)
    ? { _id: new ObjectId(orgId) }
    : { clerkOrgId: orgId };

  const now = Date.now();
  let subscriptionExpiresAt: number;

  if (customExpiresAt && customExpiresAt > now) {
    subscriptionExpiresAt = customExpiresAt;
  } else if (durationMonths && durationMonths > 0) {
    const currentOrg = await db
      .collection<DbOrganization>("organizations")
      .findOne(filter);
    const baseTime =
      currentOrg?.subscriptionExpiresAt && currentOrg.subscriptionExpiresAt > now
        ? currentOrg.subscriptionExpiresAt
        : now;
    subscriptionExpiresAt = baseTime + durationMonths * 30 * 24 * 60 * 60 * 1000;
  } else {
    subscriptionExpiresAt = now + CYCLE_DURATION_MS[billingCycle];
  }

  await db.collection<DbOrganization>("organizations").updateOne(filter, {
    $set: {
      plan,
      planStatus,
      billingCycle,
      subscriptionExpiresAt,
      paystack: {
        channel,
        amount,
        manualNotes,
        updatedBy: adminEmail,
        lastPaymentDate: now,
        billingCycle,
      },
      updatedAt: now,
    },
  });

  return { success: true, subscriptionExpiresAt, planStatus };
}
