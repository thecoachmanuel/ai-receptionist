export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { OrganizationSwitcher } from "@/components/auth/org-switcher";
import { UserButton } from "@/components/auth/user-button";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getSession } from "@/lib/auth/session";

export default async function AccessRequiredPage() {
  const session = await getSession();

  if (!session || !session.user) {
    redirect("/sign-in");
  }

  const canOperate =
    session.role === "admin" ||
    session.role === "operator" ||
    session.permissions.includes("org:operations_hub:manage");

  if (canOperate && session.organization?.slug) {
    redirect(`/app/${session.organization.slug}`);
  }

  return (
    <main className="min-h-svh bg-[#f3f0e8] px-4 py-6 text-foreground sm:px-6 sm:py-10">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4">
        <Brand />
        <div className="flex items-center gap-3">
          <OrganizationSwitcher />
          <UserButton />
        </div>
      </div>

      <Card className="mx-auto mt-12 max-w-2xl overflow-hidden border-black/10 bg-[#faf9f5] shadow-[0_24px_70px_rgba(44,36,24,0.12)] sm:mt-20">
        <CardContent className="grid gap-8 p-7 sm:grid-cols-[auto_1fr] sm:p-10">
          <div className="grid size-14 place-items-center rounded-xl bg-foreground text-background">
            <ShieldCheck className="size-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              Operator access required
            </p>
            <h1 className="mt-3 font-heading text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
              You’re a member of this workspace, but not an operator yet.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
              Ask an organization administrator to assign the Operator role.
              Operators can manage bookings, customers, schedules, services,
              and conversations. You can also switch to another workspace you
              already operate.
            </p>
            <Button asChild variant="outline" className="mt-7">
              <Link href="/app">
                <ArrowLeft className="size-4" />
                Choose another workspace
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
