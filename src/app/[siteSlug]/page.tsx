import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicSite } from "@/components/public-site/public-site";
import { PublicSiteUnavailable } from "@/components/public-site/public-site-states";
import { organizationHasFeature } from "@/lib/billing";
import * as publicSiteService from "@/lib/services/publicSite";

const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "app",
  "pricing",
  "sign-in",
  "sign-up",
  "session-tasks",
  "p",
  "favicon.ico",
  "sitemap.xml",
  "robots.txt",
]);

const getPublishedSite = cache((siteSlug: string) =>
  publicSiteService.getPublishedBySlug(siteSlug),
);

const getAgentSessionConfig = cache((siteSlug: string) =>
  publicSiteService.getAgentSessionConfig(siteSlug),
);

const getAgentFeatures = cache(async (clerkOrgId: string) => {
  const [text, voice] = await Promise.all([
    organizationHasFeature(clerkOrgId, "web_agent"),
    organizationHasFeature(clerkOrgId, "browser_voice"),
  ]);

  return { text, voice };
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ siteSlug: string }>;
}): Promise<Metadata> {
  const { siteSlug } = await params;
  if (RESERVED_SLUGS.has(siteSlug)) {
    return { title: "Not found" };
  }

  const publishedSite = await getPublishedSite(siteSlug);

  if (!publishedSite) {
    return {
      title: "Page unavailable",
      robots: { index: false, follow: false },
    };
  }

  const site = publishedSite.site as any;
  const config = site.config || site;
  const businessName = config?.businessName || publishedSite.organization.name;
  const title = `${businessName} · Book online`;
  const description = config?.subheadline || config?.about;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: config?.heroImageUrl ? [config.heroImageUrl] : undefined,
    },
  };
}

export default async function PublicSitePage({
  params,
}: {
  params: Promise<{ siteSlug: string }>;
}) {
  const { siteSlug } = await params;
  if (RESERVED_SLUGS.has(siteSlug)) {
    notFound();
  }

  const [publishedSite, agentSessionConfig] = await Promise.all([
    getPublishedSite(siteSlug),
    getAgentSessionConfig(siteSlug),
  ]);

  if (!publishedSite) {
    return <PublicSiteUnavailable />;
  }

  const agentFeatures = agentSessionConfig
    ? await getAgentFeatures(agentSessionConfig.clerkOrgId)
    : { text: false, voice: false };

  return (
    <PublicSite
      siteSlug={siteSlug}
      publishedSite={publishedSite as any}
      textAgentEnabled={agentFeatures.text}
      voiceAgentEnabled={agentFeatures.voice}
    />
  );
}
