import { ObjectId } from "mongodb";
import { hashPassword } from "@/lib/auth/password";
import { getDb } from "@/lib/db/mongodb";
import type { DbOrgMember, DbTeamMember, DbUser } from "@/lib/db/types";
import { boundedInteger, normalizedEmail, normalizedPhone, optionalTrimmed, requiredTrimmed } from "@/lib/validation";

export async function listMembers(
  orgId: string,
  includeInactive = false,
  locationId?: string,
) {
  const db = await getDb();
  const filter: Record<string, unknown> = { organizationId: orgId };
  if (!includeInactive) {
    filter.active = true;
  }
  if (locationId) {
    filter.$or = [
      { locationIds: locationId },
      { locationIds: { $exists: false } },
      { locationIds: { $size: 0 } },
    ];
  }

  const members = await db
    .collection<DbTeamMember>("teamMembers")
    .find(filter)
    .sort({ sortOrder: 1, createdAt: 1 })
    .toArray();

  return members.map((m: any) => ({
    _id: m._id!.toString(),
    name: m.name,
    title: m.title,
    email: m.email,
    phone: m.phone,
    bio: m.bio,
    imageUrl: m.imageUrl,
    offeringIds: m.offeringIds || [],
    locationIds: m.locationIds || [],
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
    password?: string;
    imageUrl?: string;
    offeringIds: string[];
    locationIds?: string[];
    active?: boolean;
    acceptingBookings?: boolean;
    sortOrder?: number;
  },
) {
  const db = await getDb();
  const now = Date.now();
  const name = requiredTrimmed(args.name, "name", 120);
  const email = normalizedEmail(args.email);

  let userId: string | undefined = undefined;

  // Handle staff login password & user account creation
  if (args.password && email) {
    const pass = args.password.trim();
    if (pass.length < 6) {
      throw new Error("Staff login password must be at least 6 characters.");
    }
    const passwordHash = await hashPassword(pass);
    const escapedEmail = email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    
    let existingUser = await db.collection<DbUser>("users").findOne({
      email: { $regex: `^${escapedEmail}$`, $options: "i" },
    });

    if (existingUser) {
      userId = existingUser._id!.toString();
      await db.collection<DbUser>("users").updateOne(
        { _id: existingUser._id },
        { $set: { passwordHash, activeOrgId: orgId, updatedAt: now } },
      );
    } else {
      const newUserResult = await db.collection<DbUser>("users").insertOne({
        email,
        passwordHash,
        name,
        activeOrgId: orgId,
        createdAt: now,
        updatedAt: now,
      });
      userId = newUserResult.insertedId.toString();
    }
  }

  const newMember: DbTeamMember = {
    organizationId: orgId,
    userId,
    name,
    title: optionalTrimmed(args.title, "title", 100) ?? "Team Member",
    bio: optionalTrimmed(args.bio, "bio", 2_000) ?? "",
    email,
    phone: normalizedPhone(args.phone),
    imageUrl: optionalTrimmed(args.imageUrl, "imageUrl", 2_000),
    offeringIds: args.offeringIds || [],
    locationIds: args.locationIds || [],
    active: args.active ?? true,
    acceptingBookings: args.acceptingBookings ?? true,
    sortOrder: boundedInteger(args.sortOrder ?? 0, "sortOrder", 0, 10_000),
    createdAt: now,
    updatedAt: now,
  };

  const result = await db.collection<DbTeamMember>("teamMembers").insertOne(newMember);
  const teamMemberId = result.insertedId.toString();

  if (userId) {
    await db.collection<DbOrgMember>("orgMembers").updateOne(
      { organizationId: orgId, userId },
      {
        $set: {
          organizationId: orgId,
          userId,
          role: "member",
          teamMemberId,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );
  }

  return {
    ...newMember,
    _id: teamMemberId,
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
    password?: string;
    imageUrl?: string;
    offeringIds?: string[];
    locationIds?: string[];
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

  const now = Date.now();
  const updates: Partial<DbTeamMember> = { updatedAt: now };

  if (args.name !== undefined) updates.name = requiredTrimmed(args.name, "name", 120);
  if (args.title !== undefined) updates.title = optionalTrimmed(args.title, "title", 100) ?? "Team Member";
  if (args.bio !== undefined) updates.bio = optionalTrimmed(args.bio, "bio", 2_000) ?? "";
  if (args.email !== undefined) updates.email = normalizedEmail(args.email);
  if (args.phone !== undefined) updates.phone = normalizedPhone(args.phone);
  if (args.imageUrl !== undefined) updates.imageUrl = optionalTrimmed(args.imageUrl, "imageUrl", 2_000);
  if (args.offeringIds !== undefined) updates.offeringIds = args.offeringIds;
  if (args.locationIds !== undefined) updates.locationIds = args.locationIds;
  if (args.active !== undefined) updates.active = args.active;
  if (args.acceptingBookings !== undefined) updates.acceptingBookings = args.acceptingBookings;
  if (args.sortOrder !== undefined) updates.sortOrder = boundedInteger(args.sortOrder, "sortOrder", 0, 10_000);

  const targetEmail = updates.email || member.email;

  // Handle password update if passed
  if (args.password && targetEmail) {
    const pass = args.password.trim();
    if (pass.length < 6) {
      throw new Error("Staff login password must be at least 6 characters.");
    }
    const passwordHash = await hashPassword(pass);
    const escapedEmail = targetEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    let existingUser = await db.collection<DbUser>("users").findOne({
      email: { $regex: `^${escapedEmail}$`, $options: "i" },
    });

    let userId = member.userId || existingUser?._id?.toString();

    if (existingUser) {
      userId = existingUser._id!.toString();
      await db.collection<DbUser>("users").updateOne(
        { _id: existingUser._id },
        { $set: { passwordHash, activeOrgId: orgId, updatedAt: now } },
      );
    } else {
      const newUserResult = await db.collection<DbUser>("users").insertOne({
        email: targetEmail,
        passwordHash,
        name: updates.name || member.name,
        activeOrgId: orgId,
        createdAt: now,
        updatedAt: now,
      });
      userId = newUserResult.insertedId.toString();
    }

    updates.userId = userId;

    await db.collection<DbOrgMember>("orgMembers").updateOne(
      { organizationId: orgId, userId },
      {
        $set: {
          organizationId: orgId,
          userId,
          role: "member",
          teamMemberId,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );
  }

  await db.collection<DbTeamMember>("teamMembers").updateOne(filter, { $set: updates });

  const updated = await db.collection<DbTeamMember>("teamMembers").findOne(filter);
  return {
    ...updated!,
    _id: updated!._id!.toString(),
  };
}

export async function deleteMember(orgId: string, teamMemberId: string) {
  const db = await getDb();
  const filter = ObjectId.isValid(teamMemberId)
    ? { organizationId: orgId, _id: new ObjectId(teamMemberId) }
    : { organizationId: orgId, _id: teamMemberId as any };

  const member = await db.collection<DbTeamMember>("teamMembers").findOne(filter);
  if (!member) return false;

  const userId = member.userId;

  // Delete team member record
  await db.collection("teamMembers").deleteOne(filter);

  // If staff member has a linked user account, delete memberships and clear activeOrgId
  if (userId) {
    const userObjectId = ObjectId.isValid(userId) ? new ObjectId(userId) : userId;
    await Promise.all([
      db.collection("orgMembers").deleteMany({ organizationId: orgId, userId: { $in: [userId, userObjectId as any] } }),
      db.collection("organization_members").deleteMany({ organizationId: orgId, userId: { $in: [userId, userObjectId as any] } }),
      db.collection("users").updateMany(
        {
          $or: [{ _id: userId as any }, { _id: userObjectId as any }],
          activeOrgId: orgId,
        },
        { $unset: { activeOrgId: "" }, $set: { updatedAt: Date.now() } }
      ),
    ]);
  }

  return true;
}
