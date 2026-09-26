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
  saasWhatsapp?: SaasWhatsappSettings;
  updatedAt: number;
  updatedBy?: string;
}

export interface SaasWhatsappSettings {
  enabled: boolean;
  status: "disconnected" | "connecting" | "connected";
  phone: string;
  instanceName: string;
  qrCode?: string | null;
  connectedAt?: number | null;
  welcomeOnWaUpload: boolean;
  welcomeTemplate: string;
  subscriptionExpiryAlert: boolean;
  expiryWarningDays: number;
  expiryAlertTemplate: string;
  subscriptionRenewedAlert: boolean;
  renewedTemplate: string;
}

const SETTINGS_DOC_ID = "global_system_settings";

const DEFAULT_WELCOME_TEMPLATE = `🎉 *Welcome to Qwilo!*

Hello *{businessName}*, your business WhatsApp number (*{phone}*) has been linked to Qwilo.

Your clients will now automatically receive instant booking confirmations, invoices, and reminders directly from your business.

If you ever need help or support, simply reply to this message!
— The Qwilo Team`;

const DEFAULT_EXPIRY_TEMPLATE = `⚠️ *Qwilo Subscription Expiry Notice*

Hello *{businessName}*,

Your Qwilo *{planName}* subscription is expiring in *{daysLeft} day(s)* on *{expiryDate}*.

To keep your AI receptionist and automated booking workflows active without interruption, please renew now:
👉 {renewUrl}

Thank you for choosing Qwilo!`;

const DEFAULT_RENEWED_TEMPLATE = `✅ *Qwilo Subscription Renewed!*

Hello *{businessName}*,

Your Qwilo *{planName}* subscription has been successfully renewed until *{expiryDate}*.

All your automated bookings, AI reception, and WhatsApp notifications remain fully active.
Thank you for your business!`;

const DEFAULTS: SystemSettings = {
  googleAuthEnabled: true,
  enforcePaymentOnSignup: false,
  trialDays: 14,
  planPrices: { core: 1000, engage: 5000, voice: 15000 },
  usdToNgnRate: 1500,
  baseCurrency: "NGN",
  contactPhone: "+2348168882014",
  contactEmail: "qwilong@gmail.com",
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
  saasWhatsapp: {
    enabled: true,
    status: "disconnected",
    phone: "+2348168882014",
    instanceName: "saas_platform",
    qrCode: null,
    connectedAt: null,
    welcomeOnWaUpload: true,
    welcomeTemplate: DEFAULT_WELCOME_TEMPLATE,
    subscriptionExpiryAlert: true,
    expiryWarningDays: 3,
    expiryAlertTemplate: DEFAULT_EXPIRY_TEMPLATE,
    subscriptionRenewedAlert: true,
    renewedTemplate: DEFAULT_RENEWED_TEMPLATE,
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

    const saasWa = doc.saasWhatsapp || {};

    return {
      googleAuthEnabled: doc.googleAuthEnabled !== false,
      enforcePaymentOnSignup: doc.enforcePaymentOnSignup === true,
      trialDays: typeof doc.trialDays === "number" ? doc.trialDays : 14,
      planPrices: {
        core: typeof rawCore === "number" && rawCore > 0 ? rawCore : 1000,
        engage: typeof rawEngage === "number" && rawEngage > 1000 ? rawEngage : 5000,
        voice: typeof rawVoice === "number" && rawVoice > 1000 ? rawVoice : 15000,
      },
      usdToNgnRate: doc.usdToNgnRate ?? 1500,
      baseCurrency: doc.baseCurrency ?? "NGN",
      contactPhone: doc.contactPhone ?? "+2348168882014",
      contactEmail: doc.contactEmail ?? "qwilong@gmail.com",
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
      saasWhatsapp: {
        enabled: saasWa.enabled !== false,
        status: saasWa.status || "disconnected",
        phone: saasWa.phone || DEFAULTS.saasWhatsapp!.phone,
        instanceName: saasWa.instanceName || "saas_platform",
        qrCode: saasWa.qrCode || null,
        connectedAt: saasWa.connectedAt || null,
        welcomeOnWaUpload: saasWa.welcomeOnWaUpload !== false,
        welcomeTemplate: saasWa.welcomeTemplate || DEFAULT_WELCOME_TEMPLATE,
        subscriptionExpiryAlert: saasWa.subscriptionExpiryAlert !== false,
        expiryWarningDays: typeof saasWa.expiryWarningDays === "number" ? saasWa.expiryWarningDays : 3,
        expiryAlertTemplate: saasWa.expiryAlertTemplate || DEFAULT_EXPIRY_TEMPLATE,
        subscriptionRenewedAlert: saasWa.subscriptionRenewedAlert !== false,
        renewedTemplate: saasWa.renewedTemplate || DEFAULT_RENEWED_TEMPLATE,
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
    // Merge nested saasWhatsapp object
    saasWhatsapp: updates.saasWhatsapp
      ? { ...(current.saasWhatsapp || {}), ...updates.saasWhatsapp } as any
      : current.saasWhatsapp,
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
