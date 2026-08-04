import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
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

    // Generate clean URL slug from business name
    const baseSlug = businessName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 50);

    // Ensure slug is unique
    let finalSlug = baseSlug;
    const orgFilter = {
      $or: [
        ...(activeOrgId.length === 24 ? [{ _id: new ObjectId(activeOrgId) }] : []),
        { clerkOrgId: activeOrgId },
        { slug: activeOrgId },
      ],
    };

    const existingWithSlug = await db.collection("organizations").findOne({
      slug: baseSlug,
    });
    if (existingWithSlug && existingWithSlug._id.toString() !== activeOrgId) {
      finalSlug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
    }

    // Update the organization name and slug
    await db.collection("organizations").updateOne(orgFilter, {
      $set: {
        name: businessName.trim(),
        slug: finalSlug,
        ...(businessType ? { businessType } : {}),
        updatedAt: Date.now(),
      },
    });

    // Update the public site: sync siteSlug AND business name
    await db.collection("publicSites").updateMany(
      { organizationId: activeOrgId },
      {
        $set: {
          siteSlug: finalSlug,
          "draft.businessName": businessName.trim(),
          "draft.config.businessName": businessName.trim(),
          updatedAt: Date.now(),
        },
      }
    );

    // Also update alternate collection name used in some places
    await db.collection("public_sites").updateMany(
      { organizationId: activeOrgId },
      {
        $set: {
          siteSlug: finalSlug,
          "config.businessName": businessName.trim(),
          updatedAt: Date.now(),
        },
      }
    );

    return NextResponse.json({ success: true, slug: finalSlug, businessName: businessName.trim() });
  } catch (err) {
    console.error("[onboarding/complete]", err);
    return NextResponse.json({ error: "Failed to save business name." }, { status: 500 });
  }
}
