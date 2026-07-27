import { NextRequest, NextResponse } from "next/server";
import { comparePassword, hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/mongodb";
import type { DbUser } from "@/lib/db/types";
import { createOrganizationForUser } from "@/lib/services/organizations";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const adminEmail = (process.env.ADMIN_EMAIL || "admin@admin.com").trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

    const db = await getDb();
    let user = await db.collection<DbUser>("users").findOne({ email: normalizedEmail });

    // Handle Super Admin authentication using env ADMIN_EMAIL and ADMIN_PASSWORD
    if (normalizedEmail === adminEmail) {
      if (password !== adminPassword) {
        return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
      }

      if (!user) {
        // Automatically bootstrap super admin user and workspace if missing
        const passwordHash = await hashPassword(adminPassword);
        const now = Date.now();
        const insertUserResult = await db.collection<DbUser>("users").insertOne({
          email: adminEmail,
          passwordHash,
          name: "System Admin",
          createdAt: now,
          updatedAt: now,
        });
        const userId = insertUserResult.insertedId.toString();
        const org = await createOrganizationForUser(userId, "Oneboard Admin Workspace");
        const activeOrgId = org._id.toString();

        await db.collection<DbUser>("users").updateOne(
          { _id: insertUserResult.insertedId },
          { $set: { activeOrgId } },
        );

        user = {
          _id: insertUserResult.insertedId,
          email: adminEmail,
          passwordHash,
          name: "System Admin",
          activeOrgId,
          createdAt: now,
          updatedAt: now,
        };
      } else {
        // Update stored passwordHash to stay in sync with env ADMIN_PASSWORD
        const passwordHash = await hashPassword(adminPassword);
        await db.collection<DbUser>("users").updateOne(
          { _id: user._id },
          { $set: { passwordHash, updatedAt: Date.now() } },
        );
      }

      await createSession(user._id!.toString(), user.activeOrgId);
      return NextResponse.json({ success: true, userId: user._id!.toString() });
    }

    // Standard user authentication flow
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
