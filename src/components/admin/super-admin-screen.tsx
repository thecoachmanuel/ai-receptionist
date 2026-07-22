"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Bot,
  Building2,
  CalendarDays,
  Check,
  CircleDollarSign,
  ExternalLink,
  KeyRound,
  Layers,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Minus,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  TrendingUp,
  UsersRound,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Brand } from "@/components/brand";

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
type Tab = "overview" | "tenants" | "pricing" | "ai_engine" | "settings";
type PlatformPrices = { core: number; engage: number; voice: number; usdToNgnRate: number };

type AdminOrgStat = {
  _id: string;
  clerkOrgId: string;
  name: string;
  slug: string;
  timezone: string;
  currency: string;
  locale: string;
  plan: "free_org" | "engage" | "voice";
  planStatus: string;
  createdAt: number;
  updatedAt: number;
  stats: {
    offeringsCount: number;
    teamMembersCount: number;
    bookingsCount: number;
    conversationsCount: number;
    knowledgeCount: number;
  };
};

/* ─────────────────────────────────────────────
   Nav item definition
───────────────────────────────────────────── */
const NAV_ITEMS: { id: Tab; label: string; icon: React.ElementType; badge?: string }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "tenants", label: "Tenants", icon: Building2 },
  { id: "pricing", label: "Pricing", icon: CircleDollarSign },
  { id: "ai_engine", label: "AI & Engine", icon: Bot },
  { id: "settings", label: "Settings", icon: Settings2 },
];

/* ─────────────────────────────────────────────
   Small helper: plan colour
───────────────────────────────────────────── */
function planBadge(plan: AdminOrgStat["plan"]) {
  const map = {
    free_org: "bg-slate-100 text-slate-600 border-slate-200",
    engage: "bg-emerald-50 text-emerald-700 border-emerald-200",
    voice: "bg-purple-50 text-purple-700 border-purple-200",
  };
  const labels = { free_org: "Core", engage: "Engage", voice: "Voice" };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold",
        map[plan],
      )}
    >
      {labels[plan]}
    </span>
  );
}

/* ─────────────────────────────────────────────
   Stat Card
───────────────────────────────────────────── */
function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className={cn("absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100", accent, "pointer-events-none")} />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1.5 text-3xl font-bold tracking-tight text-foreground">{value}</p>
        </div>
        <div className={cn("flex size-9 items-center justify-center rounded-xl", accent, "opacity-80")}>
          <Icon className="size-4 text-white" />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Section Header
