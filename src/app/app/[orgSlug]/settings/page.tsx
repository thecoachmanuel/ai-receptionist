import { RoleGuard } from "@/components/auth/role-guard";
import { SettingsScreen } from "@/components/dashboard/settings-screen";

export default function SettingsPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <SettingsScreen />
    </RoleGuard>
  );
}
