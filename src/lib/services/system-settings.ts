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
    vapiPublicKey: "",
    vapiPrivateKey: "",
    vapiAssistantId: "",
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
        vapiPublicKey: doc.vapi?.vapiPublicKey ?? "",
        vapiPrivateKey: doc.vapi?.vapiPrivateKey ?? "",
        vapiAssistantId: doc.vapi?.vapiAssistantId ?? "",
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

  await db.collection("system_settings").updateOne(
    { _id: SETTINGS_DOC_ID as any },
    { $set: { ...merged, _id: SETTINGS_DOC_ID as any } },
    { upsert: true }
  );

  return merged;
}
