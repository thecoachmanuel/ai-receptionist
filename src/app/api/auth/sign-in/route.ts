import { NextRequest, NextResponse } from "next/server";
import { comparePassword, hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/mongodb";
import type { DbUser } from "@/lib/db/types";
import { createOrganizationForUser } from "@/lib/services/organizations";

export const runtime = "nodejs";

function cleanEnv(val?: string): string {
  if (!val) return "";
  return val.replace(/^["']|["']$/g, "").trim();
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    if (!email || typeof email !== "string" || !password || typeof password !== "string") {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const adminEmail = (cleanEnv(process.env.ADMIN_EMAIL) || "admin@admin.com").toLowerCase();
    const adminPassword = cleanEnv(process.env.ADMIN_PASSWORD) || "admin123";

    const db = await getDb();

    // Robust case-insensitive exact match
    const escapedEmail = normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    let user = await db.collection<DbUser>("users").findOne({
      $or: [
        { email: normalizedEmail },
        { email: { $regex: `^${escapedEmail}$`, $options: "i" } },
      ],
    });

    // Super Admin Authentication
    if (normalizedEmail === adminEmail) {
      const isEnvPasswordValid = password === adminPassword;
      const isDbPasswordValid = user?.passwordHash ? await comparePassword(password, user.passwordHash) : false;

      if (!isEnvPasswordValid && !isDbPasswordValid) {
        return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
      }

      const now = Date.now();
      if (!user) {
        const passwordHash = await hashPassword(password);
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
      } else if (isEnvPasswordValid) {
        const passwordHash = await hashPassword(adminPassword);
        await db.collection<DbUser>("users").updateOne(
          { _id: user._id },
          { $set: { passwordHash, updatedAt: now } },
        );
        user.passwordHash = passwordHash;
      }

      // Ensure super admin has an active organization
      let activeOrgId = user.activeOrgId;
      let orgSlug = "";
      if (activeOrgId) {
        const org = await db.collection("organizations").findOne({
          $or: [
            { clerkOrgId: activeOrgId },
            { slug: activeOrgId },
            ...(activeOrgId.length === 24 ? [{ _id: new (await import("mongodb")).ObjectId(activeOrgId) }] : []),
          ],
        });
        if (org) orgSlug = (org as any).slug;
      }

      if (!orgSlug) {
        const org = await createOrganizationForUser(user._id!.toString(), "Oneboard Admin Workspace");
        activeOrgId = org._id.toString();
        orgSlug = org.slug;
        await db.collection<DbUser>("users").updateOne(
          { _id: user._id },
          { $set: { activeOrgId } },
        );
      }

      await createSession(user._id!.toString(), activeOrgId);
      return NextResponse.json({ success: true, userId: user._id!.toString(), orgSlug });
    }

    // Standard User Authentication
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    // Resolve active organization & slug
    let activeOrgId = user.activeOrgId;
    let orgSlug = "";

    if (activeOrgId) {
      const org = await db.collection("organizations").findOne({
        $or: [
          { clerkOrgId: activeOrgId },
          { slug: activeOrgId },
          ...(activeOrgId.length === 24 ? [{ _id: new (await import("mongodb")).ObjectId(activeOrgId) }] : []),
        ],
      });
      if (org) orgSlug = (org as any).slug;
    }

    if (!orgSlug) {
      const userIdStr = user._id!.toString();
      const member = await db.collection("orgMembers").findOne({
        $or: [{ userId: userIdStr }, { userId: user._id as any }],
      });
      if (member) {
        const orgIdStr = (member as any).organizationId;
        const org = await db.collection("organizations").findOne({
          $or: [
            { clerkOrgId: orgIdStr },
            { slug: orgIdStr },
            ...(orgIdStr.length === 24 ? [{ _id: new (await import("mongodb")).ObjectId(orgIdStr) }] : []),
          ],
        });
        if (org) {
          activeOrgId = (org as any)._id.toString();
          orgSlug = (org as any).slug;
        }
      }
    }

    if (!orgSlug) {
      const newOrg = await createOrganizationForUser(user._id!.toString(), `${user.name || "User"}'s Workspace`);
      activeOrgId = newOrg._id.toString();
      orgSlug = newOrg.slug;
    }

    await db.collection<DbUser>("users").updateOne(
      { _id: user._id },
      { $set: { activeOrgId, updatedAt: Date.now() } },
    );

    await createSession(user._id!.toString(), activeOrgId);

    return NextResponse.json({ success: true, userId: user._id!.toString(), orgSlug });
  } catch (error) {
    console.error("Sign in error", error);
    return NextResponse.json({ error: "Sign in failed. Please try again." }, { status: 500 });
  }
}
