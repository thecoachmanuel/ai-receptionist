import { getDb } from "@/lib/db/mongodb";

export interface PlanPrices {
  core: number;
  engage: number;
  voice: number;
}

export interface SystemSettings {
  googleAuthEnabled: boolean;
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
  updatedAt: number;
  updatedBy?: string;
}

const SETTINGS_DOC_ID = "global_system_settings";

const DEFAULTS: SystemSettings = {
  googleAuthEnabled: true,
  planPrices: { core: 0, engage: 49, voice: 149 },
  usdToNgnRate: 1500,
  baseCurrency: "USD",
  contactPhone: "+2348168882014",
  contactEmail: "oneboardng@gmail.com",
  clientPageUrl: "",
  isWaitlistActive: false,
  vapi: {
    vapiPublicKey: process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || process.env.VAPI_PUBLIC_KEY || "",
    vapiPrivateKey: process.env.VAPI_PRIVATE_KEY || process.env.VAPI_API_KEY || "",
    vapiAssistantId: process.env.VAPI_ASSISTANT_ID || process.env.VAPI_DEFAULT_ASSISTANT_ID || "",
  },
  updatedAt: Date.now(),
};

export async function getSystemSettings(): Promise<SystemSettings> {
  try {
    const db = await getDb();
    const doc = await db.collection("system_settings").findOne({ _id: SETTINGS_DOC_ID as any });

    if (!doc) return { ...DEFAULTS };

    return {
      googleAuthEnabled: doc.googleAuthEnabled !== false,
      planPrices: {
        core: doc.planPrices?.core ?? 0,
        engage: doc.planPrices?.engage ?? 49,
        voice: doc.planPrices?.voice ?? 149,
      },
      usdToNgnRate: doc.usdToNgnRate ?? 1500,
      baseCurrency: doc.baseCurrency ?? "USD",
      contactPhone: doc.contactPhone ?? "+2348168882014",
      contactEmail: doc.contactEmail ?? "oneboardng@gmail.com",
      clientPageUrl: doc.clientPageUrl ?? "",
      isWaitlistActive: doc.isWaitlistActive ?? false,
      vapi: {
        vapiPublicKey: doc.vapi?.vapiPublicKey || process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || process.env.VAPI_PUBLIC_KEY || "",
        vapiPrivateKey: doc.vapi?.vapiPrivateKey || process.env.VAPI_PRIVATE_KEY || process.env.VAPI_API_KEY || "",
        vapiAssistantId: doc.vapi?.vapiAssistantId || process.env.VAPI_ASSISTANT_ID || process.env.VAPI_DEFAULT_ASSISTANT_ID || "",
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
