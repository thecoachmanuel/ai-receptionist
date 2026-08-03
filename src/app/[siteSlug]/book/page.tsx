import { cache } from "react";
import { notFound } from "next/navigation";
import { PublicSite } from "@/components/public-site/public-site";
import { PublicSiteUnavailable } from "@/components/public-site/public-site-states";
import { organizationHasFeature } from "@/lib/billing";
import * as publicSiteService from "@/lib/services/publicSite";
import { getElevenLabsSettings } from "@/lib/services/settings";

export const revalidate = 0;

const getPublishedSite = cache((siteSlug: string) =>
  publicSiteService.getPublishedBySlug(siteSlug),
);

const getAgentSessionConfig = cache((siteSlug: string) =>
  publicSiteService.getAgentSessionConfig(siteSlug),
);

const getAgentFeatures = cache(async (orgIdOrClerkId?: string) => {
  if (!orgIdOrClerkId) return { text: false, voice: false };
  const [text, voice] = await Promise.all([
    organizationHasFeature(orgIdOrClerkId, "web_agent"),
    organizationHasFeature(orgIdOrClerkId, "browser_voice"),
  ]);
  return { text, voice };
});

export default async function PublicBookingPage({
  params,
}: {
  params: Promise<{ siteSlug: string }>;
}) {
  const { siteSlug } = await params;

  try {
    const [publishedSite, agentSessionConfig, elevenLabsSettings] = await Promise.all([
      getPublishedSite(siteSlug),
      getAgentSessionConfig(siteSlug),
      getElevenLabsSettings(),
    ]);

    if (!publishedSite) {
      return <PublicSiteUnavailable />;
    }

    const agentFeatures = agentSessionConfig
      ? await getAgentFeatures(agentSessionConfig.clerkOrgId || agentSessionConfig.organizationId)
      : { text: false, voice: false };

    return (
      <PublicSite
        siteSlug={siteSlug}
        publishedSite={publishedSite as any}
        textAgentEnabled={agentFeatures.text}
        voiceAgentEnabled={agentFeatures.voice}
      />
    );
  } catch (error) {
    console.error(`Error loading public booking site [${siteSlug}]:`, error);
    return <PublicSiteUnavailable />;
  }
}
