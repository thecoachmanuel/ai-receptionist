import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { OverviewScreen } from "@/components/dashboard/overview-screen";

export default async function OverviewPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const session = await getSession();

  if (session?.role === "member" || session?.role === "operator") {
    redirect(`/${orgSlug}/staff-portal`);
  }

  return <OverviewScreen />;
}
