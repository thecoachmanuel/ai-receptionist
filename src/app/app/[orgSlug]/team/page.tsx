import { RoleGuard } from "@/components/auth/role-guard";
import { TeamScreen } from "@/components/dashboard/team-screen";

export default function TeamPage() {
  return (
    <RoleGuard allowedRoles={["admin", "operator", "member"]}>
      <TeamScreen />
    </RoleGuard>
  );
}
