import { getDb } from "@/lib/db/mongodb";

export type PlanPrices = {
  engage: number; // USD
  voice: number;  // USD
};

export type PlatformSettings = {
  planPrices: PlanPrices;
  usdToNgnRate: number;
  updatedAt: number;
};

const DEFAULTS: PlatformSettings = {
  planPrices: { engage: 49, voice: 149 },
  usdToNgnRate: 1500,
  updatedAt: 0,
};

/**
 * Fetches the platform-wide settings document.
 * Auto-creates it with safe defaults if it doesn't exist yet.
 */
export async function getPlatformSettings(): Promise<PlatformSettings> {
  const db = await getDb();
  const doc = await db
    .collection<{ key: string } & PlatformSettings>("platformSettings")
    .findOne({ key: "platform" });

  if (!doc) {
    const now = Date.now();
    const initial = { key: "platform", ...DEFAULTS, updatedAt: now };
    await db.collection("platformSettings").insertOne(initial);
    return { ...DEFAULTS, updatedAt: now };
  }

  return {
    planPrices: doc.planPrices ?? DEFAULTS.planPrices,
    usdToNgnRate: doc.usdToNgnRate ?? DEFAULTS.usdToNgnRate,
    updatedAt: doc.updatedAt ?? 0,
  };
}

/**
 * Updates a single plan's USD price. Admin-only — enforce auth in the API layer.
 */
export async function updatePlanPrice(
  plan: "engage" | "voice",
  usdPrice: number,
): Promise<void> {
  if (!Number.isFinite(usdPrice) || usdPrice < 0) {
    throw new Error("Price must be a non-negative number.");
  }
  const db = await getDb();
  await db.collection("platformSettings").updateOne(
    { key: "platform" },
    {
      $set: {
        [`planPrices.${plan}`]: Math.round(usdPrice * 100) / 100,
        updatedAt: Date.now(),
      },
    },
    { upsert: true },
  );
}

/**
 * Updates the USD → NGN exchange rate used by Paystack checkout.
 */
export async function updateExchangeRate(rate: number): Promise<void> {
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error("Exchange rate must be a positive number.");
  }
  const db = await getDb();
  await db.collection("platformSettings").updateOne(
    { key: "platform" },
    { $set: { usdToNgnRate: Math.round(rate), updatedAt: Date.now() } },
    { upsert: true },
  );
}
