import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db/mongodb";
import type { DbTeamMember } from "@/lib/db/types";
import { boundedInteger, normalizedEmail, normalizedPhone, optionalTrimmed, requiredTrimmed } from "@/lib/validation";

export async function listMembers(orgId: string, includeInactive = false) {
  const db = await getDb();
  const filter: Record<string, unknown> = { organizationId: orgId };
  if (!includeInactive) {
    filter.active = true;
  }

  const members = await db
    .collection<DbTeamMember>("teamMembers")
    .find(filter)
    .sort({ sortOrder: 1, createdAt: 1 })
    .toArray();

  return members.map((m) => ({
    _id: m._id!.toString(),
    name: m.name,
    title: m.title,
    email: m.email,
    phone: m.phone,
    bio: m.bio,
    imageUrl: m.imageUrl,
    offeringIds: m.offeringIds || [],
    active: m.active,
    acceptingBookings: m.acceptingBookings,
    sortOrder: m.sortOrder,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  }));
}

export async function createMember(
  orgId: string,
  args: {
    name: string;
    title?: string;
    bio?: string;
    email?: string;
    phone?: string;
    imageUrl?: string;
    offeringIds: string[];
    active?: boolean;
    acceptingBookings?: boolean;
    sortOrder?: number;
  },
) {
  const db = await getDb();
  const now = Date.now();
  const name = requiredTrimmed(args.name, "name", 120);

  const newMember: DbTeamMember = {
    organizationId: orgId,
    name,
    title: optionalTrimmed(args.title, "title", 100) ?? "Team Member",
    bio: optionalTrimmed(args.bio, "bio", 2_000) ?? "",
    email: normalizedEmail(args.email),
    phone: normalizedPhone(args.phone),
    imageUrl: optionalTrimmed(args.imageUrl, "imageUrl", 2_000),
    offeringIds: args.offeringIds || [],
    active: args.active ?? true,
    acceptingBookings: args.acceptingBookings ?? true,
    sortOrder: boundedInteger(args.sortOrder ?? 0, "sortOrder", 0, 10_000),
    createdAt: now,
    updatedAt: now,
  };

  const result = await db.collection<DbTeamMember>("teamMembers").insertOne(newMember);
  return {
    ...newMember,
    _id: result.insertedId.toString(),
  };
}

export async function updateMember(
  orgId: string,
  teamMemberId: string,
  args: {
    name?: string;
    title?: string;
    bio?: string;
    email?: string;
    phone?: string;
    imageUrl?: string;
    offeringIds?: string[];
    active?: boolean;
    acceptingBookings?: boolean;
    sortOrder?: number;
  },
) {
  const db = await getDb();
  const filter = {
    _id: new ObjectId(teamMemberId),
    organizationId: orgId,
  };
  const member = await db.collection<DbTeamMember>("teamMembers").findOne(filter);
  if (!member) throw new Error("Team member not found.");

  const updates: Partial<DbTeamMember> = { updatedAt: Date.now() };
  if (args.name !== undefined) updates.name = requiredTrimmed(args.name, "name", 120);
  if (args.title !== undefined) updates.title = optionalTrimmed(args.title, "title", 100) ?? "Team Member";
  if (args.bio !== undefined) updates.bio = optionalTrimmed(args.bio, "bio", 2_000) ?? "";
  if (args.email !== undefined) updates.email = normalizedEmail(args.email);
  if (args.phone !== undefined) updates.phone = normalizedPhone(args.phone);
  if (args.imageUrl !== undefined) updates.imageUrl = optionalTrimmed(args.imageUrl, "imageUrl", 2_000);
  if (args.offeringIds !== undefined) updates.offeringIds = args.offeringIds;
  if (args.active !== undefined) updates.active = args.active;
  if (args.acceptingBookings !== undefined) updates.acceptingBookings = args.acceptingBookings;
  if (args.sortOrder !== undefined) updates.sortOrder = boundedInteger(args.sortOrder, "sortOrder", 0, 10_000);

  await db.collection<DbTeamMember>("teamMembers").updateOne(filter, { $set: updates });

  const updated = await db.collection<DbTeamMember>("teamMembers").findOne(filter);
  return {
    ...updated!,
    _id: updated!._id!.toString(),
  };
}
