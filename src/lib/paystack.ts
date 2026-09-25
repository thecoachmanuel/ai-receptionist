import crypto from "node:crypto";
import { getDb } from "@/lib/db/mongodb";
import type { DbOrganization, PlanType } from "@/lib/db/types";
import { ObjectId } from "mongodb";
import { getPlatformSettings } from "@/lib/services/settings";

export const USD_TO_NGN_RATE = Number(process.env.USD_TO_NGN_RATE || "1500");

/** Compile-time defaults in NGN — the live values come from getPlatformSettings() at runtime. */
export const PAYSTACK_PLANS: Record<
  PlanType,
  { name: string; ngnPrice: number }
> = {
  free_org: {
    name: "Core Plan",
    ngnPrice: 5000,
  },
  engage: {
    name: "Engage Plan",
    ngnPrice: 25000,
  },
  voice: {
    name: "Voice Plan",
    ngnPrice: 75000,
  },
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
}: {
  email: string;
  planId: PlanType;
  orgId: string;
  callbackUrl: string;
}) {
  const secretKey = getPaystackSecretKey();
  if (!secretKey) {
    throw new Error(
      "Paystack secret key is not configured. Please set PAYSTACK_SECRET_KEY in .env.local",
    );
  }

  // Load live admin-configurable prices
  const settings = await getPlatformSettings();
  const planInfo = PAYSTACK_PLANS[planId];
  if (!planInfo) {
    throw new Error("Invalid plan selected for Paystack checkout.");
  }

  const priceKey = planId === "free_org" ? "core" : planId;
  const ngnAmount = settings.planPrices[priceKey] ?? planInfo.ngnPrice;
  const amountInKobo = Math.round(ngnAmount * 100);

  // Attempt to link recurring Paystack plan code
  let planCode: string | null = null;
  try {
    planCode = await getOrCreatePaystackPlan(planId, ngnAmount);
  } catch (planErr) {
    console.warn("Could not create/fetch Paystack recurring plan, falling back to standard checkout:", planErr);
  }

  const payload: Record<string, unknown> = {
    email,
    amount: amountInKobo,
    currency: "NGN",
    callback_url: callbackUrl,
    metadata: {
      orgId,
      planId,
      ngnAmount,
      planCode: planCode || undefined,
      custom_fields: [
        {
          display_name: "Plan Name",
          variable_name: "plan_name",
          value: `${planInfo.name} (₦${ngnAmount.toLocaleString()} NGN/mo)`,
        },
        {
          display_name: "Organization ID",
          variable_name: "org_id",
          value: orgId,
        },
      ],
    },
  };

  // If a Paystack plan code exists, pass it so Paystack auto-debited monthly subscription is initialized
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
    throw new Error(
      data.message || "Failed to initialize transaction with Paystack.",
    );
  }

  return {
    authorizationUrl: data.data.authorization_url as string,
    accessCode: data.data.access_code as string,
    reference: data.data.reference as string,
    planCode: planCode || undefined,
  };
}

/** Cache for Paystack plan codes to avoid redundant API calls */
const planCodeCache = new Map<string, string>();

export async function getOrCreatePaystackPlan(
  planId: PlanType,
  ngnAmount: number,
): Promise<string | null> {
  const secretKey = getPaystackSecretKey();
  if (!secretKey) return null;

  const planInfo = PAYSTACK_PLANS[planId];
  if (!planInfo) return null;

  const cacheKey = `${planId}_${ngnAmount}`;
  if (planCodeCache.has(cacheKey)) {
    return planCodeCache.get(cacheKey)!;
  }

  const amountInKobo = Math.round(ngnAmount * 100);
  const planName = `${planInfo.name} (₦${ngnAmount.toLocaleString()}/mo)`;

  try {
    // 1. Check existing plans on Paystack
    const listRes = await fetch("https://api.paystack.co/plan", {
      headers: { Authorization: `Bearer ${secretKey}` },
    });
    if (listRes.ok) {
      const listData = await listRes.json();
      const existing = (listData.data || []).find(
        (p: any) =>
          p.amount === amountInKobo &&
          p.interval === "monthly" &&
          p.currency === "NGN",
      );
      if (existing?.plan_code) {
        planCodeCache.set(cacheKey, existing.plan_code);
        return existing.plan_code;
      }
    }

    // 2. Create new recurring plan on Paystack
    const createRes = await fetch("https://api.paystack.co/plan", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: planName,
        interval: "monthly",
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
  if (!secretKey) {
    throw new Error("Paystack secret key is not configured.");
  }

  const response = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
    },
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
    metadata?: { orgId?: string; planId?: PlanType; planCode?: string };
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
    };
  };
}

export async function updateOrgPlanFromPaystack(
  orgId: string,
  planId: PlanType,
  paystackDetails: Record<string, unknown>,
) {
  const db = await getDb();
  const filter = ObjectId.isValid(orgId)
    ? { _id: new ObjectId(orgId) }
    : { clerkOrgId: orgId };

  const now = Date.now();
  // 30 days active subscription duration for monthly plan
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const subscriptionExpiresAt = now + thirtyDaysMs;

  await db.collection<DbOrganization>("organizations").updateOne(filter, {
    $set: {
      plan: planId,
      planStatus: "active",
      subscriptionExpiresAt,
      paystack: {
        ...paystackDetails,
        channel: "paystack",
        lastPaymentDate: now,
      },
      updatedAt: now,
    },
  });
}

export interface ManualSubscriptionUpdateOptions {
  orgId: string;
  plan: PlanType;
  planStatus: "active" | "trialing" | "canceled" | "past_due" | "expired";
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
    orgId,
    plan,
    planStatus,
    durationMonths,
    customExpiresAt,
    channel,
    amount,
    manualNotes,
    adminEmail,
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
      currentOrg?.subscriptionExpiresAt &&
      currentOrg.subscriptionExpiresAt > now
        ? currentOrg.subscriptionExpiresAt
        : now;
    subscriptionExpiresAt = baseTime + durationMonths * 30 * 24 * 60 * 60 * 1000;
  } else {
    subscriptionExpiresAt = now + 30 * 24 * 60 * 60 * 1000;
  }

  await db.collection<DbOrganization>("organizations").updateOne(filter, {
    $set: {
      plan,
      planStatus,
      subscriptionExpiresAt,
      paystack: {
        channel,
        amount,
        manualNotes,
        updatedBy: adminEmail,
        lastPaymentDate: now,
      },
      updatedAt: now,
    },
  });

  return { success: true, subscriptionExpiresAt, planStatus };
}