───────────────────────────────────────────── */
function SectionHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Key Rotation Manager (shared for ElevenLabs & Gemini)
───────────────────────────────────────────── */
function KeyRotationList({
  keys,
  onAdd,
  onRemove,
  placeholder,
  accent,
}: {
  keys: string[];
  onAdd: (key: string) => void;
  onRemove: (key: string) => void;
  placeholder: string;
  accent: string;
}) {
  const [draft, setDraft] = useState("");

  const handleAdd = () => {
    const t = draft.trim();
    if (!t) return toast.error("Enter a valid API key.");
    if (keys.includes(t)) return toast.error("Key already in rotation list.");
    onAdd(t);
    setDraft("");
  };

  return (
    <div className="space-y-3">
      {keys.length === 0 ? (
        <div className="flex h-16 items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">
          No keys configured. Add one below.
        </div>
      ) : (
        <div className="divide-y divide-border rounded-xl border bg-muted/20">
          {keys.map((key, idx) => (
            <div key={key + idx} className="flex items-center justify-between px-4 py-2.5">
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex size-5 items-center justify-center rounded-full text-[9px] font-bold text-white",
                    accent,
                  )}
                >
                  {idx + 1}
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {key.slice(0, 8)}
                  <span className="tracking-widest">••••••••••</span>
                  {key.slice(-4)}
                </span>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => onRemove(key)}
                className="h-6 w-6 p-0 text-destructive/70 hover:text-destructive"
              >
                <Minus className="size-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          type="password"
          placeholder={placeholder}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAdd())}
          className="font-mono text-xs"
        />
        <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1 text-xs" onClick={handleAdd}>
          <Plus className="size-3.5" /> Add
        </Button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main Component
───────────────────────────────────────────── */
export function SuperAdminScreen() {
  const router = useRouter();
  const { switchOrganization } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const [organizations, setOrganizations] = useState<AdminOrgStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // New org form state
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [currency, setCurrency] = useState("USD");

  // Pricing state
  const [prices, setPrices] = useState<PlatformPrices>({ core: 0, engage: 49, voice: 149, usdToNgnRate: 1500 });
  const [pricesLoaded, setPricesLoaded] = useState(false);
  const [savingPrices, setSavingPrices] = useState(false);
  const priceFormRef = useRef<HTMLFormElement>(null);

  // AI engine state
  const [activeProvider, setActiveProvider] = useState<"elevenlabs" | "gemini">("elevenlabs");
  const [geminiModel, setGeminiModel] = useState("gemini-2.5-flash");
  const [geminiApiKeys, setGeminiApiKeys] = useState<string[]>([]);
  const [apiKeys, setApiKeys] = useState<string[]>([]);
  const [defaultAgentId, setDefaultAgentId] = useState("");
  const [savingElevenLabs, setSavingElevenLabs] = useState(false);

  // Platform contact state
  const [contactPhone, setContactPhone] = useState("+2348168882014");
  const [contactEmail, setContactEmail] = useState("oneboardng@gmail.com");
  const [clientPageUrl, setClientPageUrl] = useState("");
  const [savingContact, setSavingContact] = useState(false);

  function fetchOrganizations() {
    setLoading(true);
    fetch("/api/admin/organizations")
      .then((r) => r.json())
      .then((data) => setOrganizations(data.organizations || []))
      .catch(() => toast.error("Failed to load business entities."))
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchOrganizations(); }, []);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.settings) {
          setPrices({
            core: data.settings.planPrices?.core ?? 0,
            engage: data.settings.planPrices?.engage ?? 49,
            voice: data.settings.planPrices?.voice ?? 149,
            usdToNgnRate: data.settings.usdToNgnRate ?? 1500,
          });
          setContactPhone(data.settings.contactPhone || "+2348168882014");
          setContactEmail(data.settings.contactEmail || "oneboardng@gmail.com");
          setClientPageUrl(data.settings.clientPageUrl || "");
        }
        if (data.elevenlabs) {
          setActiveProvider(data.elevenlabs.activeProvider || "elevenlabs");
          setGeminiApiKeys(
            data.elevenlabs.geminiApiKeys ||
              (data.elevenlabs.geminiApiKey ? [data.elevenlabs.geminiApiKey] : []),
          );
          setGeminiModel(data.elevenlabs.geminiModel || "gemini-2.5-flash");
          setApiKeys(data.elevenlabs.apiKeys || []);
          setDefaultAgentId(data.elevenlabs.defaultAgentId || "");
        }
        setPricesLoaded(true);
      })
      .catch(() => setPricesLoaded(true));
  }, []);

  /* ── Handlers ─────────────────────────────── */
  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingContact(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactPhone, contactEmail, clientPageUrl }),
      });
      if (!res.ok) throw new Error("Failed to update contact info.");
      toast.success("Platform contact and client page settings updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save contact settings.");
    } finally {
      setSavingContact(false);
    }
  };

  const handleSavePrices = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPrices(true);
    try {
      for (const plan of ["core", "engage", "voice"] as const) {
        const r = await fetch("/api/admin/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan, usdPrice: prices[plan] }),
        });
        if (!r.ok) throw new Error(`Failed to save ${plan} price.`);
      }
      await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usdToNgnRate: prices.usdToNgnRate }),
      });
      toast.success("Pricing configuration saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save pricing.");
    } finally {
      setSavingPrices(false);
    }
  };

  const handleSaveAIEngine = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingElevenLabs(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activeProvider,
          geminiApiKeys,
          geminiModel: geminiModel.trim(),
          elevenLabsApiKeys: apiKeys,
          elevenLabsDefaultAgentId: defaultAgentId.trim(),
        }),
      });
      if (!res.ok) throw new Error("Failed to save AI Provider settings.");
      toast.success(
        `AI engine updated to ${activeProvider === "gemini" ? "Google Gemini" : "ElevenLabs"}.`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save AI engine settings.");
    } finally {
      setSavingElevenLabs(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/admin/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, timezone, currency }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to provision business entity.");
      toast.success(`"${name}" provisioned successfully.`);
      setName("");
      setCreateOpen(false);
      fetchOrganizations();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to provision entity.");
    } finally {
      setCreating(false);
    }
  };

  const handlePlanChange = async (orgId: string, newPlan: "free_org" | "engage" | "voice") => {
    try {
      const res = await fetch(`/api/admin/organizations/${orgId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: newPlan }),
      });
      if (!res.ok) throw new Error("Failed to update plan.");
      toast.success("Subscription plan updated.");
      setOrganizations((prev) => prev.map((o) => (o._id === orgId ? { ...o, plan: newPlan } : o)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update plan.");
    }
  };

  const handleDelete = async (orgId: string) => {
    try {
      const res = await fetch(`/api/admin/organizations/${orgId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete business entity.");
      toast.success("Business entity deleted.");
      setDeletingId(null);
      setOrganizations((prev) => prev.filter((o) => o._id !== orgId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete entity.");
    }
  };

  const handleSwitchOrg = async (org: AdminOrgStat) => {
    try {
      await switchOrganization(org._id);
      router.push(`/app/${org.slug}`);
    } catch {
      toast.error("Failed to switch workspace.");
    }
  };

  /* ── Derived ────────────────────────────── */
  const filtered = organizations.filter(
    (o) =>
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      o.slug.toLowerCase().includes(search.toLowerCase()),
  );
  const totalBookings = organizations.reduce((s, o) => s + o.stats.bookingsCount, 0);
  const totalConversations = organizations.reduce((s, o) => s + o.stats.conversationsCount, 0);
  const totalOfferings = organizations.reduce((s, o) => s + o.stats.offeringsCount, 0);

  /* ── Render ─────────────────────────────── */
  return (
    <div className="flex min-h-dvh w-full bg-[#f6f7fa]">
      {/* ── Sidebar ── */}
      <aside className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-border/60 bg-white shadow-sm">
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center border-b border-border/40 px-5">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <Brand className="w-28" />
          </Link>
        </div>

        {/* Label */}
        <div className="px-5 pt-5 pb-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
            Super Admin
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 px-3">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                activeTab === id
                  ? "bg-primary/8 text-primary shadow-[inset_0_0_0_1px] shadow-primary/10"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              <Icon
                className={cn("size-4 shrink-0", activeTab === id ? "text-primary" : "text-muted-foreground/70")}
              />
              {label}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-border/40 p-4">
          <Link
            href="/app"
            className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
          >
            <LogOut className="size-3.5" />
            Back to App
          </Link>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="flex min-h-dvh w-full flex-col pl-60">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b border-border/60 bg-white/90 px-8 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-muted-foreground">Admin</span>
            <span className="text-muted-foreground/40">/</span>
            <span className="font-semibold text-foreground capitalize">
              {NAV_ITEMS.find((n) => n.id === activeTab)?.label}
            </span>
          </div>
          <Badge
            variant="outline"
            className="gap-1.5 border-amber-300/60 bg-amber-50 text-amber-700 text-[10px] font-semibold"
          >
            <ShieldCheck className="size-3" />
            Super Admin
          </Badge>
        </header>

        <main className="flex-1 px-8 py-8">
          <div className="max-w-5xl space-y-7">

            {/* ───── OVERVIEW ───── */}
            {activeTab === "overview" && (
              <div className="space-y-7">
                <SectionHeader
                  title="Platform Overview"
                  description="Live snapshot of all tenant activity across the platform."
                />
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  <StatCard label="Businesses" value={organizations.length} icon={Building2} accent="bg-blue-500" />
                  <StatCard label="Total Offerings" value={totalOfferings} icon={Layers} accent="bg-emerald-500" />
                  <StatCard label="Total Bookings" value={totalBookings} icon={CalendarDays} accent="bg-orange-500" />
                  <StatCard label="AI Conversations" value={totalConversations} icon={Sparkles} accent="bg-purple-500" />
                </div>

                {/* Quick breakdown table */}
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-foreground">Plan Distribution</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {(["free_org", "engage", "voice"] as const).map((plan) => {
                      const count = organizations.filter((o) => o.plan === plan).length;
                      const label = { free_org: "Core (Free)", engage: "Engage", voice: "Voice" }[plan];
                      const pct = organizations.length ? Math.round((count / organizations.length) * 100) : 0;
                      const colour = { free_org: "bg-slate-500", engage: "bg-emerald-500", voice: "bg-purple-500" }[plan];
                      return (
                        <div key={plan} className="rounded-xl border bg-white p-4 shadow-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">{label}</span>
                            <span className="text-lg font-bold">{count}</span>
                          </div>
                          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div className={cn("h-full rounded-full", colour)} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ───── TENANTS ───── */}
            {activeTab === "tenants" && (
              <div className="space-y-5">
                <SectionHeader
                  title="Tenant Businesses"
                  description="Manage organizations, plans, and access across the platform."
                  action={
                    <Button onClick={() => setCreateOpen(true)} className="gap-1.5" size="sm">
                      <Plus className="size-3.5" /> Provision Business
                    </Button>
                  }
                />

                {/* Search */}
                <div className="relative max-w-xs">
                  <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or slug…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 text-xs bg-white"
                  />
                </div>

                {/* Table */}
                <div className="overflow-hidden rounded-2xl border border-border/60 bg-white shadow-sm">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Business</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Plan</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Activity</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Locale</TableHead>
                        <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="h-28 text-center">
                            <RefreshCw className="mx-auto size-5 animate-spin text-muted-foreground/50" />
                          </TableCell>
                        </TableRow>
                      ) : filtered.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="h-28 text-center text-sm text-muted-foreground">
                            No businesses found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filtered.map((org) => (
                          <TableRow key={org._id} className="group">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-xs font-bold text-primary">
                                  {org.name[0]?.toUpperCase()}
                                </div>
                                <div>
                                  <div className="text-[13px] font-semibold text-foreground">{org.name}</div>
                                  <a
                                    href={`/p/${org.slug}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-0.5 font-mono text-[10px] text-muted-foreground hover:text-primary"
                                  >
                                    /p/{org.slug} <ExternalLink className="size-2.5" />
                                  </a>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={org.plan}
                                onValueChange={(val: "free_org" | "engage" | "voice") =>
                                  handlePlanChange(org._id, val)
                                }
                              >
                                <SelectTrigger className="h-7 w-28 border-0 bg-transparent p-0 text-[11px] font-medium shadow-none focus:ring-0 [&>span]:flex [&>span]:items-center">
                                  <SelectValue>{planBadge(org.plan)}</SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="free_org">Core (Free)</SelectItem>
                                  <SelectItem value="engage">Engage (${prices.engage})</SelectItem>
                                  <SelectItem value="voice">Voice (${prices.voice})</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1.5">
                                <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-1.5 py-0.5 text-[10px] font-medium text-sky-700">
                                  <CalendarDays className="size-2.5" /> {org.stats.bookingsCount}
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-1.5 py-0.5 text-[10px] font-medium text-purple-700">
                                  <Bot className="size-2.5" /> {org.stats.conversationsCount}
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                                  <UsersRound className="size-2.5" /> {org.stats.teamMembersCount}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-[11px] text-muted-foreground">
                                {org.currency} · {org.timezone.split("/").pop()}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleSwitchOrg(org)}
                                  className="h-7 gap-1 border-border/60 text-[11px] hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                                >
                                  Manage <ArrowUpRight className="size-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setDeletingId(org._id)}
                                  className="h-7 w-7 p-0 text-muted-foreground/50 hover:bg-destructive/5 hover:text-destructive"
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                {filtered.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Showing {filtered.length} of {organizations.length} businesses
                  </p>
                )}
              </div>
            )}

            {/* ───── PRICING ───── */}
            {activeTab === "pricing" && (
              <div className="space-y-5">
                <SectionHeader
                  title="Platform Pricing"
                  description="Set USD base prices for each subscription tier and the NGN exchange rate."
                />
                {!pricesLoaded ? (
                  <div className="flex h-40 items-center justify-center">
                    <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <form ref={priceFormRef} onSubmit={handleSavePrices} className="space-y-5">
                    {/* Tier cards */}
                    <div className="grid gap-4 sm:grid-cols-3">
                      {(
                        [
                          { key: "core", label: "Core", sub: "Self-serve. No AI agents.", colour: "slate" },
                          { key: "engage", label: "Engage", sub: "Text concierge unlocked.", colour: "emerald" },
                          { key: "voice", label: "Voice", sub: "Live voice receptionist.", colour: "purple" },
                        ] as const
                      ).map(({ key, label, sub, colour }) => (
                        <div
                          key={key}
                          className={cn(
                            "rounded-2xl border bg-white p-5 shadow-sm",
                            colour === "emerald" && "ring-1 ring-emerald-500/20",
                            colour === "purple" && "ring-1 ring-purple-500/20",
                          )}
                        >
                          <Label
                            htmlFor={`price-${key}`}
                            className={cn(
                              "text-xs font-bold",
                              colour === "slate" && "text-slate-600",
                              colour === "emerald" && "text-emerald-600",
                              colour === "purple" && "text-purple-600",
                            )}
                          >
                            {label} Tier
                          </Label>
                          <div className="mt-2 flex items-center gap-1">
                            <span className="text-lg font-bold text-muted-foreground">$</span>
                            <Input
                              id={`price-${key}`}
                              type="number"
                              min="0"
                              step="1"
                              value={prices[key]}
                              onChange={(e) => setPrices((p) => ({ ...p, [key]: Number(e.target.value) }))}
                              className="border-0 bg-transparent p-0 text-2xl font-bold shadow-none focus-visible:ring-0"
                            />
                            <span className="text-sm text-muted-foreground">/ mo</span>
                          </div>
                          <p className="mt-1 text-[11px] text-muted-foreground">{sub}</p>
                        </div>
                      ))}
                    </div>

                    {/* Exchange rate */}
                    <div className="rounded-2xl border border-amber-200/60 bg-amber-50/60 p-5">
                      <Label htmlFor="rate-usd-ngn" className="text-xs font-bold text-amber-700">
                        USD → NGN Exchange Rate
                      </Label>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">1 USD =</span>
                        <Input
                          id="rate-usd-ngn"
                          type="number"
                          min="1"
                          step="0.01"
                          value={prices.usdToNgnRate}
                          onChange={(e) => setPrices((p) => ({ ...p, usdToNgnRate: Number(e.target.value) }))}
                          className="w-36 font-mono text-sm"
                        />
                        <span className="text-xs font-medium text-muted-foreground">NGN</span>
                      </div>
                      <p className="mt-1.5 text-[11px] text-amber-700/70">
                        Used for Paystack checkout calculations.
                      </p>
                    </div>

                    <Button type="submit" disabled={savingPrices} className="gap-2">
                      {savingPrices ? <><LoaderCircle className="size-4 animate-spin" /> Saving…</> : <><Save className="size-4" /> Save Pricing</>}
                    </Button>
                  </form>
                )}
              </div>
            )}

            {/* ───── AI ENGINE ───── */}
            {activeTab === "ai_engine" && (
              <div className="space-y-5">
                <SectionHeader
                  title="AI & Engine Configuration"
                  description="Choose the active AI provider and manage API key rotation for zero-downtime."
                />
                <form onSubmit={handleSaveAIEngine} className="space-y-6">
                  {/* Provider switcher */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(
                      [
                        {
                          id: "elevenlabs",
                          label: "ElevenLabs",
                          desc: "Ultra-realistic voices via WebSocket.",
                          activeColor: "ring-purple-500 border-purple-400/60 bg-purple-50/50",
                          dot: "bg-purple-500",
                        },
                        {
                          id: "gemini",
                          label: "Google Gemini",
                          desc: "Fast text-first AI with speech synthesis.",
                          activeColor: "ring-emerald-500 border-emerald-400/60 bg-emerald-50/50",
                          dot: "bg-emerald-500",
                        },
                      ] as const
                    ).map(({ id, label, desc, activeColor, dot }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setActiveProvider(id)}
                        className={cn(
                          "group flex w-full items-start gap-3 rounded-2xl border bg-white p-4 text-left shadow-sm transition-all hover:shadow-md",
                          activeProvider === id ? cn("ring-2", activeColor) : "hover:border-border",
                        )}
                      >
                        <div
                          className={cn(
                            "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
                            activeProvider === id ? dot + " opacity-100" : "bg-muted",
                          )}
                        >
                          {activeProvider === id ? (
                            <Check className="size-4 text-white" />
                          ) : (
                            <Zap className="size-4 text-muted-foreground/40" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{label}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Provider-specific config */}
                  <div className={cn(
                    "rounded-2xl border bg-white p-5 shadow-sm space-y-5",
                    activeProvider === "gemini" ? "ring-1 ring-emerald-500/15" : "ring-1 ring-purple-500/15",
                  )}>
                    <h3 className={cn(
                      "text-xs font-bold uppercase tracking-widest",
                      activeProvider === "gemini" ? "text-emerald-700" : "text-purple-700",
                    )}>
                      {activeProvider === "gemini" ? "Google Gemini Settings" : "ElevenLabs Settings"}
                    </h3>

                    {activeProvider === "gemini" ? (
                      <>
                        <div className="space-y-1.5">
                          <Label htmlFor="gemini-model" className="text-xs font-semibold">Active Model</Label>
                          <Input
                            id="gemini-model"
                            placeholder="e.g. gemini-2.5-flash"
                            value={geminiModel}
                            onChange={(e) => setGeminiModel(e.target.value)}
                            className="max-w-sm font-mono text-xs"
                          />
                          <p className="text-[11px] text-muted-foreground">
                            Supports: gemini-2.5-flash · gemini-2.0-flash · gemini-1.5-flash
                          </p>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold flex items-center gap-1.5">
                            <KeyRound className="size-3.5 text-emerald-600" />
                            API Key Rotation Pool
                          </Label>
                          <p className="text-[11px] text-muted-foreground">
                            Keys are rotated round-robin on every request to prevent quota exhaustion.
                          </p>
                          <KeyRotationList
                            keys={geminiApiKeys}
                            onAdd={(k) => setGeminiApiKeys((prev) => [...prev, k])}
                            onRemove={(k) => setGeminiApiKeys((prev) => prev.filter((x) => x !== k))}
                            placeholder="Add Gemini API key (AIza…)"
                            accent="bg-emerald-500"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="space-y-1.5">
                          <Label htmlFor="elevenlabs-agent-id" className="text-xs font-semibold">
                            Default Agent ID
                          </Label>
                          <Input
                            id="elevenlabs-agent-id"
                            placeholder="e.g. agent_abc123xyz"
                            value={defaultAgentId}
                            onChange={(e) => setDefaultAgentId(e.target.value)}
                            className="max-w-sm font-mono text-xs"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold flex items-center gap-1.5">
                            <KeyRound className="size-3.5 text-purple-600" />
                            API Key Rotation Pool
                          </Label>
                          <p className="text-[11px] text-muted-foreground">
                            Multiple keys rotate to prevent credit exhaustion per key.
                          </p>
                          <KeyRotationList
                            keys={apiKeys}
                            onAdd={(k) => setApiKeys((prev) => [...prev, k])}
                            onRemove={(k) => setApiKeys((prev) => prev.filter((x) => x !== k))}
                            placeholder="Add ElevenLabs API key"
                            accent="bg-purple-500"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  <Button type="submit" disabled={savingElevenLabs} className="gap-2">
                    {savingElevenLabs ? (
                      <><LoaderCircle className="size-4 animate-spin" /> Saving…</>
                    ) : (
                      <><Save className="size-4" /> Save AI Configuration</>
                    )}
                  </Button>
                </form>
              </div>
            )}

            {/* ───── SETTINGS ───── */}
            {activeTab === "settings" && (
              <div className="space-y-5">
                <SectionHeader
                  title="Platform Settings"
                  description="Default contact details surfaced on platform-wide landing pages."
                />
                <div className="rounded-2xl border bg-white p-6 shadow-sm">
                  <form onSubmit={handleSaveContact} className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="contact-phone" className="text-xs font-semibold">
                          Contact Phone
                        </Label>
                        <Input
                          id="contact-phone"
                          type="text"
                          value={contactPhone}
                          onChange={(e) => setContactPhone(e.target.value)}
                          placeholder="+2348168882014"
                          className="text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="contact-email" className="text-xs font-semibold">
                          Contact Email
                        </Label>
                        <Input
                          id="contact-email"
                          type="email"
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          placeholder="hello@oneboard.ng"
                          className="text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="client-page-url" className="text-xs font-semibold">
                        Client Page Redirect URL
                      </Label>
                      <Input
                        id="client-page-url"
                        type="url"
                        value={clientPageUrl}
                        onChange={(e) => setClientPageUrl(e.target.value)}
                        placeholder="https://example.com/client-portal"
                        className="text-sm max-w-lg"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        When set, the &quot;Open public page&quot; button in the tenant dashboard will redirect to this URL instead of the default public page.
                      </p>
                    </div>
                    <Separator />
                    <Button type="submit" disabled={savingContact} className="gap-2">
                      {savingContact ? (
                        <><LoaderCircle className="size-4 animate-spin" /> Saving…</>
                      ) : (
                        <><Save className="size-4" /> Save Settings</>
                      )}
                    </Button>
                  </form>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>

      {/* ── Provision Dialog ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Building2 className="size-4 text-primary" /> Provision New Business
            </DialogTitle>
            <DialogDescription className="text-xs">
              Creates an isolated workspace with its own offerings, team, and public page.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="org-name" className="text-xs font-semibold">Business Name</Label>
              <Input
                id="org-name"
                placeholder="e.g. Apex Health Clinic"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="org-tz" className="text-xs font-semibold">Timezone</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger id="org-tz" className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC (Universal)</SelectItem>
                    <SelectItem value="Africa/Lagos">Africa/Lagos (WAT)</SelectItem>
                    <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                    <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                    <SelectItem value="Asia/Dubai">Asia/Dubai (GST)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="org-currency" className="text-xs font-semibold">Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger id="org-currency" className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="NGN">NGN (₦)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="pt-1">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</Button>
              <Button type="submit" disabled={creating} className="gap-2">
                {creating ? <><LoaderCircle className="size-4 animate-spin" /> Provisioning…</> : "Provision Business"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm Dialog ── */}
      <Dialog open={Boolean(deletingId)} onOpenChange={() => setDeletingId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="size-4" /> Delete Business?
            </DialogTitle>
            <DialogDescription className="text-xs">
              This is irreversible. All bookings, offerings, team members, and conversations for this
              business will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeletingId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deletingId && handleDelete(deletingId)}>
              Yes, Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
