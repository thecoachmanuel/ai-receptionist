import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db/mongodb";
import type { DbLocation } from "@/lib/db/types";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function listLocations(organizationId: string, includeInactive = false) {
  const db = await getDb();
  const filter: any = { organizationId };
  if (!includeInactive) filter.active = true;

  const locations = await db
    .collection<DbLocation>("locations")
    .find(filter)
    .sort({ isPrimary: -1, name: 1 })
    .toArray();

  return locations.map((loc) => ({
    ...loc,
    _id: loc._id!.toString(),
  }));
}

export async function getLocationById(organizationId: string, locationId: string) {
  const db = await getDb();
  const loc = await db.collection<DbLocation>("locations").findOne({
    _id: new ObjectId(locationId),
    organizationId,
  });
  if (!loc) return null;
  return { ...loc, _id: loc._id!.toString() };
}

export async function createLocation(
  organizationId: string,
  input: {
    name: string;
    address: string;
    city: string;
    phone?: string;
    email?: string;
    isPrimary?: boolean;
  },
) {
  const db = await getDb();
  const now = Date.now();
  const baseSlug = slugify(input.name) || "branch";
  let slug = baseSlug;
  let counter = 1;

  while (await db.collection<DbLocation>("locations").findOne({ organizationId, slug })) {
    slug = `${baseSlug}-${counter++}`;
  }

  // If this is set to primary, unset previous primary
  if (input.isPrimary) {
    await db
      .collection<DbLocation>("locations")
      .updateMany({ organizationId }, { $set: { isPrimary: false } });
  } else {
    // If it's the first location for this org, make it primary automatically
    const count = await db.collection<DbLocation>("locations").countDocuments({ organizationId });
    if (count === 0) input.isPrimary = true;
  }

  const doc: DbLocation = {
    organizationId,
    name: input.name.trim(),
    slug,
    address: input.address.trim(),
    city: input.city.trim(),
    phone: input.phone?.trim(),
    email: input.email?.trim(),
    active: true,
    isPrimary: Boolean(input.isPrimary),
    createdAt: now,
    updatedAt: now,
  };

  const res = await db.collection<DbLocation>("locations").insertOne(doc);
  return {
    ...doc,
    _id: res.insertedId.toString(),
  };
}

export async function updateLocation(
  organizationId: string,
  locationId: string,
  input: Partial<{
    name: string;
    address: string;
    city: string;
    phone?: string;
    email?: string;
    active: boolean;
    isPrimary: boolean;
  }>,
) {
  const db = await getDb();
  const filter = { _id: new ObjectId(locationId), organizationId };
  const existing = await db.collection<DbLocation>("locations").findOne(filter);
  if (!existing) throw new Error("Location not found.");

  if (input.isPrimary) {
    await db
      .collection<DbLocation>("locations")
      .updateMany({ organizationId }, { $set: { isPrimary: false } });
  }

  const updates: Partial<DbLocation> = {
    updatedAt: Date.now(),
  };

  if (input.name !== undefined) updates.name = input.name.trim();
  if (input.address !== undefined) updates.address = input.address.trim();
  if (input.city !== undefined) updates.city = input.city.trim();
  if (input.phone !== undefined) updates.phone = input.phone?.trim();
  if (input.email !== undefined) updates.email = input.email?.trim();
  if (input.active !== undefined) updates.active = Boolean(input.active);
  if (input.isPrimary !== undefined) updates.isPrimary = Boolean(input.isPrimary);

  await db.collection<DbLocation>("locations").updateOne(filter, { $set: updates });
  return getLocationById(organizationId, locationId);
}

export async function deleteLocation(organizationId: string, locationId: string) {
  const db = await getDb();
  const filter = { _id: new ObjectId(locationId), organizationId };
  const res = await db.collection<DbLocation>("locations").deleteOne(filter);
  return res.deletedCount > 0;
}
