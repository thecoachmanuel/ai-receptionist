import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db/mongodb";
import type { DbAvailabilityRule, DbOrganization } from "@/lib/db/types";
import { boundedInteger } from "@/lib/validation";

export async function listRules(orgId: string, teamMemberId?: string) {
  const db = await getDb();
  const filter: Record<string, unknown> = { organizationId: orgId };
  if (teamMemberId) {
    filter.teamMemberId = teamMemberId;
  }

  const rules = await db
    .collection<DbAvailabilityRule>("availabilityRules")
    .find(filter)
    .sort({ dayOfWeek: 1, startMinute: 1 })
    .toArray();

  return rules.map((r) => ({
    _id: r._id!.toString(),
    teamMemberId: r.teamMemberId,
    timezone: r.timezone,
    dayOfWeek: r.dayOfWeek,
    startMinute: r.startMinute,
    endMinute: r.endMinute,
    active: r.active,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
}

export async function replaceMemberRules(
  orgId: string,
  teamMemberId: string,
  rulesInput: Array<{
    dayOfWeek: number;
    startMinute: number;
    endMinute: number;
    active?: boolean;
  }>,
) {
  const db = await getDb();
  const orgFilter = ObjectId.isValid(orgId) ? { _id: new ObjectId(orgId) } : { clerkOrgId: orgId };
  const org = await db.collection<DbOrganization>("organizations").findOne(orgFilter);
  const timezone = org?.timezone || "UTC";

  // Validate rule bounds
  for (const r of rulesInput) {
    boundedInteger(r.dayOfWeek, "dayOfWeek", 0, 6);
    boundedInteger(r.startMinute, "startMinute", 0, 1_439);
    boundedInteger(r.endMinute, "endMinute", 1, 1_440);
    if (r.startMinute >= r.endMinute) {
      throw new Error("startMinute must be strictly less than endMinute.");
    }
  }

  // Clear existing rules for this team member
  await db.collection<DbAvailabilityRule>("availabilityRules").deleteMany({
    organizationId: orgId,
    teamMemberId,
  });

  const now = Date.now();
  const newRules: DbAvailabilityRule[] = rulesInput.map((r) => ({
    organizationId: orgId,
    teamMemberId,
    timezone,
    dayOfWeek: r.dayOfWeek,
    startMinute: r.startMinute,
    endMinute: r.endMinute,
    active: r.active ?? true,
    createdAt: now,
    updatedAt: now,
  }));

  if (newRules.length > 0) {
    await db.collection<DbAvailabilityRule>("availabilityRules").insertMany(newRules);
  }

  return listRules(orgId, teamMemberId);
}
