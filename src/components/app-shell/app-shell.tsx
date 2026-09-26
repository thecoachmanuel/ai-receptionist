"use client";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { OrganizationSwitcher } from "@/components/auth/org-switcher";
import { UserButton } from "@/components/auth/user-button";
import { useQuery } from "@/lib/api-client/use-data";
import { useAuth } from "@/lib/auth/context";
import {
  Bot,
  Building2,
  CalendarDays,
  ChevronRight,
  Clock3,
  CreditCard,
  Layers3,
  LayoutDashboard,
  PanelsTopLeft,
  Settings2,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Brand } from "@/components/brand";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import {
  dashboardApi,
  type Terminology,
} from "@/components/dashboard/data";
import {
  WorkspaceProvider,
  useWorkspace,
} from "@/components/dashboard/workspace-context";

type NavItem = {
  label: string;
  segment: string;
  icon: typeof LayoutDashboard;
};

function navigationFor(
  terminology: Terminology,
  userRole: "admin" | "operator" | "member" | "viewer" = "admin",
): Array<{ label: string; items: NavItem[] }> {
  const isAdmin = userRole === "admin";
  const isStaff = userRole === "member" || userRole === "operator";

  // Dedicated sidebar navigation strictly applicable to staff members
  if (isStaff && !isAdmin) {
    const staffItems: NavItem[] = [
      { label: "Overview", segment: "", icon: LayoutDashboard },
      {
        label: terminology.bookingPlural || "Appointments",
        segment: "bookings",
        icon: CalendarDays,
      },
      {
        label: terminology.offeringPlural || "Treatments",
        segment: "offerings",
        icon: Layers3,
      },
      {
        label: terminology.teamMemberPlural || "Practitioners",
        segment: "team",
        icon: UsersRound,
      },
      { label: "Branches", segment: "locations", icon: Building2 },
      { label: "Availability", segment: "availability", icon: Clock3 },
      { label: "Staff Portal", segment: "staff-portal", icon: ShieldCheck },
    ];

    return [
      { label: "Staff Workspace", items: staffItems },
    ];
  }

  const operateItems: NavItem[] = [
    { label: "Overview", segment: "", icon: LayoutDashboard },
    {
      label: terminology.bookingPlural,
      segment: "bookings",
      icon: CalendarDays,
    },
    {
      label: terminology.offeringPlural,
      segment: "offerings",
      icon: Layers3,
    },
    {
      label: terminology.teamMemberPlural,
      segment: "team",
      icon: UsersRound,
    },
    { label: "Branches", segment: "locations", icon: Building2 },
    { label: "Availability", segment: "availability", icon: Clock3 },
  ];

  const experienceItems: NavItem[] = [
    { label: "AI Agent", segment: "voice-agent", icon: Bot },
    { label: "Public Site", segment: "public-site", icon: PanelsTopLeft },
  ];

  const workspaceItems: NavItem[] = [
    { label: "Billing", segment: "billing", icon: CreditCard },
    { label: "Settings", segment: "settings", icon: Settings2 },
  ];

  return [
    { label: "Operate", items: operateItems },
    { label: "Experience", items: experienceItems },
    { label: "Workspace", items: workspaceItems },
  ];
}

