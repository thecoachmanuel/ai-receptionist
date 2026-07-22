import crypto from "node:crypto";
import { getDb } from "@/lib/db/mongodb";
import type { DbOrganization, PlanType } from "@/lib/db/types";
import { ObjectId } from "mongodb";
import { getPlatformSettings } from "@/lib/services/settings";

export const USD_TO_NGN_RATE = Number(process.env.USD_TO_NGN_RATE || "1500");

/** Compile-time defaults — the live values come from getPlatformSettings() at runtime. */
export const PAYSTACK_PLANS: Record<
  "engage" | "voice",
  { name: string; usdPrice: number }
> = {
  engage: {
    name: "Engage Plan",
    usdPrice: 49,
  },
  voice: {
    name: "Voice Plan",
    usdPrice: 149,
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
  planId: "engage" | "voice";
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
  const planName = PAYSTACK_PLANS[planId]?.name;
  if (!planName) {
    throw new Error("Invalid plan selected for Paystack checkout.");
  }

  const usdPrice = settings.planPrices[planId] ?? PAYSTACK_PLANS[planId].usdPrice;
  const exchangeRate = settings.usdToNgnRate ?? USD_TO_NGN_RATE;
  const ngnAmount = usdPrice * exchangeRate;
  const amountInKobo = Math.round(ngnAmount * 100);

  const response = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      amount: amountInKobo,
      currency: "NGN",
      callback_url: callbackUrl,
      metadata: {
        orgId,
        planId,
        usdPrice,
        exchangeRate,
        ngnAmount,
        custom_fields: [
          {
            display_name: "Plan Name",
            variable_name: "plan_name",
            value: `${planName} ($${usdPrice} USD / ₦${ngnAmount.toLocaleString()} NGN)`,
          },
          {
            display_name: "Organization ID",
            variable_name: "org_id",
            value: orgId,
          },
        ],
      },
    }),
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
  };
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
    metadata?: { orgId?: string; planId?: PlanType };
    paid_at?: string;
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

  await db.collection<DbOrganization>("organizations").updateOne(filter, {
    $set: {
      plan: planId,
      planStatus: "active",
      paystack: paystackDetails,
      updatedAt: Date.now(),
    },
  });
}
