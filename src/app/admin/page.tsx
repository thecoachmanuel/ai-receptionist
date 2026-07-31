export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { SuperAdminScreen } from "@/components/admin/super-admin-screen";
import { Brand } from "@/components/brand";

export default async function AdminPage() {
  const session = await getSession();

  if (!session || !session.user) {
    redirect("/sign-in");
  }

  if (session.role !== "admin" && !session.permissions.includes("admin:all")) {
    redirect("/app/access-required");
  }

  return (
    <main className="min-h-dvh bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Brand />
          <div className="flex items-center gap-4">
            <span className="text-xs font-mono text-muted-foreground">
              Logged in as: <strong className="text-foreground">{session.user.email}</strong>
            </span>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-6 py-10">
        <SuperAdminScreen />
      </div>
    </main>
  );
}
