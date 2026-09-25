import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/nextauth-options";
import { getDb } from "@/lib/db/mongodb";
import { ObjectId } from "mongodb";
import { getBusinessPreset } from "@/lib/business-presets";
import { slugify } from "@/lib/defaults";

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

    const preset = getBusinessPreset(businessType);

    // Update the organization name, slug, businessType, and preset terminology
    await db.collection("organizations").updateOne(orgFilter, {
      $set: {
        name: businessName.trim(),
        slug: finalSlug,
        businessType: preset.id,
        terminology: preset.terminology,
        updatedAt: Date.now(),
      },
    });

    // Update the public site: sync siteSlug, business name, and tailored preset copy
    await db.collection("publicSites").updateMany(
      { organizationId: activeOrgId },
      {
        $set: {
          siteSlug: finalSlug,
          "draft.businessName": businessName.trim(),
          "draft.headline": preset.headlineTemplate(businessName.trim()),
          "draft.subheadline": preset.subheadlineTemplate(businessName.trim()),
          "draft.about": preset.aboutTemplate(businessName.trim()),
          "draft.agent.welcomeMessage": preset.welcomeMessageTemplate(businessName.trim()),
          updatedAt: Date.now(),
        },
      }
    );

    // Seed sample offerings if none exist yet for this organization
    const existingOffering = await db.collection("offerings").findOne({ organizationId: activeOrgId });
    if (!existingOffering && preset.sampleOfferings.length > 0) {
      const now = Date.now();
      const sampleDocs = preset.sampleOfferings.map((sample) => ({
        organizationId: activeOrgId,
        name: sample.name,
        slug: slugify(sample.name),
        description: sample.description,
        category: sample.category,
        durationMinutes: sample.durationMinutes,
        bufferBeforeMinutes: 0,
        bufferAfterMinutes: 0,
        priceMinor: sample.priceMinor,
        currency: "NGN",
        capacity: 1,
        locationIds: [],
        active: true,
        bookableOnline: true,
        createdAt: now,
        updatedAt: now,
      }));
      await db.collection("offerings").insertMany(sampleDocs as any);
    }

    // Mark user as onboarded in DB
    const userIdStr = (session.user as any)?.id;
    if (userIdStr) {
      await db.collection("users").updateOne(
        {
          $or: [
            { _id: userIdStr as any },
            ...(ObjectId.isValid(userIdStr) ? [{ _id: new ObjectId(userIdStr) }] : []),
          ],
        },
        { $set: { isOnboarded: true, updatedAt: Date.now() } }
      );
    }

    return NextResponse.json({ success: true, slug: finalSlug, businessName: businessName.trim() });
  } catch (err) {
    console.error("[onboarding/complete]", err);
    return NextResponse.json({ error: "Failed to save business name." }, { status: 500 });
  }
}
