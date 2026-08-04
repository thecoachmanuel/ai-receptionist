import { getDb } from "@/lib/db/mongodb";
import { getSystemSettings, updateSystemSettings } from "@/lib/services/system-settings";

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

export type VapiSettings = {
  activeProvider: "vapi";
  vapiPublicKey: string;
  vapiPrivateKey: string;
  vapiAssistantId: string;
  updatedAt: number;
};

export type ElevenLabsSettings = VapiSettings;

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
 * Fetches live platform-wide settings saved by super admin.
 */
export async function getPlatformSettings(): Promise<PlatformSettings> {
  const sys = await getSystemSettings();
  return {
    baseCurrency: sys.baseCurrency ?? DEFAULTS.baseCurrency,
    planPrices: {
      core: sys.planPrices?.core ?? DEFAULTS.planPrices.core,
      engage: sys.planPrices?.engage ?? DEFAULTS.planPrices.engage,
      voice: sys.planPrices?.voice ?? DEFAULTS.planPrices.voice,
    },
    usdToNgnRate: sys.usdToNgnRate ?? DEFAULTS.usdToNgnRate,
    contactPhone: sys.contactPhone ?? DEFAULTS.contactPhone,
    contactEmail: sys.contactEmail ?? DEFAULTS.contactEmail,
    clientPageUrl: sys.clientPageUrl ?? DEFAULTS.clientPageUrl,
    isWaitlistActive: sys.isWaitlistActive ?? DEFAULTS.isWaitlistActive,
    updatedAt: sys.updatedAt ?? 0,
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
  const current = await getSystemSettings();
  await updateSystemSettings({
    planPrices: {
      ...current.planPrices,
      [plan]: Math.round(usdPrice * 100) / 100,
    },
  });
}

/**
 * Updates the USD → NGN exchange rate used by Paystack checkout.
 */
export async function updateExchangeRate(rate: number): Promise<void> {
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error("Exchange rate must be a positive number.");
  }
  await updateSystemSettings({ usdToNgnRate: Math.round(rate) });
}

/**
 * Updates the platform base currency convention.
 */
export async function updateBaseCurrency(currency: "USD" | "NGN"): Promise<void> {
  await updateSystemSettings({ baseCurrency: currency });
}

/**
 * Updates the waitlist status (enable/disable waitlist landing page).
 */
export async function updateWaitlistStatus(isActive: boolean): Promise<void> {
  await updateSystemSettings({ isWaitlistActive: isActive });
}

/**
 * Updates platform contact phone, email, and client page URL. Super Admin only.
 */
export async function updatePlatformContact(phone?: string, email?: string, clientPageUrl?: string): Promise<void> {
  const updates: Record<string, any> = {};
  if (phone !== undefined) updates.contactPhone = phone.trim() || DEFAULTS.contactPhone;
  if (email !== undefined) updates.contactEmail = email.trim() || DEFAULTS.contactEmail;
  if (clientPageUrl !== undefined) updates.clientPageUrl = clientPageUrl.trim();
  if (Object.keys(updates).length > 0) {
    await updateSystemSettings(updates);
  }
}

export async function getVapiSettings(): Promise<VapiSettings> {
  const sys = await getSystemSettings();
  return {
    activeProvider: "vapi",
    vapiPublicKey: sys.vapi.vapiPublicKey,
    vapiPrivateKey: sys.vapi.vapiPrivateKey,
    vapiAssistantId: sys.vapi.vapiAssistantId,
    updatedAt: sys.updatedAt || 0,
  };
}

export const getElevenLabsSettings = getVapiSettings;

export async function updateVapiSettings(data: {
  vapiPublicKey?: string;
  vapiPrivateKey?: string;
  vapiAssistantId?: string;
  [key: string]: any;
}): Promise<void> {
  const current = await getSystemSettings();
  await updateSystemSettings({
    vapi: {
      ...current.vapi,
      ...(data.vapiPublicKey !== undefined ? { vapiPublicKey: data.vapiPublicKey.trim() } : {}),
      ...(data.vapiPrivateKey !== undefined ? { vapiPrivateKey: data.vapiPrivateKey.trim() } : {}),
      ...(data.vapiAssistantId !== undefined ? { vapiAssistantId: data.vapiAssistantId.trim() } : {}),
    },
  });
}

export const updateElevenLabsSettings = updateVapiSettings;
