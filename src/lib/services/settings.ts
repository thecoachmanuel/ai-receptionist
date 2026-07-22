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
  updatedAt: number;
};

export type AIProvider = "elevenlabs" | "gemini";

export type ElevenLabsSettings = {
  activeProvider: AIProvider;
  geminiApiKeys: string[];
  geminiModel: string;
  geminiCurrentIndex: number;
  apiKeys: string[];
  currentIndex: number;
  defaultAgentId: string;
  updatedAt: number;
};

const DEFAULTS: PlatformSettings = {
  baseCurrency: "USD",
  planPrices: { core: 0, engage: 49, voice: 149 },
  usdToNgnRate: 1500,
  contactPhone: "+2348168882014",
  contactEmail: "oneboardng@gmail.com",
  clientPageUrl: "",
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

/**
 * Fetches the Super Admin AI Provider settings (ElevenLabs & Gemini).
 */
export async function getElevenLabsSettings(): Promise<ElevenLabsSettings> {
  const db = await getDb();
  const doc = await db.collection("platformSettings").findOne({ key: "elevenlabs" });
  const envKey = process.env.ELEVENLABS_API_KEY?.trim();
  const envAgent = process.env.ELEVENLABS_DEFAULT_AGENT_ID?.trim() || "";
  const envGeminiKey =
    process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim() || "";
  const envGeminiModel = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash-lite";

  // Migrate old string geminiApiKey to array if needed
  const rawGeminiKeys: string[] = Array.isArray(doc?.geminiApiKeys)
    ? doc.geminiApiKeys
    : (doc as any)?.geminiApiKey
      ? [(doc as any).geminiApiKey]
      : [];
  const defaultGeminiKeys = envGeminiKey ? [envGeminiKey] : [];
  const validGeminiKeys = Array.from(new Set([...rawGeminiKeys, ...defaultGeminiKeys])).filter(Boolean);

  const defaultKeys = process.env.ELEVENLABS_API_KEY?.trim()
    ? [process.env.ELEVENLABS_API_KEY.trim()]
    : [];

  const rawKeys: string[] = Array.isArray(doc?.apiKeys) ? doc.apiKeys : [];
  const validKeys = Array.from(new Set([...rawKeys, ...defaultKeys])).filter(Boolean);

  return {
    activeProvider: (doc?.activeProvider as AIProvider) || "elevenlabs",
    geminiApiKeys: validGeminiKeys.length ? validGeminiKeys : defaultGeminiKeys,
    geminiModel: doc?.geminiModel || envGeminiModel,
    geminiCurrentIndex: doc?.geminiCurrentIndex || 0,
    apiKeys: validKeys.length ? validKeys : defaultKeys,
    currentIndex: doc?.currentIndex || 0,
    defaultAgentId: doc?.defaultAgentId || envAgent,
    updatedAt: doc?.updatedAt || 0,
  };
}

/**
 * Updates Super Admin AI provider settings (ElevenLabs / Gemini).
 */
export async function updateElevenLabsSettings(data: {
  activeProvider?: AIProvider;
  geminiApiKeys?: string[];
  geminiModel?: string;
  apiKeys?: string[];
  defaultAgentId?: string;
}): Promise<void> {
  const db = await getDb();
  const $set: Record<string, any> = { updatedAt: Date.now() };

  if (data.activeProvider !== undefined) {
    $set.activeProvider = data.activeProvider;
  }
  if (data.geminiApiKeys !== undefined) {
    $set.geminiApiKeys = Array.from(new Set(data.geminiApiKeys.map((k) => k.trim()).filter(Boolean)));
  }
  if (data.geminiModel !== undefined) {
    $set.geminiModel = data.geminiModel.trim() || "gemini-2.5-flash-lite";
  }
  if (data.apiKeys !== undefined) {
    $set.apiKeys = Array.from(new Set(data.apiKeys.map((k) => k.trim()).filter(Boolean)));
  }
  if (data.defaultAgentId !== undefined) {
    $set.defaultAgentId = data.defaultAgentId.trim();
  }

  await db.collection("platformSettings").updateOne(
    { key: "elevenlabs" },
    { $set },
    { upsert: true },
  );
}

/**
 * Returns an active ElevenLabs API key using auto-rotation.
 * Rotates round-robin across configured keys to prevent credit exhaustion.
 */
export async function getRotatedElevenLabsKey(): Promise<{ apiKey: string; agentId: string }> {
  const settings = await getElevenLabsSettings();
  if (!settings.apiKeys.length) {
    throw new Error("No ElevenLabs API key is configured.");
  }

  const index = settings.currentIndex % settings.apiKeys.length;
  const apiKey = settings.apiKeys[index];
  const agentId = settings.defaultAgentId || process.env.ELEVENLABS_DEFAULT_AGENT_ID?.trim() || "";

  // Advance rotation index atomically
  const nextIndex = (index + 1) % settings.apiKeys.length;
  const db = await getDb();
  await db
    .collection("platformSettings")
    .updateOne({ key: "elevenlabs" }, { $set: { currentIndex: nextIndex } }, { upsert: true })
    .catch(() => null);

  return { apiKey, agentId };
}

/**
 * Returns an active Gemini API key using auto-rotation.
 * Rotates round-robin across configured keys to prevent quota exhaustion.
 */
export async function getRotatedGeminiKey(): Promise<{ apiKey: string; model: string }> {
  const settings = await getElevenLabsSettings();
  const model = settings.geminiModel || process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash-lite";

  if (!settings.geminiApiKeys.length) {
    throw new Error("No Gemini API key is configured.");
  }

  const index = settings.geminiCurrentIndex % settings.geminiApiKeys.length;
  const apiKey = settings.geminiApiKeys[index];

  // Advance rotation index atomically
  const nextIndex = (index + 1) % settings.geminiApiKeys.length;
  const db = await getDb();
  await db
    .collection("platformSettings")
    .updateOne({ key: "elevenlabs" }, { $set: { geminiCurrentIndex: nextIndex } }, { upsert: true })
    .catch(() => null);

  return { apiKey, model };
}
