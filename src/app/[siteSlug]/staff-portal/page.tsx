import { cache } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell/app-shell";
import { StaffPortalScreen } from "@/components/dashboard/staff-portal-screen";
import { PublicSiteUnavailable } from "@/components/public-site/public-site-states";
import { getSession } from "@/lib/auth/session";
import * as publicSiteService from "@/lib/services/publicSite";

const getPublishedSite = cache((siteSlug: string) =>
  publicSiteService.getPublishedBySlug(siteSlug),
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ siteSlug: string }>;
}): Promise<Metadata> {
  const { siteSlug } = await params;
  const publishedSite = await getPublishedSite(siteSlug);
  if (!publishedSite) {
    return { title: "Staff Portal unavailable" };
  }
  const orgName = publishedSite.organization.name;
  return {
    title: `Staff Portal · ${orgName}`,
    description: `Dedicated staff portal and daily appointment schedule for ${orgName}.`,
  };
}

export default async function TenantStaffPortalPage({
  params,
}: {
  params: Promise<{ siteSlug: string }>;
}) {
  const { siteSlug } = await params;

  const session = await getSession();
  if (!session || !session.user) {
    redirect(`/sign-in?redirect=/${siteSlug}/staff-portal`);
  }

  const publishedSite = await getPublishedSite(siteSlug);

  if (!publishedSite) {
    return <PublicSiteUnavailable />;
  }

  const orgSlug = publishedSite.organization.slug || siteSlug;

  return (
    <AppShell orgSlug={orgSlug}>
      <StaffPortalScreen />
    </AppShell>
  );
}
