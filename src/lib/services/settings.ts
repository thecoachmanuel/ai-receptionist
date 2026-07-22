import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { getDb } from "@/lib/db/mongodb";

export type PlanPrices = {
  core: number;   // USD (defaults to 0)
  engage: number; // USD
  voice: number;  // USD
};

export type PlatformSettings = {
  planPrices: PlanPrices;
  usdToNgnRate: number;
  contactPhone: string;
  contactEmail: string;
  updatedAt: number;
};

export type ElevenLabsSettings = {
  apiKeys: string[];
  currentIndex: number;
  defaultAgentId: string;
  updatedAt: number;
};

const DEFAULTS: PlatformSettings = {
  planPrices: { core: 0, engage: 49, voice: 149 },
  usdToNgnRate: 1500,
  contactPhone: "+2348168882014",
  contactEmail: "oneboardng@gmail.com",
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
    planPrices: {
      core: doc.planPrices?.core ?? DEFAULTS.planPrices.core,
      engage: doc.planPrices?.engage ?? DEFAULTS.planPrices.engage,
      voice: doc.planPrices?.voice ?? DEFAULTS.planPrices.voice,
    },
    usdToNgnRate: doc.usdToNgnRate ?? DEFAULTS.usdToNgnRate,
    contactPhone: doc.contactPhone ?? DEFAULTS.contactPhone,
    contactEmail: doc.contactEmail ?? DEFAULTS.contactEmail,
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
 * Updates platform contact phone and email. Super Admin only.
 */
export async function updatePlatformContact(phone?: string, email?: string): Promise<void> {
  const db = await getDb();
  const $set: Record<string, any> = { updatedAt: Date.now() };

  if (phone !== undefined) {
    $set.contactPhone = phone.trim() || DEFAULTS.contactPhone;
  }
  if (email !== undefined) {
    $set.contactEmail = email.trim() || DEFAULTS.contactEmail;
  }

  await db.collection("platformSettings").updateOne(
    { key: "platform" },
    { $set },
    { upsert: true },
  );
}

/**
 * Fetches the Super Admin ElevenLabs settings (API keys & agent ID).
 */
export async function getElevenLabsSettings(): Promise<ElevenLabsSettings> {
  const db = await getDb();
  const doc = await db.collection("platformSettings").findOne({ key: "elevenlabs" });
  const envKey = process.env.ELEVENLABS_API_KEY?.trim();
  const envAgent = process.env.ELEVENLABS_DEFAULT_AGENT_ID?.trim() || "";
  const defaultKeys = envKey ? [envKey] : [];

  if (!doc) {
    return {
      apiKeys: defaultKeys,
      currentIndex: 0,
      defaultAgentId: envAgent,
      updatedAt: 0,
    };
  }

  const rawKeys: string[] = Array.isArray(doc.apiKeys) ? doc.apiKeys : [];
  const validKeys = Array.from(new Set([...rawKeys, ...defaultKeys])).filter(Boolean);

  return {
    apiKeys: validKeys.length ? validKeys : defaultKeys,
    currentIndex: doc.currentIndex || 0,
    defaultAgentId: doc.defaultAgentId || envAgent,
    updatedAt: doc.updatedAt || 0,
  };
}

/**
 * Updates Super Admin ElevenLabs API Keys and default Agent ID.
 */
export async function updateElevenLabsSettings(data: {
  apiKeys?: string[];
  defaultAgentId?: string;
}): Promise<void> {
  const db = await getDb();
  const $set: Record<string, any> = { updatedAt: Date.now() };

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
 * Generates a signed session URL with automatic failover across all configured ElevenLabs API keys.
 * If one key fails (e.g. quota exhausted or invalid), it automatically tries the next key in rotation.
 */
export async function getWorkingElevenLabsSignedUrl(): Promise<{ signedUrl: string; apiKey: string; agentId: string }> {
  const settings = await getElevenLabsSettings();
  if (!settings.apiKeys.length) {
    throw new Error("No ElevenLabs API key configured. Please set an API key in Super Admin settings.");
  }

  const agentId = settings.defaultAgentId || process.env.ELEVENLABS_DEFAULT_AGENT_ID?.trim() || "";
  if (!agentId) {
    throw new Error("No ElevenLabs Agent ID configured. Please set an Agent ID in Super Admin settings.");
  }

  let lastError: Error | null = null;
  const totalKeys = settings.apiKeys.length;
  const startIndex = settings.currentIndex % totalKeys;

  // Try every configured API key starting from current rotation index
  for (let attempt = 0; attempt < totalKeys; attempt++) {
    const keyIndex = (startIndex + attempt) % totalKeys;
    const apiKey = settings.apiKeys[keyIndex];

    try {
      const elevenlabs = new ElevenLabsClient({ apiKey });
      const { signedUrl } = await elevenlabs.conversationalAi.conversations.getSignedUrl({ agentId });

      // Save next index for round-robin rotation
      const nextIndex = (keyIndex + 1) % totalKeys;
      const db = await getDb();
      await db
        .collection("platformSettings")
        .updateOne({ key: "elevenlabs" }, { $set: { currentIndex: nextIndex } }, { upsert: true })
        .catch(() => null);

      return { signedUrl, apiKey, agentId };
    } catch (err) {
      console.warn(`ElevenLabs API key #${keyIndex + 1} failed, attempting next key in rotation...`, err);
      lastError = err instanceof Error ? err : new Error("Failed to get ElevenLabs signed URL");
    }
  }

  throw lastError || new Error("All configured ElevenLabs API keys failed or exhausted free credits.");
}
