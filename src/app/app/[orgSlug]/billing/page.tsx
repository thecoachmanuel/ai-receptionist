import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { RoleGuard } from "@/components/auth/role-guard";
import { BillingScreen } from "@/components/dashboard/billing-screen";

export default async function BillingPage({
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
      <BillingScreen />
    </RoleGuard>
  );
}
