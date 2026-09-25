import { getDb } from "@/lib/db/mongodb";

export interface PlanPrices {
  core: number;
  engage: number;
  voice: number;
}

export interface SystemSettings {
  googleAuthEnabled: boolean;
  enforcePaymentOnSignup: boolean;
  trialDays: number;
  planPrices: PlanPrices;
  usdToNgnRate: number;
  baseCurrency: "USD" | "NGN";
  contactPhone: string;
  contactEmail: string;
  clientPageUrl: string;
  isWaitlistActive: boolean;
  vapi: {
    vapiPublicKey: string;
    vapiPrivateKey: string;
    vapiAssistantId: string;
  };
  whatsappGateway?: {
    enabled: boolean;
    serverUrl: string;
    apiKey: string;
  };
  updatedAt: number;
  updatedBy?: string;
}

const SETTINGS_DOC_ID = "global_system_settings";

const DEFAULTS: SystemSettings = {
  googleAuthEnabled: true,
  enforcePaymentOnSignup: false,
  trialDays: 14,
  planPrices: { core: 5000, engage: 25000, voice: 75000 },
  usdToNgnRate: 1500,
  baseCurrency: "NGN",
  contactPhone: "+2348168882014",
  contactEmail: "oneboardng@gmail.com",
  clientPageUrl: "",
  isWaitlistActive: false,
  vapi: {
    vapiPublicKey: process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || process.env.VAPI_PUBLIC_KEY || "",
    vapiPrivateKey: process.env.VAPI_PRIVATE_KEY || process.env.VAPI_API_KEY || "",
    vapiAssistantId: process.env.VAPI_ASSISTANT_ID || process.env.VAPI_DEFAULT_ASSISTANT_ID || "",
  },
  whatsappGateway: {
    enabled: true,
    serverUrl: process.env.WHATSAPP_GATEWAY_URL || process.env.WAHA_SERVER_URL || "https://nectar-58qj.onrender.com",
    apiKey: process.env.WHATSAPP_GATEWAY_API_KEY || process.env.WAHA_API_KEY || "",
  },
  updatedAt: Date.now(),
};

export async function getSystemSettings(): Promise<SystemSettings> {
  try {
    const db = await getDb();
    const doc = await db.collection("system_settings").findOne({ _id: SETTINGS_DOC_ID as any });

    if (!doc) return { ...DEFAULTS };

    const rawCore = doc.planPrices?.core;
    const rawEngage = doc.planPrices?.engage;
    const rawVoice = doc.planPrices?.voice;

    return {
      googleAuthEnabled: doc.googleAuthEnabled !== false,
      enforcePaymentOnSignup: doc.enforcePaymentOnSignup === true,
      trialDays: typeof doc.trialDays === "number" ? doc.trialDays : 14,
      planPrices: {
        core: typeof rawCore === "number" && rawCore > 0 ? rawCore : 5000,
        engage: typeof rawEngage === "number" && rawEngage > 1000 ? rawEngage : 25000,
        voice: typeof rawVoice === "number" && rawVoice > 1000 ? rawVoice : 75000,
      },
      usdToNgnRate: doc.usdToNgnRate ?? 1500,
      baseCurrency: doc.baseCurrency ?? "NGN",
      contactPhone: doc.contactPhone ?? "+2348168882014",
      contactEmail: doc.contactEmail ?? "oneboardng@gmail.com",
      clientPageUrl: doc.clientPageUrl ?? "",
      isWaitlistActive: doc.isWaitlistActive ?? false,
      vapi: {
        vapiPublicKey: doc.vapi?.vapiPublicKey || process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || process.env.VAPI_PUBLIC_KEY || "",
        vapiPrivateKey: doc.vapi?.vapiPrivateKey || process.env.VAPI_PRIVATE_KEY || process.env.VAPI_API_KEY || "",
        vapiAssistantId: doc.vapi?.vapiAssistantId || process.env.VAPI_ASSISTANT_ID || process.env.VAPI_DEFAULT_ASSISTANT_ID || "",
      },
      whatsappGateway: {
        enabled: doc.whatsappGateway?.enabled ?? DEFAULTS.whatsappGateway!.enabled,
        serverUrl: doc.whatsappGateway?.serverUrl || DEFAULTS.whatsappGateway!.serverUrl,
        apiKey: doc.whatsappGateway?.apiKey || DEFAULTS.whatsappGateway!.apiKey,
      },
      updatedAt: doc.updatedAt || Date.now(),
      updatedBy: doc.updatedBy,
    };
  } catch (err) {
    console.error("Failed to fetch system settings:", err);
    return { ...DEFAULTS };
  }
}

export async function updateSystemSettings(
  updates: Partial<Omit<SystemSettings, "updatedAt" | "updatedBy">>,
  userId?: string
): Promise<SystemSettings> {
  const db = await getDb();
  const now = Date.now();
  const current = await getSystemSettings();

  const merged: SystemSettings = {
    ...current,
    ...updates,
    // Merge nested planPrices object
    planPrices: updates.planPrices
      ? { ...current.planPrices, ...updates.planPrices }
      : current.planPrices,
    // Merge nested vapi object
    vapi: updates.vapi
      ? { ...current.vapi, ...updates.vapi }
      : current.vapi,
    // Merge nested whatsappGateway object
    whatsappGateway: updates.whatsappGateway
      ? { ...(current.whatsappGateway || {}), ...updates.whatsappGateway } as any
      : current.whatsappGateway,
    updatedAt: now,
    updatedBy: userId || current.updatedBy,
  };

  await Promise.all([
    db.collection("system_settings").updateOne(
      { _id: SETTINGS_DOC_ID as any },
      { $set: { ...merged, _id: SETTINGS_DOC_ID as any } },
      { upsert: true }
    ),
    db.collection("platformSettings").updateOne(
      { key: "platform" },
      {
        $set: {
          key: "platform",
          baseCurrency: merged.baseCurrency,
          planPrices: merged.planPrices,
          usdToNgnRate: merged.usdToNgnRate,
          contactPhone: merged.contactPhone,
          contactEmail: merged.contactEmail,
          clientPageUrl: merged.clientPageUrl,
          isWaitlistActive: merged.isWaitlistActive,
          updatedAt: now,
        },
      },
      { upsert: true }
    ),
  ]);

  return merged;
}
