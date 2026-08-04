import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getToken } from "next-auth/jwt";
import { authOptions } from "@/lib/auth/nextauth-options";
import { getDb } from "@/lib/db/mongodb";
import { ObjectId } from "mongodb";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { businessName, businessType } = await request.json();
    if (!businessName || typeof businessName !== "string" || businessName.trim().length < 2) {
      return NextResponse.json({ error: "Business name must be at least 2 characters." }, { status: 400 });
    }

    const db = await getDb();
    const activeOrgId = (session as any).activeOrgId;
    if (!activeOrgId) {
      return NextResponse.json({ error: "No active organization found." }, { status: 400 });
    }

    const slug = businessName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 50);

    // Check slug uniqueness
    let finalSlug = slug;
    const existing = await db.collection("organizations").findOne({ slug });
    if (existing && existing._id.toString() !== activeOrgId) {
      finalSlug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
    }

    await db.collection("organizations").updateOne(
      {
        $or: [
          ...(activeOrgId.length === 24 ? [{ _id: new ObjectId(activeOrgId) }] : []),
          { clerkOrgId: activeOrgId },
          { slug: activeOrgId },
        ],
      },
      {
        $set: {
          name: businessName.trim(),
          slug: finalSlug,
          ...(businessType ? { businessType } : {}),
          updatedAt: Date.now(),
        },
      }
    );

    // Also update the public site if one exists
    await db.collection("public_sites").updateMany(
      { organizationId: activeOrgId },
      { $set: { "config.businessName": businessName.trim(), updatedAt: Date.now() } }
    );

    return NextResponse.json({ success: true, slug: finalSlug });
  } catch (err) {
    console.error("[onboarding/complete]", err);
    return NextResponse.json({ error: "Failed to save business name." }, { status: 500 });
  }
}
