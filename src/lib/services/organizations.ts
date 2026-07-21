import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db/mongodb";
import type { DbAgentIntegration, DbOrgMember, DbOrganization, DbPublicSite } from "@/lib/db/types";
import { DEFAULT_TERMINOLOGY, defaultSiteConfig, slugify } from "@/lib/defaults";
import { assertIanaTimezone } from "@/lib/time";
import { optionalTrimmed, requiredTrimmed } from "@/lib/validation";

export async function viewOrganization(org: DbOrganization, role?: string) {
  return {
    _id: org._id?.toString() || org.clerkOrgId,
    clerkOrgId: org.clerkOrgId,
    name: org.name,
    slug: org.slug,
    timezone: org.timezone,
    currency: org.currency,
    locale: org.locale,
    terminology: org.terminology,
    plan: org.plan || "free_org",
    planStatus: org.planStatus || "active",
    role,
    createdAt: org.createdAt,
    updatedAt: org.updatedAt,
  };
}

export async function getOrganizationByIdOrSlug(idOrSlug: string) {
  const db = await getDb();
  let org: DbOrganization | null = null;
  if (ObjectId.isValid(idOrSlug)) {
    org = await db
      .collection<DbOrganization>("organizations")
      .findOne({ _id: new ObjectId(idOrSlug) });
  }
  if (!org) {
    org = await db
      .collection<DbOrganization>("organizations")
      .findOne({ slug: idOrSlug });
  }
  if (!org) {
    org = await db
      .collection<DbOrganization>("organizations")
      .findOne({ clerkOrgId: idOrSlug });
  }
  return org;
}

export async function getUserOrganizations(userId: string) {
  const db = await getDb();
  const members = await db
    .collection<DbOrgMember>("orgMembers")
    .find({ userId })
    .toArray();

  const orgIds = members
    .map((m) => (ObjectId.isValid(m.organizationId) ? new ObjectId(m.organizationId) : null))
    .filter((id): id is ObjectId => id !== null);

  const orgs = await db
    .collection<DbOrganization>("organizations")
    .find({ _id: { $in: orgIds } })
    .toArray();

  const memberRoleMap = new Map(members.map((m) => [m.organizationId, m.role]));

  return orgs.map((org) => ({
    id: org._id!.toString(),
    clerkOrgId: org.clerkOrgId,
    name: org.name,
    slug: org.slug,
    role: memberRoleMap.get(org._id!.toString()) || "member",
  }));
}

export async function createOrganizationForUser(
  userId: string,
  rawName: string,
  rawTimezone?: string,
  rawCurrency?: string,
  rawLocale?: string,
) {
  const db = await getDb();
  const name = requiredTrimmed(rawName, "name", 120);
  const timezone = optionalTrimmed(rawTimezone, "timezone", 100) ?? "UTC";
  assertIanaTimezone(timezone);
  const currency = (rawCurrency ?? "USD").trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error("currency must be a three-letter ISO 4217 code.");
  }
  const locale = optionalTrimmed(rawLocale, "locale", 35) ?? "en-US";
  try {
    new Intl.Locale(locale);
  } catch {
    throw new Error(`Invalid locale: "${locale}".`);
  }

  const preferredSlug = slugify(name);
  const existingSlug = await db
    .collection<DbOrganization>("organizations")
    .findOne({ slug: preferredSlug });
  const uniqueSuffix = randomHex(6);
  const slug = existingSlug ? `${preferredSlug}-${uniqueSuffix}` : preferredSlug;
  const clerkOrgId = `org_${slugify(name).replace(/-/g, "_")}_${uniqueSuffix}`;
  const now = Date.now();
  const defaultAgentId = process.env.ELEVENLABS_DEFAULT_AGENT_ID?.trim();

  const newOrg: DbOrganization = {
    clerkOrgId,
    name,
    slug,
    timezone,
    currency,
    locale,
    terminology: DEFAULT_TERMINOLOGY,
    plan: "free_org",
    planStatus: "active",
    createdAt: now,
    updatedAt: now,
  };

  const insertResult = await db
    .collection<DbOrganization>("organizations")
    .insertOne(newOrg);
  const orgId = insertResult.insertedId.toString();

  await db.collection<DbOrgMember>("orgMembers").insertOne({
    organizationId: orgId,
    userId,
    role: "admin",
    createdAt: now,
    updatedAt: now,
  });

  await db.collection<DbPublicSite>("publicSites").insertOne({
    organizationId: orgId,
    siteSlug: slug,
    draft: defaultSiteConfig(name),
    createdAt: now,
    updatedAt: now,
  });

  await db.collection<DbAgentIntegration>("agentIntegrations").insertOne({
    organizationId: orgId,
    provider: "elevenlabs",
    ...(defaultAgentId ? { webAgentId: defaultAgentId } : {}),
    webEnabled: Boolean(defaultAgentId),
    createdAt: now,
    updatedAt: now,
  });

  return {
    ...newOrg,
    _id: orgId,
  };
}

export async function updateOrganizationPlan(orgId: string, plan: "free_org" | "engage" | "voice") {
  const db = await getDb();
  const filter = ObjectId.isValid(orgId) ? { _id: new ObjectId(orgId) } : { clerkOrgId: orgId };
  await db.collection<DbOrganization>("organizations").updateOne(filter, {
    $set: { plan, planStatus: "active", updatedAt: Date.now() },
  });
}

function randomHex(length: number): string {
  const bytes = new Uint8Array(length / 2);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