function WorkspaceNavigation({
  navigation,
  orgSlug,
}: {
  navigation: Array<{ label: string; items: NavItem[] }>;
  orgSlug: string;
}) {
  const pathname = usePathname();
  const { isSuperAdmin } = useAuth();

  return (
    <>
      {navigation.map((section) => (
        <SidebarGroup key={section.label} className="px-3 py-2">
          <SidebarGroupLabel className="px-2 text-[10px] font-semibold tracking-[0.18em] text-white/45 uppercase">
            {section.label}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {section.items.map((item) => {
                const href = item.segment
                  ? `/app/${orgSlug}/${item.segment}`
                  : `/app/${orgSlug}`;
                const isActive = item.segment
                  ? pathname === href || pathname.startsWith(`${href}/`)
                  : pathname === href;
                const Icon = item.icon;

                return (
                  <SidebarMenuItem key={item.segment || "overview"}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                      className={cn(
                        "h-9 rounded-md px-2.5 text-[13px] text-white/75 hover:text-white hover:bg-white/10 transition-colors font-medium",
                        isActive &&
                          "bg-white text-[#12151e] font-semibold hover:bg-white hover:text-[#12151e] shadow-xs",
                      )}
                    >
                      <Link href={href}>
                        <Icon className="size-4" />
                        <span>{item.label}</span>
                        {item.segment === "voice-agent" && (
                          <span className="ml-auto size-1.5 rounded-full bg-primary" />
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}

      {isSuperAdmin && (
        <SidebarGroup className="px-3 py-2 border-t border-white/10 mt-2">
          <SidebarGroupLabel className="px-2 text-[10px] font-semibold tracking-[0.18em] text-blue-300 uppercase">
            Platform Super Admin
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/app/admin" || pathname === "/admin"}
                  className="h-9 rounded-md px-2.5 text-[13px] font-medium bg-primary/20 text-blue-300 hover:bg-primary/30 border border-primary/30"
                >
                  <Link href="/app/admin">
                    <Building2 className="size-4" />
                    <span>Control Platform</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      )}
    </>
  );
}

function ShellChrome({
  children,
  orgSlug,
}: {
  children: ReactNode;
  orgSlug: string;
}) {
  const pathname = usePathname();
  const { organization, isBootstrapping, terminology, userRole } = useWorkspace();
  const publicSite = useQuery<any>(
    dashboardApi.publicSite.getCurrentDraft,
    organization ? {} : "skip",
  );
  const navigation = useMemo(() => navigationFor(terminology, userRole), [terminology, userRole]);
  const routeLabels = Object.fromEntries(
    navigation.flatMap((section) =>
      section.items.map((item) => [item.segment, item.label]),
    ),
  );
  const segment = pathname.split("/").filter(Boolean)[2] ?? "";
  const pageLabel = routeLabels[segment] ?? "Overview";
  const organizationName = organization?.name ?? "Your organization";


  return (
    <SidebarProvider
      defaultOpen
      style={{ "--sidebar-width": "17.25rem" } as CSSProperties}
    >
      <Sidebar
        collapsible="offcanvas"
        className="border-r border-white/10 bg-[#12151e] text-white [&_[data-sidebar=sidebar]]:bg-[#12151e] [&_[data-sidebar=header]]:bg-[#12151e] [&_[data-sidebar=content]]:bg-[#12151e] [&_[data-sidebar=footer]]:bg-[#12151e]"
      >
        <SidebarHeader className="gap-4 px-4 pt-4 pb-3">
          <div className="flex flex-col gap-0.5">
            <Brand inverted href={`/app/${orgSlug}`} />
            <span className="pl-0.5 text-[9px] font-semibold tracking-[0.18em] text-white/45 uppercase">
              Operations desk
            </span>
          </div>

          {userRole === "member" || userRole === "operator" ? (
            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 shadow-xs">
              <div className="space-y-0.5 truncate">
                <p className="text-xs font-semibold text-white truncate">{organizationName}</p>
                <p className="text-[10px] text-white/50 font-mono uppercase tracking-wider">Staff Operating Portal</p>
              </div>
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0.5 shrink-0 bg-primary/20 text-blue-300 border-primary/30">
                Staff
              </Badge>
            </div>
          ) : (
            <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 shadow-xs [&_button]:text-white [&_p]:text-white [&_span]:text-white/70">
              <OrganizationSwitcher
                hidePersonal
                afterCreateOrganizationUrl="/app/:slug"
                afterSelectOrganizationUrl="/app/:slug"
                appearance={{
                  elements: {
                    rootBox: "w-full",
                    organizationSwitcherTrigger:
                      "w-full justify-between border-0 bg-transparent px-1 py-1 shadow-none text-white",
                    organizationPreviewMainIdentifier:
                      "text-xs font-medium text-white",
                    organizationPreviewSecondaryIdentifier:
                      "text-[10px] text-white/60",
                  },
                }}
              />
            </div>
          )}
        </SidebarHeader>

        <Separator className="bg-white/10" />
        <SidebarContent className="py-2">
          <WorkspaceNavigation navigation={navigation} orgSlug={orgSlug} />
        </SidebarContent>

        <SidebarFooter className="p-3">
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold tracking-[0.14em] text-white/50 uppercase">
                Live workspace
              </p>
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-400" />
                Synced
              </span>
            </div>
            <p className="mt-2 truncate text-xs font-medium text-white/90">
              {isBootstrapping ? "Preparing workspace…" : organizationName}
            </p>
          </div>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="min-w-0 bg-[#fafafa]">
        <header className="sticky top-0 z-30 flex h-14 items-center border-b border-border/60 bg-[#fafafa]/95 px-4 supports-[backdrop-filter]:bg-[#fafafa]/85 supports-[backdrop-filter]:backdrop-blur-md sm:px-6">
          <SidebarTrigger className="mr-3 md:hidden" />

          <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
            <span className="hidden truncate text-muted-foreground sm:inline">
              {organizationName}
            </span>
            <ChevronRight className="hidden size-3.5 text-muted-foreground/45 sm:block" />
            <span className="truncate font-medium">{pageLabel}</span>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="hidden border-black/10 bg-white px-2 text-[10px] font-semibold tracking-[0.12em] uppercase sm:inline-flex"
            >
              {organization?.timezone ?? "Timezone pending"}
            </Badge>
            <Button asChild variant="outline" size="sm" className="hidden sm:flex">
              <Link
                href={`/${publicSite?.site?.siteSlug ?? orgSlug}`}
                target="_blank"
              >
                Open public page
              </Link>
            </Button>
            <UserButton
              appearance={{ elements: { avatarBox: "size-8 rounded-md" } }}
            />
          </div>
        </header>

        <main className="min-h-[calc(100svh-3.5rem)] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-[1440px]">
            {(organization?.planStatus === "expired" ||
              organization?.planStatus === "unpaid" ||
              organization?.planStatus === "canceled" ||
              (typeof organization?.subscriptionExpiresAt === "number" &&
                organization.subscriptionExpiresAt < Date.now())) &&
              !pathname?.endsWith("/billing") && (
                <div className="mb-6 rounded-xl border border-rose-300/80 bg-rose-50/90 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-rose-950">
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="size-9 rounded-lg bg-rose-200/80 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                      <CreditCard className="size-4 text-rose-700" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold tracking-tight">
                        {organization?.planStatus === "unpaid"
                          ? "Payment Required to Activate Workspace"
                          : "Workspace Subscription Expired"}
                      </h4>
                      <p className="text-xs text-rose-700/90 mt-0.5">
                        {organization?.planStatus === "unpaid"
                          ? "Your workspace requires an active subscription. Online bookings, AI reception, and your live public site are offline until payment is complete."
                          : "Your SaaS subscription has expired. Your public site and online bookings are currently offline. Please renew now to restore live access."}
                      </p>
                    </div>
                  </div>
                  <Button asChild size="sm" className="bg-rose-600 hover:bg-rose-700 text-white shrink-0 gap-1.5 shadow-none self-start sm:self-auto">
                    <Link href={`/app/${orgSlug}/billing?required=true`}>
                      {organization?.planStatus === "unpaid" ? "Complete Payment" : "Renew Subscription"}{" "}
                      <ChevronRight className="size-3.5" />
                    </Link>
                  </Button>
                </div>
              )}
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export function AppShell({
  children,
  orgSlug,
}: {
  children: ReactNode;
  orgSlug: string;
}) {
  return (
    <WorkspaceProvider orgSlug={orgSlug}>
      <ShellChrome orgSlug={orgSlug}>{children}</ShellChrome>
    </WorkspaceProvider>
  );
}
