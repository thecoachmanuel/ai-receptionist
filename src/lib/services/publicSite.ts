import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db/mongodb";
import type { DbAgentIntegration, DbKnowledgeItem, DbOffering, DbOrganization, DbPublicSite, DbTeamMember, SiteConfig } from "@/lib/db/types";
import { defaultSiteConfig, slugify } from "@/lib/defaults";
import { sanitizeSiteConfig } from "@/lib/siteConfig";
import { requiredTrimmed } from "@/lib/validation";

export async function getPublishedBySlug(siteSlug: string) {
  const db = await getDb();
  const normalizedSlug = siteSlug.trim().toLowerCase();

  let site = await db.collection<DbPublicSite>("publicSites").findOne({
    siteSlug: normalizedSlug,
  });

  let organization: DbOrganization | null = null;

  if (site) {
    const orgId = site.organizationId;
    const orgFilter = ObjectId.isValid(orgId) ? { _id: new ObjectId(orgId) } : { clerkOrgId: orgId };
    organization = await db.collection<DbOrganization>("organizations").findOne(orgFilter);
  }

  if (!organization) {
    organization = await db.collection<DbOrganization>("organizations").findOne({
      $or: [{ slug: normalizedSlug }, { clerkOrgId: normalizedSlug }],
    });
  }

  if (!organization) return null;

  const effectiveOrgId = organization._id!.toString();

  if (!site) {
    site = await db.collection<DbPublicSite>("publicSites").findOne({
      organizationId: effectiveOrgId,
    });
  }

  const now = Date.now();
  if (!site) {
    const defaultConfig = defaultSiteConfig(organization.name);
    const newSiteDoc: DbPublicSite = {
      organizationId: effectiveOrgId,
      siteSlug: organization.slug || normalizedSlug,
      draft: defaultConfig,
      published: defaultConfig,
      publishedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    const res = await db.collection<DbPublicSite>("publicSites").insertOne(newSiteDoc);
    site = { ...newSiteDoc, _id: res.insertedId };
  } else if (!site.published || !site.publishedAt) {
    const publishedConfig = site.draft || defaultSiteConfig(organization.name);
    await db.collection<DbPublicSite>("publicSites").updateOne(
      { _id: site._id as any },
      { $set: { published: publishedConfig, publishedAt: now, updatedAt: now } },
    );
    site.published = publishedConfig;
    site.publishedAt = now;
  }

  const [offerings, teamMembers, knowledgeItems] = await Promise.all([
    db
      .collection<DbOffering>("offerings")
      .find({ organizationId: effectiveOrgId, active: true })
      .limit(200)
      .toArray(),
    db
      .collection<DbTeamMember>("teamMembers")
      .find({ organizationId: effectiveOrgId, active: true })
      .sort({ sortOrder: 1 })
      .limit(200)
      .toArray(),
    db
      .collection<DbKnowledgeItem>("knowledgeItems")
      .find({ organizationId: effectiveOrgId, published: true })
      .sort({ sortOrder: 1 })
      .limit(200)
      .toArray(),
  ]);

  return {
    site: {
      _id: site._id!.toString(),
      siteSlug: site.siteSlug,
      config: site.published,
      publishedAt: site.publishedAt,
    },
    organization: {
      clerkOrgId: organization.clerkOrgId,
      name: organization.name,
      slug: organization.slug,
      timezone: organization.timezone,
      currency: organization.currency,
      locale: organization.locale,
      terminology: organization.terminology,
    },
    offerings: offerings
      .filter((o: any) => o.bookableOnline)
      .map((o: any) => ({
        _id: o._id!.toString(),
        name: o.name,
        slug: o.slug,
        description: o.description,
        category: o.category,
        durationMinutes: o.durationMinutes,
        priceMinor: o.priceMinor,
        currency: o.currency,
        active: o.active,
      })),
    teamMembers: teamMembers
      .filter((m: any) => m.acceptingBookings)
      .map((m: any) => ({
        _id: m._id!.toString(),
        name: m.name,
        title: m.title,
        bio: m.bio,
        imageUrl: m.imageUrl,
        offeringIds: m.offeringIds || [],
        active: m.active,
      })),
    knowledgeItems: knowledgeItems.map((k: any) => ({
      _id: k._id!.toString(),
      title: k.title,
      content: k.content,
      category: k.category,
    })),
  };
}

export async function getAgentSessionConfig(siteSlug: string) {
  const db = await getDb();
  const slug = siteSlug.trim().toLowerCase();
  const site = await db.collection<DbPublicSite>("publicSites").findOne({ siteSlug: slug });
  if (
    !site?.published ||
    !site.publishedAt ||
    (!site.published.agent.showWebChat &&
      !site.published.agent.showVoiceChat &&
      !site.published.agent.showElevenLabsWidget)
  ) {
    return null;
  }

  const orgId = site.organizationId;
  const orgFilter = ObjectId.isValid(orgId) ? { _id: new ObjectId(orgId) } : { clerkOrgId: orgId };
  const organization = await db.collection<DbOrganization>("organizations").findOne(orgFilter);
  if (!organization) return null;

  const effectiveOrgId = organization._id!.toString();
  const integration = await db.collection<DbAgentIntegration>("agentIntegrations").findOne({
    organizationId: effectiveOrgId,
    provider: "elevenlabs",
  });

  if (!integration?.webEnabled) return null;

  return {
    clerkOrgId: organization.clerkOrgId,
    siteSlug: site.siteSlug,
    organizationId: effectiveOrgId,
  };
}

export async function getCurrentDraft(orgId: string) {
  const db = await getDb();
  const site = await db.collection<DbPublicSite>("publicSites").findOne({ organizationId: orgId });
  const orgFilter = ObjectId.isValid(orgId) ? { _id: new ObjectId(orgId) } : { clerkOrgId: orgId };
  const organization = await db.collection<DbOrganization>("organizations").findOne(orgFilter);

  if (!site || !organization) throw new Error("Public site not initialized.");

  return {
    site: {
      _id: site._id!.toString(),
      siteSlug: site.siteSlug,
      draft: site.draft,
      published: site.published,
      publishedAt: site.publishedAt,
      updatedAt: site.updatedAt,
    },
    organization: {
      name: organization.name,
      timezone: organization.timezone,
      currency: organization.currency,
      locale: organization.locale,
      terminology: organization.terminology,
    },
  };
}

export async function updateDraft(orgId: string, config: SiteConfig, requestedSlug?: string) {
  const db = await getDb();
  const site = await db.collection<DbPublicSite>("publicSites").findOne({ organizationId: orgId });
  if (!site) throw new Error("Public site not initialized.");

  let siteSlug = site.siteSlug;
  if (requestedSlug !== undefined) {
    siteSlug = slugify(requiredTrimmed(requestedSlug, "siteSlug", 80));
    const existing = await db.collection<DbPublicSite>("publicSites").findOne({ siteSlug });
    if (existing && existing._id!.toString() !== site._id!.toString()) {
      throw new Error("That public site slug is already in use.");
    }
  }

  const sanitized = sanitizeSiteConfig(config);
  const now = Date.now();

  await db.collection<DbPublicSite>("publicSites").updateOne(
    { _id: site._id },
    { $set: { siteSlug, draft: sanitized, updatedAt: now } },
  );

  return { _id: site._id!.toString() };
}

export async function publish(orgId: string) {
  const db = await getDb();
  const site = await db.collection<DbPublicSite>("publicSites").findOne({ organizationId: orgId });
  if (!site) throw new Error("Public site not initialized.");

  const now = Date.now();
  await db.collection<DbPublicSite>("publicSites").updateOne(
    { _id: site._id },
    { $set: { published: site.draft, publishedAt: now, updatedAt: now } },
  );

  return {
    siteSlug: site.siteSlug,
    publishedAt: now,
    config: site.draft,
  };
}
