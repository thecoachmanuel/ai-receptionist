import { getDb } from "@/lib/db/mongodb";

export type PlanPrices = {
  core: number;   // USD (defaults to 0)
  engage: number; // USD
  voice: number;  // USD
};

export type PlatformSettings = {
  baseCurrency: "USD" | "NGN";
  planPrices: PlanPrices;
  usdToNgnRate: number;
  contactPhone: string;
  contactEmail: string;
  clientPageUrl: string;
  isWaitlistActive: boolean;
  updatedAt: number;
};

export type AIProvider = "vapi";

export type ElevenLabsSettings = {
  activeProvider: "vapi";
  vapiPublicKey: string;
  vapiPrivateKey: string;
  vapiAssistantId: string;
  updatedAt: number;
};

const DEFAULTS: PlatformSettings = {
  baseCurrency: "USD",
  planPrices: { core: 0, engage: 49, voice: 149 },
  usdToNgnRate: 1500,
  contactPhone: "+2348168882014",
  contactEmail: "oneboardng@gmail.com",
  clientPageUrl: "",
  isWaitlistActive: false,
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
    baseCurrency: doc.baseCurrency ?? DEFAULTS.baseCurrency,
    planPrices: {
      core: doc.planPrices?.core ?? DEFAULTS.planPrices.core,
      engage: doc.planPrices?.engage ?? DEFAULTS.planPrices.engage,
      voice: doc.planPrices?.voice ?? DEFAULTS.planPrices.voice,
    },
    usdToNgnRate: doc.usdToNgnRate ?? DEFAULTS.usdToNgnRate,
    contactPhone: doc.contactPhone ?? DEFAULTS.contactPhone,
    contactEmail: doc.contactEmail ?? DEFAULTS.contactEmail,
    clientPageUrl: (doc as any).clientPageUrl ?? DEFAULTS.clientPageUrl,
    isWaitlistActive: doc.isWaitlistActive ?? DEFAULTS.isWaitlistActive,
    updatedAt: doc.updatedAt ?? 0,
  };
}

/**
 * Updates a single plan's USD price. Admin-only.
 */
export async function updatePlanPrice(
  plan: "core" | "engage" | "voice",
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

/**
 * Updates the platform base currency convention.
 */
export async function updateBaseCurrency(currency: "USD" | "NGN"): Promise<void> {
  const db = await getDb();
  await db.collection("platformSettings").updateOne(
    { key: "platform" },
    { $set: { baseCurrency: currency, updatedAt: Date.now() } },
    { upsert: true },
  );
}

/**
 * Updates the waitlist status (enable/disable waitlist landing page).
 */
export async function updateWaitlistStatus(isActive: boolean): Promise<void> {
  const db = await getDb();
  await db.collection("platformSettings").updateOne(
    { key: "platform" },
    { $set: { isWaitlistActive: isActive, updatedAt: Date.now() } },
    { upsert: true },
  );
}

/**
 * Updates platform contact phone, email, and client page URL. Super Admin only.
 */
export async function updatePlatformContact(phone?: string, email?: string, clientPageUrl?: string): Promise<void> {
  const db = await getDb();
  const $set: Record<string, any> = { updatedAt: Date.now() };

  if (phone !== undefined) {
    $set.contactPhone = phone.trim() || DEFAULTS.contactPhone;
  }
  if (email !== undefined) {
    $set.contactEmail = email.trim() || DEFAULTS.contactEmail;
  }
  if (clientPageUrl !== undefined) {
    $set.clientPageUrl = clientPageUrl.trim();
  }

  await db.collection("platformSettings").updateOne(
    { key: "platform" },
    { $set },
    { upsert: true },
  );
}

export async function getElevenLabsSettings(): Promise<ElevenLabsSettings> {
  const db = await getDb();
  const doc = await db.collection("platformSettings").findOne({ key: "vapi" }) ||
              await db.collection("platformSettings").findOne({ key: "elevenlabs" });

  const envVapiPublicKey = process.env.VAPI_PUBLIC_KEY?.trim() || "";
  const envVapiPrivateKey = process.env.VAPI_PRIVATE_KEY?.trim() || "";
  const envVapiAssistantId = process.env.VAPI_ASSISTANT_ID?.trim() || "";

  return {
    activeProvider: "vapi",
    vapiPublicKey: doc?.vapiPublicKey || envVapiPublicKey,
    vapiPrivateKey: doc?.vapiPrivateKey || envVapiPrivateKey,
    vapiAssistantId: doc?.vapiAssistantId || envVapiAssistantId,
    updatedAt: doc?.updatedAt || 0,
  };
}

export async function updateElevenLabsSettings(data: {
  vapiPublicKey?: string;
  vapiPrivateKey?: string;
  vapiAssistantId?: string;
  [key: string]: any;
}): Promise<void> {
  const db = await getDb();
  const $set: Record<string, any> = { activeProvider: "vapi", updatedAt: Date.now() };

  if (data.vapiPublicKey !== undefined) $set.vapiPublicKey = data.vapiPublicKey.trim();
  if (data.vapiPrivateKey !== undefined) $set.vapiPrivateKey = data.vapiPrivateKey.trim();
  if (data.vapiAssistantId !== undefined) $set.vapiAssistantId = data.vapiAssistantId.trim();

  await db
    .collection("platformSettings")
    .updateOne({ key: "vapi" }, { $set }, { upsert: true });
}
