import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db/mongodb";
import type { DbAgentIntegration, DbOrganization, DbPublicSite, DbRateLimit } from "@/lib/db/types";

export async function getCurrentAgent(orgId: string) {
  const db = await getDb();
  const integration = await db.collection<DbAgentIntegration>("agentIntegrations").findOne({
    organizationId: orgId,
    provider: "elevenlabs",
  });

  return {
    provider: "elevenlabs" as const,
    integration: integration
      ? {
          _id: integration._id!.toString(),
          webEnabled: integration.webEnabled,
          updatedAt: integration.updatedAt,
        }
      : null,
  };
}

export async function requestPublicSession(
  siteSlug: string,
  clientKey: string,
  mode: "text" | "voice" | "widget",
) {
  const db = await getDb();
  const slug = siteSlug.trim().toLowerCase();
  const site = await db.collection<DbPublicSite>("publicSites").findOne({ siteSlug: slug });

  if (
    !site?.published ||
    !site.publishedAt ||
    (mode === "text" && !site.published.agent.showWebChat) ||
    (mode === "voice" && !site.published.agent.showVoiceChat) ||
    (mode === "widget" && !site.published.agent.showElevenLabsWidget)
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

  // Check rate limit: 10 sessions per 5 minutes per clientKey
  const now = Date.now();
  const windowMs = 5 * 60 * 1000;
  const windowStart = Math.floor(now / windowMs) * windowMs;

  const rateLimit = await db.collection<DbRateLimit>("agentSessionRateLimits").findOne({
    organizationId: effectiveOrgId,
    publicSiteId: site._id!.toString(),
    scopeKey: clientKey,
    windowStart,
  });

  if (rateLimit && rateLimit.count >= 10) {
    throw new Error("Too many concierge sessions. Please wait a moment and try again.");
  }

  if (rateLimit) {
    await db.collection<DbRateLimit>("agentSessionRateLimits").updateOne(
      { _id: rateLimit._id },
      { $inc: { count: 1 } },
    );
  } else {
    await db.collection<DbRateLimit>("agentSessionRateLimits").insertOne({
      organizationId: effectiveOrgId,
      publicSiteId: site._id!.toString(),
      scopeKey: clientKey,
      windowStart,
      count: 1,
      expiresAt: windowStart + windowMs * 2,
    });
  }

  return {
    clerkOrgId: organization.clerkOrgId,
    siteSlug: site.siteSlug,
  };
}
