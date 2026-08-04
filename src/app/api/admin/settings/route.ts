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
    return NextResponse.json(settings);
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
    const { googleAuthEnabled } = body;

    if (typeof googleAuthEnabled !== "boolean") {
      return NextResponse.json({ error: "Invalid googleAuthEnabled value" }, { status: 400 });
    }

    const updated = await updateSystemSettings({ googleAuthEnabled }, auth.user.id);
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
