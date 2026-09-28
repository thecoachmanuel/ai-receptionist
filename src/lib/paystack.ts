import crypto from "node:crypto";
import { getDb } from "@/lib/db/mongodb";
import type { BillingCycle, DbOrganization, PlanType } from "@/lib/db/types";
import { ObjectId } from "mongodb";
import { getPlatformSettings } from "@/lib/services/settings";
import { getSystemSettings, type PaystackPlanCodes } from "@/lib/services/system-settings";

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

  // Try to create/fetch a recurring Paystack plan code for this plan & cycle
  let planCode: string | null = null;
  try {
    planCode = await getOrCreatePaystackPlan(
      planId,
      monthlyAmount,
      billingCycle === "yearly" ? "annually" : "monthly",
    );
  } catch (planErr) {
    console.warn("Could not resolve Paystack plan code, continuing with standard checkout:", planErr);
  }

  const cycleLabel = billingCycle === "yearly"
    ? `₦${ngnAmount.toLocaleString()} NGN/yr (2 months free)`
    : `₦${ngnAmount.toLocaleString()} NGN/mo`;

  const payload: Record<string, unknown> = {
    email,
    amount: amountInKobo,
    currency: "NGN",
    callback_url: callbackUrl,
    // Explicitly allow all channels: Card, Bank Transfer, USSD, etc.
    channels: ["card", "bank", "ussd", "qr", "mobile_money", "bank_transfer"],
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

  // NOTE: We intentionally do NOT assign payload.plan = planCode here.
  // Passing payload.plan forces Paystack to restrict checkout to card-only, which completely
  // disables Bank Transfer, USSD, etc. Instead, all channels remain available at checkout.
  // When a card payment succeeds with a reusable authorization, the system subscribes the customer
  // to the Paystack Plan via Paystack's Subscription API (POST https://api.paystack.co/subscription).

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

/**
 * Subscribes a customer to a recurring Paystack plan using their saved authorization code.
 * Passes start_date of next billing cycle so the customer is NOT double-charged for period already paid.
 */
export async function subscribeCustomerToPaystackPlan({
  customer,
  planCode,
  authorization,
  startDate,
}: {
  customer: string;
  planCode: string;
  authorization: string;
  startDate?: string;
}): Promise<{ success: boolean; subscriptionCode?: string; message?: string }> {
  const secretKey = getPaystackSecretKey();
  if (!secretKey) return { success: false, message: "Paystack secret key is not configured" };

  try {
    const payload: Record<string, unknown> = {
      customer,
      plan: planCode,
      authorization,
    };
    if (startDate) {
      payload.start_date = startDate;
    }

    const res = await fetch("https://api.paystack.co/subscription", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (res.ok && data.status) {
      return {
        success: true,
        subscriptionCode: data.data?.subscription_code as string | undefined,
        message: "Customer successfully subscribed to Paystack plan",
      };
    }

    return {
      success: false,
      message: data.message || "Failed to create Paystack subscription",
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Paystack subscription error",
    };
  }
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

  // 1. Check if super admin explicitly configured a Paystack plan code in system settings
  try {
    const sys = await getSystemSettings();
    const planPrefix = planId === "free_org" ? "core" : planId;
    const intervalSuffix = interval === "annually" ? "Yearly" : "Monthly";
    const settingsKey = `${planPrefix}${intervalSuffix}` as keyof PaystackPlanCodes;
    const configuredCode = sys.paystackPlanCodes?.[settingsKey]?.trim();
    if (configuredCode) {
      return configuredCode;
    }
  } catch (_) {}

  // 2. Check environment variable override
  const envKey = `PAYSTACK_PLAN_${(planId === "free_org" ? "CORE" : planId).toUpperCase()}_${interval.toUpperCase()}`;
  if (process.env[envKey]?.trim()) {
    return process.env[envKey]!.trim();
  }

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
          p.currency === "NGN" &&
          p.is_deleted !== true,
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
    channel?: string;
    customer: { email: string; customer_code?: string; id?: number };
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

  // Resolve planCode if not provided
  let planCode = (paystackDetails.planCode as string) || undefined;
  if (!planCode) {
    try {
      const settings = await getPlatformSettings();
      const priceKey = planId === "free_org" ? "core" : planId;
      const monthlyAmount = settings.planPrices[priceKey] ?? PAYSTACK_PLANS[planId]?.ngnPrice ?? 1000;
      planCode = (await getOrCreatePaystackPlan(
        planId,
        monthlyAmount,
        billingCycle === "yearly" ? "annually" : "monthly",
      )) || undefined;
    } catch (_) {}
  }

  // If customer paid with Card and authorization is reusable, sync to Paystack Subscriptions
  let subscriptionCode = (paystackDetails.subscriptionCode as string) || undefined;
  const authCode = (paystackDetails.authorizationCode as string) || undefined;
  const isReusable = paystackDetails.reusable === true;
  const customerIdent =
    (paystackDetails.customerCode as string) ||
    (paystackDetails.customerEmail as string) ||
    undefined;

  if (!subscriptionCode && planCode && authCode && isReusable && customerIdent) {
    try {
      const subResult = await subscribeCustomerToPaystackPlan({
        customer: customerIdent,
        planCode,
        authorization: authCode,
        startDate: new Date(nextBillingDate).toISOString(),
      });
      if (subResult.success && subResult.subscriptionCode) {
        subscriptionCode = subResult.subscriptionCode;
      }
    } catch (subErr) {
      console.warn("Paystack subscription sync notice:", subErr);
    }
  }

  const paymentMethod =
    (paystackDetails.paymentMethod as string) ||
    (paystackDetails.channel as string) ||
    (authCode ? "card" : "bank_transfer");

  await db.collection<DbOrganization>("organizations").updateOne(filter, {
    $set: {
      plan: planId,
      planStatus: "active",
      billingCycle,
      subscriptionExpiresAt,
      paystack: {
        ...paystackDetails,
        planCode,
        subscriptionCode: subscriptionCode || (paystackDetails.subscriptionCode as string | undefined),
        channel: "paystack",
        paymentMethod,
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
