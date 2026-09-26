"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@/lib/api-client/use-data";
import {
  Building2,
  CheckCircle2,
  Clock3,
  Coins,
  Globe2,
  Landmark,
  Languages,
  LoaderCircle,
  MessageCircle,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Unlink,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { useAuth } from "@/lib/auth/context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  LoadingPanel,
  ScreenHeader,
  SectionHeading,
} from "@/components/dashboard/screen-kit";
import { dashboardApi } from "@/components/dashboard/data";
import { useWorkspace } from "@/components/dashboard/workspace-context";
import { WorkspaceLanguageEditor } from "@/components/dashboard/workspace-language-editor";

function CurrencySettingsCard({ organization }: { organization: any }) {
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
          <Badge variant="outline" className="border-emerald-600/30 bg-emerald-50 text-emerald-700 text-[10px] font-semibold">
            Purely Naira (₦)
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <p className="text-xs leading-5 text-muted-foreground">
          The currency used for service pricing, bookings, deposits, and customer checkouts across this business.
        </p>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-foreground">Active Currency</label>
          <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2 text-xs">
            <span className="font-semibold text-foreground">Nigerian Naira (NGN · ₦)</span>
            <span className="text-[11px] font-mono text-muted-foreground">₦ NGN</span>
          </div>
        </div>
        <div className="rounded-lg bg-muted/40 p-3 text-[11px] leading-4 text-muted-foreground">
          Current pricing mode: <span className="font-semibold text-foreground">₦ (Naira)</span>. All public services and bookings are priced directly in Naira.
        </div>
      </CardContent>
    </Card>
  );
}

