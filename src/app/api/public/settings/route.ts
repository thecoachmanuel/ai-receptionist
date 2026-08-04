import { NextResponse } from "next/server";
import { getSystemSettings } from "@/lib/services/system-settings";

export const runtime = "nodejs";

export async function GET() {
  try {
    const settings = await getSystemSettings();
    return NextResponse.json({
      googleAuthEnabled: settings.googleAuthEnabled,
    });
  } catch (err) {
    return NextResponse.json(
      { googleAuthEnabled: true },
      { status: 200 }
    );
  }
}
