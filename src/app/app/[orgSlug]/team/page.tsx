import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { RoleGuard } from "@/components/auth/role-guard";
import { TeamScreen } from "@/components/dashboard/team-screen";

export default async function TeamPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const session = await getSession();

  if (session?.role === "member" || session?.role === "operator") {
    redirect(`/${orgSlug}/staff-portal`);
  }

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <TeamScreen />
    </RoleGuard>
  );
}