function NameSettingsCard({ organization }: { organization: any }) {
  const updateCurrent = useMutation(dashboardApi.organizations.updateCurrent);
  const [name, setName] = useState(organization?.name || "");
  const [saving, setSaving] = useState(false);

  async function handleNameChange(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    
    setSaving(true);
    try {
      await updateCurrent({ name: name.trim() });
      toast.success("Workspace name updated successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update name");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="h-fit bg-white">
      <CardHeader className="border-b border-black/8 pb-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Building2 className="size-4 text-primary" />
            <CardTitle className="font-heading text-xl tracking-tight">
              Organization profile
            </CardTitle>
          </div>
          {saving && <LoaderCircle className="size-4 animate-spin text-primary" />}
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <form onSubmit={handleNameChange} className="space-y-4">
          <p className="text-xs leading-5 text-muted-foreground">
            The name of your workspace as it appears to team members and in your admin dashboard.
          </p>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground">Workspace Name</label>
            <div className="flex gap-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={saving}
                className="text-xs h-9 bg-muted/20"
              />
              <Button type="submit" size="sm" disabled={saving || name.trim() === organization?.name}>
                Save
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function TimezoneSettingsCard({ organization }: { organization: any }) {
  const updateCurrent = useMutation(dashboardApi.organizations.updateCurrent);
  const [timezone, setTimezone] = useState(organization?.timezone || "Africa/Lagos");
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

function DepositSettingsCard({ publicSite }: { publicSite: any }) {
  const updateDraft = useMutation(dashboardApi.publicSite.updateDraft);
  const publish = useMutation(dashboardApi.publicSite.publish);
  const currentConfig = publicSite?.site?.draft || publicSite?.site?.config || {};
  const currentDeposit = currentConfig?.booking?.deposit || {};

  const [enabled, setEnabled] = useState(Boolean(currentDeposit.enabled));
  const [percentage, setPercentage] = useState(currentDeposit.percentage ?? 50);
  const [bankName, setBankName] = useState(currentDeposit.bankName ?? "");
  const [accountNumber, setAccountNumber] = useState(currentDeposit.accountNumber ?? "");
  const [accountName, setAccountName] = useState(currentDeposit.accountName ?? "");
  const [instructions, setInstructions] = useState(currentDeposit.instructions ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!publicSite?.site?.siteSlug) return;
    setSaving(true);
    try {
      const updatedConfig = {
        ...currentConfig,
        booking: {
          ...(currentConfig.booking || {}),
          deposit: {
            enabled,
            percentage: Number(percentage) || 50,
            bankName: bankName.trim() || undefined,
            accountNumber: accountNumber.trim() || undefined,
            accountName: accountName.trim() || undefined,
            instructions: instructions.trim() || undefined,
          },
        },
      };
      await updateDraft({ siteSlug: publicSite.site.siteSlug, config: updatedConfig });
      await publish({ siteSlug: publicSite.site.siteSlug, config: updatedConfig });
      toast.success("Deposit and bank transfer details saved & published!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save deposit settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="h-fit bg-white">
      <CardHeader className="border-b border-black/8 pb-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Landmark className="size-4 text-primary" />
            <CardTitle className="font-heading text-xl tracking-tight">
              Deposit & Bank Details
            </CardTitle>
          </div>
          {saving && <LoaderCircle className="size-4 animate-spin text-primary" />}
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <form onSubmit={handleSave} className="space-y-4">
          <p className="text-xs leading-5 text-muted-foreground">
            Optionally require clients to pay a percentage deposit when booking, and show your bank details.
          </p>
          <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/20">
            <div>
              <label className="text-xs font-semibold text-foreground block">
                Require Booking Deposit
              </label>
              <span className="text-[11px] text-muted-foreground">
                Clients must pay upfront to secure their slot.
              </span>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} disabled={saving} />
          </div>

          {enabled && (
            <div className="space-y-3 pt-1">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Deposit Percentage (%)</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={percentage}
                    onChange={(e) => setPercentage(Number(e.target.value))}
                    disabled={saving}
                    className="h-8 text-xs w-28 bg-muted/20 font-medium"
                  />
                  <span className="text-xs text-muted-foreground">% of service price</span>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Bank Name</label>
                  <Input
                    placeholder="e.g. GTBank / Chase"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    disabled={saving}
                    className="h-8 text-xs bg-muted/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Account Number</label>
                  <Input
                    placeholder="e.g. 0123456789"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    disabled={saving}
                    className="h-8 text-xs font-mono bg-muted/20"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-foreground">Account Name</label>
                  <Input
                    placeholder="e.g. Business / Registered Name"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    disabled={saving}
                    className="h-8 text-xs bg-muted/20"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-foreground">Payment Instructions</label>
                  <Textarea
                    placeholder="e.g. Use booking reference as transfer remark and keep proof of payment."
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    disabled={saving}
                    rows={2}
                    className="text-xs bg-muted/20 resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          <Button type="submit" size="sm" disabled={saving} className="w-full">
            Save Deposit & Bank Settings
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function WhatsAppSettingsCard({
  publicSite,
  organization,
}: {
  publicSite: any;
  organization?: any;
}) {
  const updateDraft = useMutation(dashboardApi.publicSite.updateDraft);
  const publish = useMutation(dashboardApi.publicSite.publish);
  const currentConfig = publicSite?.site?.draft || publicSite?.site?.config || {};
  const currentAutomation = (currentConfig as any)?.whatsappAutomation || {};

  const [whatsapp, setWhatsapp] = useState(currentConfig?.contact?.whatsapp ?? "");
  const [autoConfirm, setAutoConfirm] = useState(currentAutomation.autoConfirm ?? true);
  const [autoInvoice, setAutoInvoice] = useState(currentAutomation.autoInvoice ?? true);
  const [autoReminder, setAutoReminder] = useState(currentAutomation.autoReminder ?? true);
  const [aiTone, setAiTone] = useState<string>(currentAutomation.aiTone ?? "warm");
  const [saving, setSaving] = useState(false);

  // QR Session states
  const [waStatus, setWaStatus] = useState<"disconnected" | "connecting" | "connected">(
    organization?.whatsappInstance?.status || "disconnected",
  );
  const [qrCode, setQrCode] = useState<string | null>(
    organization?.whatsappInstance?.qrCode || null,
  );
  const [connectedPhone, setConnectedPhone] = useState<string | null>(
    organization?.whatsappInstance?.phone || null,
  );
  const [loadingSession, setLoadingSession] = useState(false);

  // Poll for connection status when connecting
  useEffect(() => {
    if (waStatus !== "connecting" || !organization?.slug) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/whatsapp/session?orgSlug=${encodeURIComponent(organization.slug)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === "connected") {
            setWaStatus("connected");
            setConnectedPhone(data.phone || null);
            setQrCode(null);
            toast.success("WhatsApp successfully linked! Automated booking notifications are active.");
          } else if (data.qrCode) {
            setQrCode(data.qrCode);
          }
        }
      } catch {
        // network polling retry
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [waStatus, organization?.slug]);

  // Initial check on mount
  useEffect(() => {
    if (!organization?.slug) return;
    fetch(`/api/whatsapp/session?orgSlug=${encodeURIComponent(organization.slug)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setWaStatus(data.status);
          if (data.phone) setConnectedPhone(data.phone);
          if (data.qrCode) setQrCode(data.qrCode);
        }
      })
      .catch(() => {});
  }, [organization?.slug]);

  async function handleStartSession() {
    if (!organization?.slug) return;
    setLoadingSession(true);
    try {
      const res = await fetch("/api/whatsapp/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", orgSlug: organization.slug }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start WhatsApp session");
      setWaStatus("connecting");
      if (data.qrCode) setQrCode(data.qrCode);
      toast.info("WhatsApp QR code generated. Scan with WhatsApp on your phone to link.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not initiate WhatsApp session");
    } finally {
      setLoadingSession(false);
    }
  }

  async function handleDisconnectSession() {
    if (!organization?.slug) return;
    setLoadingSession(true);
    try {
      const res = await fetch("/api/whatsapp/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disconnect", orgSlug: organization.slug }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to disconnect WhatsApp");
      setWaStatus("disconnected");
      setQrCode(null);
      setConnectedPhone(null);
      toast.success("WhatsApp number disconnected.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to disconnect WhatsApp");
    } finally {
      setLoadingSession(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!publicSite?.site?.siteSlug) return;
    setSaving(true);
    try {
      const targetPhone = connectedPhone || whatsapp;
      const updatedConfig = {
        ...currentConfig,
        contact: {
          ...(currentConfig.contact || {}),
          whatsapp: targetPhone.trim() || undefined,
        },
        whatsappAutomation: {
          enabled: waStatus === "connected" || Boolean(targetPhone.trim()),
          autoConfirm,
          autoInvoice,
          autoReminder,
          aiTone,
        },
      };
      await updateDraft({ siteSlug: publicSite.site.siteSlug, config: updatedConfig });
      await publish({ siteSlug: publicSite.site.siteSlug, config: updatedConfig });

      if (targetPhone.trim()) {
        await fetch("/api/whatsapp/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "save_number",
            phone: targetPhone.trim(),
            orgSlug: organization.slug,
          }),
        }).catch(() => null);
      }

      toast.success("Free WhatsApp & AI notification settings saved & published!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save WhatsApp settings");
    } finally {
      setSaving(false);
    }
  }

  const qrImageUrl = qrCode
    ? qrCode.startsWith("data:") || qrCode.startsWith("http")
      ? qrCode
      : `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(qrCode)}`
    : null;

  return (
    <Card className="h-fit bg-white">
      <CardHeader className="border-b border-black/8 pb-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MessageCircle className="size-4 text-emerald-600" />
            <CardTitle className="font-heading text-xl tracking-tight">
              Free AI & WhatsApp Automation
            </CardTitle>
          </div>
          <Badge
            variant="outline"
            className="border-emerald-600/30 bg-emerald-50 text-emerald-700 text-[11px] font-medium"
          >
            100% Free · No Meta Fees
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-4">
        <p className="text-xs leading-5 text-muted-foreground">
          Link your business WhatsApp number with a simple QR scan to automatically send client booking confirmations, payment invoices, and appointment reminders at zero cost.
        </p>

        {/* ── WhatsApp QR Connection Box ── */}
        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Smartphone className="size-4 text-emerald-700" />
              <span className="text-xs font-semibold text-emerald-950">
                WhatsApp Device Link
              </span>
            </div>
            {waStatus === "connected" ? (
              <Badge className="bg-emerald-600 text-white gap-1 text-[10px] hover:bg-emerald-600">
                <CheckCircle2 className="size-3" /> Connected
              </Badge>
            ) : waStatus === "connecting" ? (
              <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-800 gap-1 text-[10px]">
                <LoaderCircle className="size-3 animate-spin" /> Waiting for Scan
              </Badge>
            ) : (
              <Badge variant="outline" className="border-slate-300 bg-white text-slate-600 text-[10px]">
                Disconnected
              </Badge>
            )}
          </div>

          {/* Connected State */}
          {waStatus === "connected" && (
            <div className="mt-3 space-y-3">
              <div className="rounded-lg bg-white/80 border border-emerald-200 p-3 text-xs">
                <div className="font-medium text-emerald-950">
                  Linked Phone:{" "}
                  <span className="font-mono font-bold text-foreground">
                    {connectedPhone || whatsapp || "Business Phone"}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Automated booking messages will dispatch directly from this WhatsApp account to your customers.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDisconnectSession}
                  disabled={loadingSession}
                  className="h-8 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 gap-1.5"
                >
                  <Unlink className="size-3.5" /> Disconnect Number
                </Button>
              </div>
            </div>
          )}

          {/* Connecting / QR Code Display */}
          {waStatus === "connecting" && (
            <div className="mt-3 flex flex-col items-center justify-center rounded-lg bg-white p-4 border border-emerald-200 text-center">
              <div className="relative flex size-52 items-center justify-center rounded-xl border-2 border-emerald-500/30 bg-muted/10 p-2 shadow-inner">
                {qrImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrImageUrl}
                    alt="WhatsApp QR Code"
                    className="size-full object-contain rounded-lg"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
                    <LoaderCircle className="size-6 animate-spin text-emerald-600" />
                    <span>Generating pairing code...</span>
                  </div>
                )}
              </div>

              <div className="mt-3 max-w-xs space-y-1 text-left text-[11px] leading-tight text-muted-foreground">
                <p className="font-semibold text-foreground">How to link your WhatsApp:</p>
                <ol className="list-decimal list-inside space-y-0.5">
                  <li>Open <strong>WhatsApp</strong> on your phone</li>
                  <li>Tap <strong>Settings</strong> or <strong>Menu (⋮)</strong></li>
                  <li>Select <strong>Linked Devices</strong> &rarr; <strong>Link a Device</strong></li>
                  <li>Scan the QR code shown above</li>
                </ol>
              </div>

              <div className="mt-3 flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleStartSession}
                  disabled={loadingSession}
                  className="h-7 text-xs gap-1"
                >
                  <RefreshCw className={cn("size-3", loadingSession && "animate-spin")} /> Refresh QR
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDisconnectSession}
                  disabled={loadingSession}
                  className="h-7 text-xs text-muted-foreground"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Disconnected State */}
          {waStatus === "disconnected" && (
            <div className="mt-3 space-y-2">
              <p className="text-[11px] text-muted-foreground">
                No Meta developer account, credit card, or paid subscription required. Simply click below and scan the multi-device QR code with your business phone.
              </p>
              <Button
                type="button"
                onClick={handleStartSession}
                disabled={loadingSession}
                className="w-full h-9 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-sm"
              >
                {loadingSession ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <QrCode className="size-4" />
                )}
                Scan QR Code to Connect WhatsApp (100% Free)
              </Button>
            </div>
          )}
        </div>

        {/* ── Automation Config Form ── */}
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Manual Fallback WhatsApp Number
            </label>
            <Input
              type="tel"
              placeholder="+234 801 234 5678 or 2348012345678"
              value={connectedPhone || whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              disabled={saving}
              className="h-8 text-xs bg-muted/20"
            />
            <p className="text-[10px] text-muted-foreground">
              Displayed on public booking confirmation receipts for direct client communication.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Free AI Message Tone</label>
            <Select value={aiTone} onValueChange={setAiTone} disabled={saving}>
              <SelectTrigger className="h-8 text-xs bg-muted/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="warm">Warm & Welcoming (Recommended)</SelectItem>
                <SelectItem value="professional">Professional & Direct</SelectItem>
                <SelectItem value="friendly">Friendly & Casual</SelectItem>
                <SelectItem value="luxury">Luxury & Exclusive</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">
              Free AI crafts each WhatsApp confirmation, invoice, and reminder using this tone.
            </p>
          </div>

          <div className="rounded-lg border bg-muted/10 p-3 space-y-2.5">
            <span className="text-[11px] font-semibold text-foreground block">
              Automated Notification Triggers (Free)
            </span>

            <div className="flex items-center justify-between text-xs">
              <div>
                <span className="font-medium text-foreground block">Instant Booking Confirmation</span>
                <span className="text-[10px] text-muted-foreground">Sends booking code, service name, and time.</span>
              </div>
              <Switch checked={autoConfirm} onCheckedChange={setAutoConfirm} disabled={saving} />
            </div>

            <Separator />

            <div className="flex items-center justify-between text-xs">
              <div>
                <span className="font-medium text-foreground block">Invoice & Bank Deposit Details</span>
                <span className="text-[10px] text-muted-foreground">Sends required deposit amount and your bank details.</span>
              </div>
              <Switch checked={autoInvoice} onCheckedChange={setAutoInvoice} disabled={saving} />
            </div>

            <Separator />

            <div className="flex items-center justify-between text-xs">
              <div>
                <span className="font-medium text-foreground block">Appointment Reminders</span>
                <span className="text-[10px] text-muted-foreground">Sends upcoming reminders before client appointments.</span>
              </div>
              <Switch checked={autoReminder} onCheckedChange={setAutoReminder} disabled={saving} />
            </div>
          </div>

          <Button type="submit" size="sm" disabled={saving} className="w-full">
            Save Free WhatsApp & AI Settings
          </Button>
        </form>
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
            <CardContent className="space-y-3 pt-4">
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

          {organization && <NameSettingsCard organization={organization} />}
          {organization && <CurrencySettingsCard organization={organization} />}
          {organization && <TimezoneSettingsCard organization={organization} />}
          {publicSite && <DepositSettingsCard publicSite={publicSite} />}
          {publicSite && <WhatsAppSettingsCard publicSite={publicSite} organization={organization} />}
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
