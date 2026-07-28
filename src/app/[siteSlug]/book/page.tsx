import { notFound } from "next/navigation";
import { getPublicSite } from "@/lib/services/publicSite";
import { PublicSite } from "@/components/public-site/public-site";
import { getAgentFeatures } from "@/lib/services/agents";
import { PublicSiteUnavailable } from "@/components/public-site/unavailable";

export const revalidate = 0;

export default async function PublicBookingPage({
  params,
}: {
  params: Promise<{ siteSlug: string }>;
}) {
  const { siteSlug } = await params;

  try {
    const publishedSite = await getPublicSite(siteSlug);
    if (!publishedSite) {
      notFound();
    }

    const orgId = publishedSite.organization.clerkOrgId || publishedSite.organization._id;
    const agentFeatures = await getAgentFeatures(orgId);

    return (
      <PublicSite
        siteSlug={siteSlug}
        publishedSite={publishedSite}
        textAgentEnabled={agentFeatures.textAgentEnabled}
        voiceAgentEnabled={agentFeatures.voiceAgentEnabled}
        voiceGender={publishedSite.site.config.agent?.voiceGender ?? "female"}
      />
    );
  } catch (error) {
    console.error(`Error loading public booking site [${siteSlug}]:`, error);
    return <PublicSiteUnavailable />;
  }
}
