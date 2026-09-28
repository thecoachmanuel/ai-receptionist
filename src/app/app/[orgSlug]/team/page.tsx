import { RoleGuard } from "@/components/auth/role-guard";
import { TeamScreen } from "@/components/dashboard/team-screen";
import { BusinessModelGuard } from "@/components/dashboard/business-model-guard";

export default function TeamPage() {
  return (
    <BusinessModelGuard segment="team">
      <RoleGuard allowedRoles={["admin", "operator", "member"]}>
        <TeamScreen />
      </RoleGuard>
    </BusinessModelGuard>
  );
}
