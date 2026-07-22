import { NextResponse } from "next/server";
import { getPlatformSettings } from "@/lib/services/settings";

export const runtime = "nodejs";

/**
 * Public endpoint — returns current plan prices and exchange rate.
 * No auth required; used by billing screen and pricing page client components.
 */
export async function GET() {
  try {
    const settings = await getPlatformSettings();
    return NextResponse.json(
      {
        planPrices: settings.planPrices,
        usdToNgnRate: settings.usdToNgnRate,
      },
      {
        headers: {
          // Short cache — prices rarely change but we don't want stale data
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      },
    );
  } catch (error) {
    console.error("Public settings GET error", error);
    // Return safe defaults on error so the UI never shows $0
    return NextResponse.json(
      { planPrices: { core: 0, engage: 49, voice: 149 }, usdToNgnRate: 1500 },
      { status: 200 },
    );
  }
}
