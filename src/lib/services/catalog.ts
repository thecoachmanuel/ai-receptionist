import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db/mongodb";
import type { DbOffering } from "@/lib/db/types";
import { slugify } from "@/lib/defaults";
import { boundedInteger, optionalTrimmed, requiredTrimmed } from "@/lib/validation";

export async function listOfferings(orgId: string, includeInactive = false) {
  const db = await getDb();
  const filter: Record<string, unknown> = { organizationId: orgId };
  if (!includeInactive) {
    filter.active = true;
  }

  const offerings = await db
    .collection<DbOffering>("offerings")
    .find(filter)
    .sort({ createdAt: 1 })
    .toArray();

  return offerings.map((o: any) => ({
    _id: o._id!.toString(),
    name: o.name,
    slug: o.slug,
    description: o.description,
    category: o.category,
    durationMinutes: o.durationMinutes,
    bufferBeforeMinutes: o.bufferBeforeMinutes,
    bufferAfterMinutes: o.bufferAfterMinutes,
    priceMinor: o.priceMinor,
    currency: o.currency,
    capacity: o.capacity,
    active: o.active,
    bookableOnline: o.bookableOnline,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  }));
}

export async function createOffering(
  orgId: string,
  currency: string,
  args: {
    name: string;
    description?: string;
    category?: string;
    durationMinutes: number;
    bufferBeforeMinutes?: number;
    bufferAfterMinutes?: number;
    priceMinor: number;
    capacity?: number;
    active?: boolean;
    bookableOnline?: boolean;
  },
) {
  const db = await getDb();
  const name = requiredTrimmed(args.name, "name", 120);
  const preferredSlug = slugify(name);
  const existingSlug = await db
    .collection<DbOffering>("offerings")
    .findOne({ organizationId: orgId, slug: preferredSlug });
  const slug = existingSlug
    ? `${preferredSlug}-${Math.random().toString(36).slice(-4)}`
    : preferredSlug;

  const now = Date.now();
  const newOffering: DbOffering = {
    organizationId: orgId,
    name,
    slug,
    description: optionalTrimmed(args.description, "description", 1_000) ?? "",
    category: optionalTrimmed(args.category, "category", 80) ?? "General",
    durationMinutes: boundedInteger(args.durationMinutes, "durationMinutes", 5, 1_440),
    bufferBeforeMinutes: boundedInteger(args.bufferBeforeMinutes ?? 0, "bufferBeforeMinutes", 0, 240),
    bufferAfterMinutes: boundedInteger(args.bufferAfterMinutes ?? 0, "bufferAfterMinutes", 0, 240),
    priceMinor: boundedInteger(args.priceMinor, "priceMinor", 0, 100_000_000),
    currency,
    capacity: boundedInteger(args.capacity ?? 1, "capacity", 1, 500),
    active: args.active ?? true,
    bookableOnline: args.bookableOnline ?? true,
    createdAt: now,
    updatedAt: now,
  };

  const result = await db.collection<DbOffering>("offerings").insertOne(newOffering);
  return {
    ...newOffering,
    _id: result.insertedId.toString(),
  };
}

export async function updateOffering(
  orgId: string,
  offeringId: string,
  args: {
    name?: string;
    description?: string;
    category?: string;
    durationMinutes?: number;
    bufferBeforeMinutes?: number;
    bufferAfterMinutes?: number;
    priceMinor?: number;
    capacity?: number;
    active?: boolean;
    bookableOnline?: boolean;
  },
) {
  const db = await getDb();
  const filter = {
    _id: new ObjectId(offeringId),
    organizationId: orgId,
  };
  const offering = await db.collection<DbOffering>("offerings").findOne(filter);
  if (!offering) throw new Error("Offering not found.");

  const updates: Partial<DbOffering> = { updatedAt: Date.now() };
  if (args.name !== undefined) updates.name = requiredTrimmed(args.name, "name", 120);
  if (args.description !== undefined) updates.description = optionalTrimmed(args.description, "description", 1_000) ?? "";
  if (args.category !== undefined) updates.category = optionalTrimmed(args.category, "category", 80) ?? "General";
  if (args.durationMinutes !== undefined) updates.durationMinutes = boundedInteger(args.durationMinutes, "durationMinutes", 5, 1_440);
  if (args.bufferBeforeMinutes !== undefined) updates.bufferBeforeMinutes = boundedInteger(args.bufferBeforeMinutes, "bufferBeforeMinutes", 0, 240);
  if (args.bufferAfterMinutes !== undefined) updates.bufferAfterMinutes = boundedInteger(args.bufferAfterMinutes, "bufferAfterMinutes", 0, 240);
  if (args.priceMinor !== undefined) updates.priceMinor = boundedInteger(args.priceMinor, "priceMinor", 0, 100_000_000);
  if (args.capacity !== undefined) updates.capacity = boundedInteger(args.capacity, "capacity", 1, 500);
  if (args.active !== undefined) updates.active = args.active;
  if (args.bookableOnline !== undefined) updates.bookableOnline = args.bookableOnline;

  await db.collection<DbOffering>("offerings").updateOne(filter, { $set: updates });

  const updated = await db.collection<DbOffering>("offerings").findOne(filter);
  return {
    ...updated!,
    _id: updated!._id!.toString(),
  };
}
