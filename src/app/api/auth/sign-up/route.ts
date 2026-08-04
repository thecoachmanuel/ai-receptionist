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

    // Check if user was pre-added as a staff team member by their employer
    const escapedEmail = emailNorm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matchingTeamMember = await db.collection("teamMembers").findOne({
      email: { $regex: `^${escapedEmail}$`, $options: "i" },
    });

    let orgId = "";
    let orgSlug = "";

    if (matchingTeamMember && matchingTeamMember.organizationId) {
      const orgIdStr = matchingTeamMember.organizationId;
      const existingOrg = await db.collection("organizations").findOne({
        $or: [
          { clerkOrgId: orgIdStr },
          { slug: orgIdStr },
          ...(orgIdStr.length === 24 ? [{ _id: new (await import("mongodb")).ObjectId(orgIdStr) }] : []),
        ],
      });

      if (existingOrg) {
        orgId = (existingOrg as any)._id.toString();
        orgSlug = (existingOrg as any).slug;

        await db.collection("orgMembers").insertOne({
          organizationId: orgId,
          userId,
          role: "member",
          teamMemberId: matchingTeamMember._id?.toString(),
          createdAt: now,
          updatedAt: now,
        });

        await db.collection("teamMembers").updateOne(
          { _id: matchingTeamMember._id },
          { $set: { userId } },
        );
      }
    }

    if (!orgSlug) {
      const orgName = organizationName?.trim() || `${name}'s Organization`;
      const createdOrg = await createOrganizationForUser(userId, orgName);
      orgId = createdOrg._id.toString();
      orgSlug = createdOrg.slug;
    }

    await db.collection<DbUser>("users").updateOne(
      { _id: userResult.insertedId },
      { $set: { activeOrgId: orgId } },
    );

    await createSession(userId, orgId);

    return NextResponse.json({ success: true, userId, orgSlug });
  } catch (error) {
    console.error("Sign up error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sign up failed." },
      { status: 500 },
    );
  }
}
