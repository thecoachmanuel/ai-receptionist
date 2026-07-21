import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { AppShell } from "@/components/app-shell/app-shell";

export default async function OrganizationLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const session = await getSession();
  if (!session || !session.user) {
    redirect("/sign-in");
  }

  const { orgSlug: routeOrgSlug } = await params;

  if (!session.organization || !session.organization.slug) {
    redirect("/app");
  }

  if (session.organization.slug !== routeOrgSlug) {
    redirect(`/app/${session.organization.slug}`);
  }

  const canOperate =
    session.permissions.includes("org:operations_hub:manage") ||
    session.role === "admin" ||
    session.role === "operator";
  if (!canOperate) {
    redirect("/app/access-required");
  }

  return <AppShell orgSlug={routeOrgSlug}>{children}</AppShell>;
}
