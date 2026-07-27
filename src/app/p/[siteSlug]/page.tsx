import { redirect } from "next/navigation";

export default async function LegacyPublicSiteRedirect({
  params,
}: {
  params: Promise<{ siteSlug: string }>;
}) {
  const { siteSlug } = await params;
  redirect(`/${siteSlug}`);
}
