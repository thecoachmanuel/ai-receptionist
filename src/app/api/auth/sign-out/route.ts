import { NextResponse } from "next/server";
import { clearSession, clearSessionCookie } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST() {
  await clearSession();
  return clearSessionCookie(NextResponse.json({ success: true }));
}
