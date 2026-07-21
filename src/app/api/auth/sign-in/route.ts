import { NextRequest, NextResponse } from "next/server";
import { comparePassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/mongodb";
import type { DbUser } from "@/lib/db/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const db = await getDb();
    const user = await db.collection<DbUser>("users").findOne({ email: email.trim().toLowerCase() });

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    await createSession(user._id!.toString(), user.activeOrgId);

    return NextResponse.json({ success: true, userId: user._id!.toString() });
  } catch (error) {
    console.error("Sign in error", error);
    return NextResponse.json({ error: "Sign in failed." }, { status: 500 });
  }
}
