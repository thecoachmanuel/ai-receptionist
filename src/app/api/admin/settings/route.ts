import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getSystemSettings, updateSystemSettings } from "@/lib/services/system-settings";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const auth = await getSession();
    if (!auth?.isSuperAdmin) {
      return NextResponse.json({ error: "Unauthorized. Super-admin access required." }, { status: 403 });
    }

    const settings = await getSystemSettings();
    // Return in a shape compatible with what the super admin screen expects
    return NextResponse.json({
      googleAuthEnabled: settings.googleAuthEnabled,
      settings: {
        planPrices: settings.planPrices,
        usdToNgnRate: settings.usdToNgnRate,
        baseCurrency: settings.baseCurrency,
        contactPhone: settings.contactPhone,
        contactEmail: settings.contactEmail,
        clientPageUrl: settings.clientPageUrl,
        isWaitlistActive: settings.isWaitlistActive,
        googleAuthEnabled: settings.googleAuthEnabled,
      },
      vapi: settings.vapi,
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch admin settings" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await getSession();
    if (!auth?.isSuperAdmin) {
      return NextResponse.json({ error: "Unauthorized. Super-admin access required." }, { status: 403 });
    }

    const body = await request.json();
    const updates: Record<string, any> = {};

    // ── Google Auth toggle ──────────────────────────────────
    if (typeof body.googleAuthEnabled === "boolean") {
      updates.googleAuthEnabled = body.googleAuthEnabled;
    }

    // ── Platform Pricing ────────────────────────────────────
    // Handles per-plan price: { plan: "core"|"engage"|"voice", usdPrice: number }
    if (body.plan && typeof body.usdPrice === "number") {
      const current = await getSystemSettings();
      updates.planPrices = {
        ...current.planPrices,
        [body.plan]: body.usdPrice,
      };
    }

    // Handles exchange rate + base currency
    if (typeof body.usdToNgnRate === "number") {
      updates.usdToNgnRate = body.usdToNgnRate;
    }
    if (body.baseCurrency === "USD" || body.baseCurrency === "NGN") {
      updates.baseCurrency = body.baseCurrency;
    }

    // ── Contact / Platform Settings ─────────────────────────
    if (typeof body.contactPhone === "string") updates.contactPhone = body.contactPhone;
    if (typeof body.contactEmail === "string") updates.contactEmail = body.contactEmail;
    if (typeof body.clientPageUrl === "string") updates.clientPageUrl = body.clientPageUrl;
    if (typeof body.isWaitlistActive === "boolean") updates.isWaitlistActive = body.isWaitlistActive;

    // ── Vapi AI Config ──────────────────────────────────────
    if (body.activeProvider === "vapi" || body.vapiPublicKey !== undefined || body.vapiPrivateKey !== undefined || body.vapiAssistantId !== undefined) {
      const current = await getSystemSettings();
      updates.vapi = {
        ...current.vapi,
        ...(body.vapiPublicKey !== undefined ? { vapiPublicKey: body.vapiPublicKey } : {}),
        ...(body.vapiPrivateKey !== undefined ? { vapiPrivateKey: body.vapiPrivateKey } : {}),
        ...(body.vapiAssistantId !== undefined ? { vapiAssistantId: body.vapiAssistantId } : {}),
      };
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid settings fields provided." }, { status: 400 });
    }

    const updated = await updateSystemSettings(updates, auth.user.id);
    return NextResponse.json({ success: true, settings: updated });
  } catch (err) {
    console.error("[admin/settings PATCH]", err);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
