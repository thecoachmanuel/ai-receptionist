"use client";

import { useQuery } from "@/lib/api-client/use-data";
import {
  Building2,
  Clock3,
  Globe2,
  Languages,
  ShieldCheck,
  Users,
} from "lucide-react";

import { useAuth } from "@/lib/auth/context";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  LoadingPanel,
  ScreenHeader,
  SectionHeading,
} from "@/components/dashboard/screen-kit";
import { dashboardApi } from "@/components/dashboard/data";
import { useWorkspace } from "@/components/dashboard/workspace-context";
import { WorkspaceLanguageEditor } from "@/components/dashboard/workspace-language-editor";

export function SettingsScreen() {
  const { user, userOrganizations } = useAuth();
  const { organization } = useWorkspace();
  const publicSite = useQuery<any>(
    dashboardApi.publicSite.getCurrentDraft,
    organization ? {} : "skip",
  );

  return (
    <>
      <ScreenHeader
        eyebrow="Workspace administration"
        title="Settings"
        description="Configure organization identity, workspace language, members, and access for this tenant."
      />

      <section className="grid gap-6 xl:grid-cols-[minmax(18rem,0.65fr)_minmax(0,1.35fr)]">
        <Card className="h-fit bg-white">
          <CardHeader className="border-b border-black/8 pb-4">
            <div className="flex items-center gap-2">
              <Building2 className="size-4 text-primary" />
              <CardTitle className="font-heading text-xl tracking-tight">
                Organization profile
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <span className="text-xs text-muted-foreground">Name</span>
              <span className="text-right text-xs font-medium">
                {organization?.name ?? "—"}
              </span>
            </div>
            <Separator />
            <div className="flex items-start justify-between gap-4">
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock3 className="size-3.5" /> Timezone
              </span>
              <span className="max-w-44 text-right font-mono text-[10px] font-medium">
                {organization?.timezone ?? "Not configured"}
              </span>
            </div>
            <Separator />
            <div className="flex items-start justify-between gap-4">
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Languages className="size-3.5" /> Locale
              </span>
              <span className="font-mono text-[10px] font-medium">
                {organization?.locale ?? "—"} · {organization?.currency ?? "—"}
              </span>
            </div>
            <Separator />
            <div className="flex items-start justify-between gap-4">
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Globe2 className="size-3.5" /> Public slug
              </span>
              <span className="font-mono text-[10px] font-medium">
                /p/{publicSite?.site?.siteSlug ?? "—"}
              </span>
            </div>
          </CardContent>
        </Card>

        {organization ? (
          <WorkspaceLanguageEditor
            key={organization._id}
            organization={organization}
          />
        ) : (
          <LoadingPanel rows={6} />
        )}
      </section>

      <section className="mt-8 space-y-4">
        <SectionHeading
          title="Members & access"
          description="Manage workspace members, roles, and access control for this organization."
        />
        <Card className="bg-white">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-primary" />
                <CardTitle className="text-lg font-semibold">Active Members</CardTitle>
              </div>
              <Badge variant="outline" className="gap-1">
                <ShieldCheck className="size-3 text-emerald-600" /> Isolated tenant
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="divide-y text-xs">
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-sm">{user?.name || "Current user"}</p>
                <p className="text-muted-foreground">{user?.email}</p>
              </div>
              <Badge className="capitalize">Admin / Owner</Badge>
            </div>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
