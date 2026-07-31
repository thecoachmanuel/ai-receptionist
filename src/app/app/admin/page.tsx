export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { SuperAdminScreen } from "@/components/admin/super-admin-screen";

export default async function AppAdminPage() {
  const session = await getSession();

  if (!session || !session.user) {
    redirect("/sign-in");
  }

  if (session.role !== "admin" && !session.permissions.includes("admin:all")) {
    redirect("/app/access-required");
  }

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto">
      <SuperAdminScreen />
    </div>
  );
}
