import { RoleGuard } from "@/components/auth/role-guard";
import { BillingScreen } from "@/components/dashboard/billing-screen";

export default function BillingPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <BillingScreen />
    </RoleGuard>
  );
}
