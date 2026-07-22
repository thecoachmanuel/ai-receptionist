"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@/lib/api-client/use-data";
import {
  Building2,
  Clock3,
  Coins,
  Globe2,
  Languages,
  LoaderCircle,
  ShieldCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth/context";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  LoadingPanel,
  ScreenHeader,
  SectionHeading,
} from "@/components/dashboard/screen-kit";
import { dashboardApi } from "@/components/dashboard/data";
import { useWorkspace } from "@/components/dashboard/workspace-context";
import { WorkspaceLanguageEditor } from "@/components/dashboard/workspace-language-editor";

function CurrencySettingsCard({ organization }: { organization: any }) {
  const updateCurrent = useMutation(dashboardApi.organizations.updateCurrent);
  const [currency, setCurrency] = useState(organization?.currency || "USD");
  const [saving, setSaving] = useState(false);

  async function handleCurrencyChange(newCurrency: string) {
    setCurrency(newCurrency);
    setSaving(true);
    try {
      await updateCurrent({ currency: newCurrency });
      toast.success(`Business currency updated to ${newCurrency === "NGN" ? "Naira (₦)" : "USD ($)"}`);
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update business currency");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="h-fit bg-white">
      <CardHeader className="border-b border-black/8 pb-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Coins className="size-4 text-primary" />
            <CardTitle className="font-heading text-xl tracking-tight">
              Business currency
            </CardTitle>
          </div>
          {saving && <LoaderCircle className="size-4 animate-spin text-primary" />}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <p className="text-xs leading-5 text-muted-foreground">
          Set the currency used for service pricing, bookings, public site offerings, and customer checkouts across this business.
        </p>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-foreground">Active Currency</label>
          <Select value={currency} onValueChange={handleCurrencyChange} disabled={saving}>
            <SelectTrigger className="w-full bg-muted/20 font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NGN">
                <span className="font-semibold">Nigerian Naira</span> (NGN · ₦)
              </SelectItem>
              <SelectItem value="USD">
                <span className="font-semibold">US Dollar</span> (USD · $)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="rounded-lg bg-muted/40 p-3 text-[11px] leading-4 text-muted-foreground">
          Current pricing mode: <span className="font-semibold text-foreground">{currency === "NGN" ? "₦ (Naira)" : "$ (USD)"}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function TimezoneSettingsCard({ organization }: { organization: any }) {
  const updateCurrent = useMutation(dashboardApi.organizations.updateCurrent);
  const [timezone, setTimezone] = useState(organization?.timezone || "UTC");
  const [saving, setSaving] = useState(false);

  const timezones = [
    { value: "UTC", label: "UTC (Universal)" },
    { value: "Africa/Lagos", label: "Africa/Lagos (WAT)" },
    { value: "America/New_York", label: "America/New_York (EST)" },
    { value: "America/Los_Angeles", label: "America/Los_Angeles (PST)" },
    { value: "Europe/London", label: "Europe/London (GMT)" },
    { value: "Europe/Paris", label: "Europe/Paris (CET)" },
    { value: "Asia/Dubai", label: "Asia/Dubai (GST)" },
    { value: "Asia/Tokyo", label: "Asia/Tokyo (JST)" },
    { value: "Australia/Sydney", label: "Australia/Sydney (AEST)" },
  ];

  async function handleTimezoneChange(newTimezone: string) {
    setTimezone(newTimezone);
    setSaving(true);
    try {
      await updateCurrent({ timezone: newTimezone });
      toast.success(`Business timezone updated to ${newTimezone}`);
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update timezone");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="h-fit bg-white">
      <CardHeader className="border-b border-black/8 pb-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Clock3 className="size-4 text-primary" />
            <CardTitle className="font-heading text-xl tracking-tight">
              Timezone
            </CardTitle>
          </div>
          {saving && <LoaderCircle className="size-4 animate-spin text-primary" />}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <p className="text-xs leading-5 text-muted-foreground">
          Set the operational timezone for this workspace. This affects bookings, availability schedules, and public site displays.
        </p>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-foreground">Active Timezone</label>
          <Select value={timezone} onValueChange={handleTimezoneChange} disabled={saving}>
            <SelectTrigger className="w-full bg-muted/20 font-medium text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timezones.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}

export function SettingsScreen() {
  const { user } = useAuth();
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
        description="Configure organization identity, business currency, workspace language, members, and access for this tenant."
      />

      <section className="grid gap-6 xl:grid-cols-[minmax(18rem,0.65fr)_minmax(0,1.35fr)]">
        <div className="space-y-6">
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
                  <Languages className="size-3.5" /> Locale & Currency
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
                  /{publicSite?.site?.siteSlug ?? "—"}
                </span>
              </div>
            </CardContent>
          </Card>

          {organization && <CurrencySettingsCard organization={organization} />}
          {organization && <TimezoneSettingsCard organization={organization} />}
        </div>

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
