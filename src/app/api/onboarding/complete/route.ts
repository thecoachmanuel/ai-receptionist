import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/nextauth-options";
import { getDb } from "@/lib/db/mongodb";
import { ObjectId } from "mongodb";
import { getBusinessPreset } from "@/lib/business-presets";
import { slugify } from "@/lib/defaults";
import type { BackendTerminology } from "@/lib/db/types";

export const runtime = "nodejs";

const RETAIL_TERMINOLOGY: BackendTerminology = {
  offeringSingular: "Product",
  offeringPlural: "Products",
  teamMemberSingular: "Staff",
  teamMemberPlural: "Staff",
  customerSingular: "Customer",
  customerPlural: "Customers",
  bookingSingular: "Order",
  bookingPlural: "Orders",
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      businessName,
      businessModel = "services",
      businessType,
      category,
      currency = "NGN",
      deliveryCity = "Lagos Mainland",
    } = await request.json();

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

    const isEcommerce = businessModel === "ecommerce";
    const isHybrid = businessModel === "hybrid";

    if (isEcommerce) {
      // 🛍️ ECOMMERCE CONFIGURATION
      await db.collection("organizations").updateOne(orgFilter, {
        $set: {
          name: businessName.trim(),
          slug: finalSlug,
          businessModel: "ecommerce",
          businessType: category || "retail",
          currency: currency || "NGN",
          terminology: RETAIL_TERMINOLOGY,
          features: {
            bookingsEnabled: false,
            commerceEnabled: true,
            voiceAgentEnabled: false,
            whatsappCommerceEnabled: true,
          },
          updatedAt: Date.now(),
        },
      });

      // Update public site draft for ecommerce storefront
      await db.collection("publicSites").updateMany(
        { organizationId: activeOrgId },
        {
          $set: {
            siteSlug: finalSlug,
            "draft.businessName": businessName.trim(),
            "draft.headline": `Welcome to ${businessName.trim()}`,
            "draft.subheadline": "Browse our curated collection and order seamlessly via WhatsApp.",
            "draft.about": `Welcome to ${businessName.trim()}! We are committed to providing premium quality products with fast and reliable delivery.`,
            "draft.agent.welcomeMessage": `Hello! Welcome to ${businessName.trim()}. Looking for something special or need help placing an order?`,
            updatedAt: Date.now(),
          },
        }
      );

      // Seed sample products if none exist
      const existingProduct = await db.collection("products").findOne({ organizationId: activeOrgId });
      if (!existingProduct) {
        const now = Date.now();
        const sampleProducts = [
          {
            organizationId: activeOrgId,
            name: "Signature Everyday Cotton Tee",
            slug: slugify("Signature Everyday Cotton Tee"),
            description: "Crafted from 100% premium breathable cotton. Features a relaxed cut, reinforced stitching, and everyday comfort.",
            images: [
              "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80",
              "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&auto=format&fit=crop&q=80",
            ],
            category: "Apparel",
            collectionIds: [],
            tags: ["featured", "bestseller", "clothing"],
            variants: [
              { id: "v1", label: "Black / Medium", sku: "TEE-BLK-M", priceMinor: 1200000, comparePriceMinor: 1500000, stock: 25, lowStockThreshold: 5 },
              { id: "v2", label: "Black / Large", sku: "TEE-BLK-L", priceMinor: 1200000, comparePriceMinor: 1500000, stock: 18, lowStockThreshold: 5 },
              { id: "v3", label: "White / Medium", sku: "TEE-WHT-M", priceMinor: 1200000, comparePriceMinor: 1500000, stock: 20, lowStockThreshold: 5 },
            ],
            currency: currency || "NGN",
            active: true,
            featured: true,
            createdAt: now,
            updatedAt: now,
          },
          {
            organizationId: activeOrgId,
            name: "Minimalist Canvas Everyday Tote",
            slug: slugify("Minimalist Canvas Everyday Tote"),
            description: "Durable heavyweight canvas tote bag with interior zippered pocket and reinforced double handles.",
            images: [
              "https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&auto=format&fit=crop&q=80",
            ],
            category: "Accessories",
            collectionIds: [],
            tags: ["accessories", "new"],
            variants: [
              { id: "v4", label: "Natural Canvas / Standard", sku: "TOTE-NAT-STD", priceMinor: 850000, stock: 30, lowStockThreshold: 5 },
            ],
            currency: currency || "NGN",
            active: true,
            featured: true,
            createdAt: now,
            updatedAt: now,
          },
        ];
        await db.collection("products").insertMany(sampleProducts as any);
      }

      // Seed default shipping zone if none exists
      const existingZone = await db.collection("shippingZones").findOne({ organizationId: activeOrgId });
      if (!existingZone) {
        await db.collection("shippingZones").insertOne({
          organizationId: activeOrgId,
          name: deliveryCity || "Lagos Mainland",
          rateMinor: 250000, // ₦2,500
          estimatedDeliveryDays: "1-2 business days",
          active: true,
          createdAt: Date.now(),
        } as any);
      }
    } else if (isHybrid) {
      // 🌟 HYBRID CONFIGURATION (Unified Bookings + Ecommerce)
      const preset = getBusinessPreset(businessType);

      await db.collection("organizations").updateOne(orgFilter, {
        $set: {
          name: businessName.trim(),
          slug: finalSlug,
          businessModel: "hybrid",
          businessType: preset.id,
          currency: currency || "NGN",
          terminology: preset.terminology,
          features: {
            bookingsEnabled: true,
            commerceEnabled: true,
            voiceAgentEnabled: true,
            whatsappCommerceEnabled: true,
          },
          updatedAt: Date.now(),
        },
      });

      await db.collection("publicSites").updateMany(
        { organizationId: activeOrgId },
        {
          $set: {
            siteSlug: finalSlug,
            "draft.businessName": businessName.trim(),
            "draft.headline": `Welcome to ${businessName.trim()}`,
            "draft.subheadline": "Book appointments and shop our exclusive products online with automated WhatsApp confirmations.",
            "draft.about": `${businessName.trim()} provides premium services and curated products with seamless online scheduling and direct delivery.`,
            "draft.agent.welcomeMessage": `Hello! Welcome to ${businessName.trim()}. Would you like to book an appointment or browse our products?`,
            updatedAt: Date.now(),
          },
        }
      );

      // Seed sample offerings
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
          currency: currency || "NGN",
          capacity: 1,
          locationIds: [],
          active: true,
          bookableOnline: true,
          createdAt: now,
          updatedAt: now,
        }));
        await db.collection("offerings").insertMany(sampleDocs as any);
      }

      // Seed sample products
      const existingProduct = await db.collection("products").findOne({ organizationId: activeOrgId });
      if (!existingProduct) {
        const now = Date.now();
        const sampleProducts = [
          {
            organizationId: activeOrgId,
            name: `${businessName.trim()} Signature Item`,
            slug: slugify(`${businessName.trim()} Signature Item`),
            description: "Premium retail product available for online order and in-store pickup.",
            images: [
              "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80",
            ],
            category: category || "Retail",
            collectionIds: [],
            tags: ["featured", "popular"],
            variants: [
              { id: "v1", label: "Standard", sku: "PROD-STD", priceMinor: 1500000, stock: 20, lowStockThreshold: 5 },
            ],
            currency: currency || "NGN",
            active: true,
            featured: true,
            createdAt: now,
            updatedAt: now,
          },
        ];
        await db.collection("products").insertMany(sampleProducts as any);
      }

      // Seed default shipping zone
      const existingZone = await db.collection("shippingZones").findOne({ organizationId: activeOrgId });
      if (!existingZone) {
        await db.collection("shippingZones").insertOne({
          organizationId: activeOrgId,
          name: deliveryCity || "Standard Delivery",
          rateMinor: 250000,
          estimatedDeliveryDays: "1-2 business days",
          active: true,
          createdAt: Date.now(),
        } as any);
      }
    } else {
      // 📅 SERVICES CONFIGURATION (Backward compatible)
      const preset = getBusinessPreset(businessType);

      await db.collection("organizations").updateOne(orgFilter, {
        $set: {
          name: businessName.trim(),
          slug: finalSlug,
          businessModel: "services",
          businessType: preset.id,
          currency: currency || "NGN",
          terminology: preset.terminology,
          features: {
            bookingsEnabled: true,
            commerceEnabled: false,
            voiceAgentEnabled: true,
            whatsappCommerceEnabled: false,
          },
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
          currency: currency || "NGN",
          capacity: 1,
          locationIds: [],
          active: true,
          bookableOnline: true,
          createdAt: now,
          updatedAt: now,
        }));
        await db.collection("offerings").insertMany(sampleDocs as any);
      }
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

    return NextResponse.json({
      success: true,
      slug: finalSlug,
      businessName: businessName.trim(),
      businessModel: isEcommerce ? "ecommerce" : isHybrid ? "hybrid" : "services",
    });
  } catch (err) {
    console.error("[onboarding/complete]", err);
    return NextResponse.json({ error: "Failed to configure business workspace." }, { status: 500 });
  }
}
