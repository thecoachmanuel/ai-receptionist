import { redirect } from "next/navigation";

export default async function TenantStaffRedirectPage({
  params,
}: {
  params: Promise<{ siteSlug: string }>;
}) {
  const { siteSlug } = await params;
  redirect(`/${siteSlug}/staff-portal`);
}
