import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { RoleGuard } from "@/components/auth/role-guard";
import { SettingsScreen } from "@/components/dashboard/settings-screen";

export default async function SettingsPage({
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
      <SettingsScreen />
    </RoleGuard>
  );
}
