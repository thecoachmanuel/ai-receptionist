import { NextResponse } from "next/server";
import { getSystemSettings } from "@/lib/services/system-settings";

export const runtime = "nodejs";

export async function GET() {
  try {
    const settings = await getSystemSettings();
    return NextResponse.json({
      googleAuthEnabled: settings.googleAuthEnabled,
      enforcePaymentOnSignup: settings.enforcePaymentOnSignup ?? true,
      trialDays: settings.trialDays ?? 0,
      planPrices: settings.planPrices,
    });
  } catch (err) {
    return NextResponse.json(
      {
        googleAuthEnabled: true,
        enforcePaymentOnSignup: true,
        trialDays: 0,
        planPrices: { core: 1000, engage: 5000, voice: 15000 },
      },
      { status: 200 }
    );
  }
}
