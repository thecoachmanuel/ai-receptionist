import { NextRequest, NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/mongodb";
import type { DbUser } from "@/lib/db/types";
import { createOrganizationForUser } from "@/lib/services/organizations";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, organizationName } = await request.json();
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Email, password, and full name are required." },
        { status: 400 },
      );
    }

    const emailNorm = email.trim().toLowerCase();
    const db = await getDb();
    const existing = await db.collection<DbUser>("users").findOne({ email: emailNorm });
    if (existing) {
      return NextResponse.json(
        { error: "An account with that email already exists." },
        { status: 400 },
      );
    }

    const passwordHash = await hashPassword(password);
    const now = Date.now();

    const newUser: DbUser = {
      email: emailNorm,
      passwordHash,
      name: name.trim(),
      createdAt: now,
      updatedAt: now,
    };

    const userResult = await db.collection<DbUser>("users").insertOne(newUser);
    const userId = userResult.insertedId.toString();

    const orgName = organizationName?.trim() || `${name}'s Organization`;
    const org = await createOrganizationForUser(userId, orgName);

    await db.collection<DbUser>("users").updateOne(
      { _id: userResult.insertedId },
      { $set: { activeOrgId: org._id!.toString() } },
    );

    await createSession(userId, org._id!.toString());

    return NextResponse.json({ success: true, userId, orgSlug: org.slug });
  } catch (error) {
    console.error("Sign up error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sign up failed." },
      { status: 500 },
    );
  }
}
