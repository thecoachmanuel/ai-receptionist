import { RoleGuard } from "@/components/auth/role-guard";
import { PublicSiteScreen } from "@/components/dashboard/public-site-screen";

export default function PublicSiteDashboardPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <PublicSiteScreen />
    </RoleGuard>
  );
}
