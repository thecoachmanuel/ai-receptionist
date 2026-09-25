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
        baseCurrency: settings.baseCurrency,
        contactPhone: settings.contactPhone,
        contactEmail: settings.contactEmail,
        clientPageUrl: settings.clientPageUrl,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      },
    );
  } catch (error) {
    console.error("Public settings GET error", error);
    return NextResponse.json(
      {
        planPrices: { core: 5000, engage: 25000, voice: 75000 },
        usdToNgnRate: 1500,
        baseCurrency: "NGN",
        contactPhone: "+2348168882014",
        contactEmail: "oneboardng@gmail.com",
        clientPageUrl: "",
      },
      { status: 200 },
    );
  }
}
