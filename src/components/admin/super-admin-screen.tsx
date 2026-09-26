"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowUpRight,
  Banknote,
  Bot,
  Building2,
  CalendarClock,
  CalendarDays,
  Check,
  CheckCircle2,
  Receipt,
  ClipboardList,
  CreditCard,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Layers,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Menu,
  MessageSquare,
  Minus,
  Plus,
  QrCode,
  RefreshCw,
  Save,
  Search,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
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
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Brand } from "@/components/brand";

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
type Tab =
  | "overview"
  | "tenants"
  | "subscriptions"
  | "pricing"
  | "ai_engine"
  | "whatsapp"
  | "messages"
  | "waitlist"
  | "settings";
type PlatformPrices = { core: number; engage: number; voice: number };

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
  subscriptionExpiresAt?: number;
  trialEndsAt?: number;
  paystack?: {
    subscriptionCode?: string;
    planCode?: string;
    emailToken?: string;
    customerCode?: string;
    channel?: string;
    amount?: number;
    lastPaymentAt?: number;
    manualNotes?: string;
    updatedBy?: string;
  };
  whatsappInstance?: {
    status: "disconnected" | "connecting" | "connected";
    phone?: string;
    instanceName?: string;
    connectedAt?: number;
  };
  businessType?: string;
  createdAt: number;
  updatedAt: number;
  owner?: {
    id?: string;
    name: string;
    email: string;
  } | null;
  publicSite?: {
    siteSlug: string;
    businessName: string;
    phone: string;
    email: string;
    address: string;
    headline: string;
  } | null;
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
  { id: "subscriptions", label: "Subscriptions", icon: CreditCard },
  { id: "pricing", label: "Pricing", icon: Receipt },
  { id: "ai_engine", label: "AI & Engine", icon: Bot },
  { id: "whatsapp", label: "WhatsApp Gateway", icon: MessageSquare },
  { id: "messages", label: "Messages", icon: ClipboardList },
  { id: "waitlist", label: "Waitlist", icon: UsersRound },
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
  const [viewingOrg, setViewingOrg] = useState<AdminOrgStat | null>(null);

  // New org form state
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("Africa/Lagos");
  const [currency, setCurrency] = useState("NGN");

  // Pricing state
  const [prices, setPrices] = useState<PlatformPrices>({ core: 5000, engage: 25000, voice: 75000 });
  const [pricesLoaded, setPricesLoaded] = useState(false);
  const [savingPrices, setSavingPrices] = useState(false);
  const priceFormRef = useRef<HTMLFormElement>(null);

  // AI engine state
  const [activeProvider, setActiveProvider] = useState<"vapi">("vapi");
  const [vapiPublicKey, setVapiPublicKey] = useState("");
  const [vapiPrivateKey, setVapiPrivateKey] = useState("");
  const [vapiAssistantId, setVapiAssistantId] = useState("");
  const [showVapiKeys, setShowVapiKeys] = useState(false);
  const [savingElevenLabs, setSavingElevenLabs] = useState(false);

  // Platform contact state
  const [contactPhone, setContactPhone] = useState("+2348168882014");
  const [contactEmail, setContactEmail] = useState("qwilong@gmail.com");
  const [clientPageUrl, setClientPageUrl] = useState("");
  const [isWaitlistActive, setIsWaitlistActive] = useState(false);
  const [googleAuthEnabled, setGoogleAuthEnabled] = useState(true);
  const [enforcePaymentOnSignup, setEnforcePaymentOnSignup] = useState(false);
  const [trialDays, setTrialDays] = useState(14);
  const [savingContact, setSavingContact] = useState(false);

  // Subscriptions state
  const [managingOrg, setManagingOrg] = useState<AdminOrgStat | null>(null);
  const [subPlan, setSubPlan] = useState<"free_org" | "engage" | "voice">("free_org");
  const [subStatus, setSubStatus] = useState<string>("active");
  const [subDurationMonths, setSubDurationMonths] = useState<number>(1);
  const [subChannel, setSubChannel] = useState<string>("bank_transfer");
  const [subAmount, setSubAmount] = useState<number>(5000);
  const [subNotes, setSubNotes] = useState<string>("");
  const [savingSub, setSavingSub] = useState<boolean>(false);
  const [subFilterStatus, setSubFilterStatus] = useState<string>("all");
  const [subSearch, setSubSearch] = useState<string>("");

  // WhatsApp Gateway state
  const [waGatewayEnabled, setWaGatewayEnabled] = useState(true);
  const [waGatewayUrl, setWaGatewayUrl] = useState("http://localhost:3000");
  const [waGatewayApiKey, setWaGatewayApiKey] = useState("");
  const [savingWaGateway, setSavingWaGateway] = useState(false);
  const [testingWaGateway, setTestingWaGateway] = useState(false);

  // Messages state
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [viewingMessage, setViewingMessage] = useState<any | null>(null);

  // Waitlist state
  const [waitlist, setWaitlist] = useState<any[]>([]);
  const [loadingWaitlist, setLoadingWaitlist] = useState(false);

  function fetchOrganizations() {
    setLoading(true);
    fetch("/api/admin/organizations")
      .then((r) => r.json())
      .then((data) => setOrganizations(data.organizations || []))
      .catch(() => toast.error("Failed to load business entities."))
      .finally(() => setLoading(false));
  }

  function fetchMessages() {
    setLoadingMessages(true);
    fetch("/api/admin/contact-messages")
      .then((r) => r.json())
      .then((data) => setMessages(data.messages || []))
      .catch(() => toast.error("Failed to load messages."))
      .finally(() => setLoadingMessages(false));
  }

  function fetchWaitlist() {
    setLoadingWaitlist(true);
    fetch("/api/admin/waitlist")
      .then((r) => r.json())
      .then((data) => setWaitlist(data.waitlist || []))
      .catch(() => toast.error("Failed to load waitlist."))
      .finally(() => setLoadingWaitlist(false));
  }

  useEffect(() => { 
    fetchOrganizations(); 
    fetchMessages();
    fetchWaitlist();
  }, []);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.settings) {
          setPrices({
            core: data.settings.planPrices?.core ?? 1000,
            engage: data.settings.planPrices?.engage ?? 5000,
            voice: data.settings.planPrices?.voice ?? 15000,
          });
          setContactPhone(data.settings.contactPhone || "+2348168882014");
          setContactEmail(data.settings.contactEmail || "qwilong@gmail.com");
          setClientPageUrl(data.settings.clientPageUrl || "");
          setIsWaitlistActive(data.settings.isWaitlistActive || false);
          if (typeof data.settings.googleAuthEnabled === "boolean") {
            setGoogleAuthEnabled(data.settings.googleAuthEnabled);
          }
          if (typeof data.settings.enforcePaymentOnSignup === "boolean") {
            setEnforcePaymentOnSignup(data.settings.enforcePaymentOnSignup);
          }
          if (typeof data.settings.trialDays === "number") {
            setTrialDays(data.settings.trialDays);
          }
        }
        if (typeof data.googleAuthEnabled === "boolean") {
          setGoogleAuthEnabled(data.googleAuthEnabled);
        }
        if (data.whatsappGateway) {
          setWaGatewayEnabled(data.whatsappGateway.enabled ?? true);
          setWaGatewayUrl(data.whatsappGateway.serverUrl || "http://localhost:3000");
          setWaGatewayApiKey(data.whatsappGateway.apiKey || "");
        }
        const aiSettings = data.vapi || data.elevenlabs;
        if (aiSettings) {
          setVapiPublicKey(aiSettings.vapiPublicKey || "");
          setVapiPrivateKey(aiSettings.vapiPrivateKey || "");
          setVapiAssistantId(aiSettings.vapiAssistantId || "");
        }
        setPricesLoaded(true);
      })
      .catch(() => setPricesLoaded(true));
  }, []);

  /* ── Handlers ─────────────────────────────── */
  const handleMarkAsRead = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "read" ? "unread" : "read";
    try {
      const res = await fetch(`/api/admin/contact-messages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update message status");
      setMessages((prev) =>
        prev.map((m) => (m._id === id ? { ...m, status: newStatus } : m))
      );
      toast.success(`Message marked as ${newStatus}`);
    } catch (err) {
      toast.error("Could not update message");
    }
  };

  const handleDeleteMessage = async (id: string) => {
    if (!confirm("Are you sure you want to delete this message?")) return;
    try {
      const res = await fetch(`/api/admin/contact-messages/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete message");
      setMessages((prev) => prev.filter((m) => m._id !== id));
      toast.success("Message deleted");
    } catch (err) {
      toast.error("Could not delete message");
    }
  };

  const handleDeleteWaitlistEntry = async (id: string) => {
    if (!confirm("Are you sure you want to delete this waitlist entry?")) return;
    try {
      const res = await fetch(`/api/admin/waitlist/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete waitlist entry");
      setWaitlist((prev) => prev.filter((m) => m._id !== id));
      toast.success("Waitlist entry deleted");
    } catch (err) {
      toast.error("Could not delete waitlist entry");
    }
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingContact(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          contactPhone, 
          contactEmail, 
          clientPageUrl,
          isWaitlistActive,
          googleAuthEnabled,
          enforcePaymentOnSignup,
          trialDays: Number(trialDays) || 14,
        }),
      });
      if (!res.ok) throw new Error("Failed to update contact info.");
      toast.success("Platform settings and payment enforcement updated.");
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
          body: JSON.stringify({ plan, price: prices[plan] }),
        });
        if (!r.ok) throw new Error(`Failed to save ${plan} price.`);
      }
      await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseCurrency: "NGN" }),
      });
      toast.success("Naira pricing configuration saved.");
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
          activeProvider: "vapi",
          vapiPublicKey: vapiPublicKey.trim(),
          vapiPrivateKey: vapiPrivateKey.trim(),
          vapiAssistantId: vapiAssistantId.trim(),
        }),
      });
      if (!res.ok) throw new Error("Failed to save Vapi AI settings.");
      toast.success("Vapi AI engine configuration saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save Vapi AI settings.");
    } finally {
      setSavingElevenLabs(false);
    }
  };

  const handleOpenManageSub = (org: AdminOrgStat) => {
    setManagingOrg(org);
    setSubPlan(org.plan || "free_org");
    setSubStatus(org.planStatus || "active");
    setSubDurationMonths(1);
    setSubChannel(org.paystack?.channel || "bank_transfer");
    setSubAmount(
      org.paystack?.amount ||
        (org.plan === "voice" ? prices.voice : org.plan === "engage" ? prices.engage : prices.core) ||
        5000,
    );
    setSubNotes(org.paystack?.manualNotes || "");
  };

  const handleSaveSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingOrg) return;
    setSavingSub(true);
    try {
      const res = await fetch("/api/admin/subscriptions/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: managingOrg._id,
          plan: subPlan,
          planStatus: subStatus,
          durationMonths: Number(subDurationMonths),
          channel: subChannel,
          amount: Number(subAmount) || 0,
          manualNotes: subNotes.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update subscription");

      toast.success(`Subscription updated for ${managingOrg.name}`);
      setOrganizations((prev) =>
        prev.map((o) =>
          o._id === managingOrg._id
            ? {
                ...o,
                plan: subPlan,
                planStatus: subStatus,
                subscriptionExpiresAt: data.subscriptionExpiresAt ?? o.subscriptionExpiresAt,
                paystack: {
                  ...(o.paystack || {}),
                  channel: subChannel,
                  amount: Number(subAmount) || 0,
                  manualNotes: subNotes.trim(),
                  lastPaymentAt: Date.now(),
                },
              }
            : o,
        ),
      );
      setManagingOrg(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update subscription");
    } finally {
      setSavingSub(false);
    }
  };

  const handleSaveWaGateway = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingWaGateway(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whatsappGateway: {
            enabled: waGatewayEnabled,
            serverUrl: waGatewayUrl.trim(),
            apiKey: waGatewayApiKey.trim(),
          },
        }),
      });
      if (!res.ok) throw new Error("Failed to save WhatsApp gateway settings.");
      toast.success("Free WhatsApp Gateway configuration saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save WhatsApp Gateway settings.");
    } finally {
      setSavingWaGateway(false);
    }
  };

  const handleTestWaGateway = async () => {
    setTestingWaGateway(true);
    try {
      const cleanUrl = waGatewayUrl.trim().replace(/\/$/, "");
      const res = await fetch(`${cleanUrl}/api/version`, {
        headers: waGatewayApiKey ? { "X-Api-Key": waGatewayApiKey } : {},
      });
      if (res.ok) {
        toast.success("WhatsApp Gateway (WAHA) is online and reachable!");
      } else {
        toast.warning(`Gateway reachable with HTTP status ${res.status}.`);
      }
    } catch (err) {
      toast.error("Could not reach WhatsApp Gateway. Ensure Docker container is running.");
    } finally {
      setTestingWaGateway(false);
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
  const now = Date.now();
  const activeSubs = organizations.filter((o) => {
    const isExpired = o.subscriptionExpiresAt && o.subscriptionExpiresAt < now;
    return (o.planStatus === "active" || !o.planStatus) && !isExpired;
  });
  const expiringSoonSubs = organizations.filter((o) => {
    if (!o.subscriptionExpiresAt) return false;
    const diffDays = (o.subscriptionExpiresAt - now) / (1000 * 60 * 60 * 24);
    return diffDays > 0 && diffDays <= 7;
  });
  const expiredSubs = organizations.filter((o) => {
    return o.planStatus === "expired" || (o.subscriptionExpiresAt && o.subscriptionExpiresAt < now);
  });
  const totalMrr = activeSubs.reduce((sum, o) => {
    if (o.plan === "voice") return sum + (prices.voice || 75000);
    if (o.plan === "engage") return sum + (prices.engage || 25000);
    return sum + (prices.core || 5000);
  }, 0);

  const filteredSubs = organizations.filter((o) => {
    const matchesSearch =
      o.name.toLowerCase().includes(subSearch.toLowerCase()) ||
      o.slug.toLowerCase().includes(subSearch.toLowerCase()) ||
      (o.owner?.email || "").toLowerCase().includes(subSearch.toLowerCase());
    if (!matchesSearch) return false;

    if (subFilterStatus === "active") {
      const isExpired = o.subscriptionExpiresAt && o.subscriptionExpiresAt < now;
      return (o.planStatus === "active" || !o.planStatus) && !isExpired;
    }
    if (subFilterStatus === "expiring_soon") {
      if (!o.subscriptionExpiresAt) return false;
      const diffDays = (o.subscriptionExpiresAt - now) / (1000 * 60 * 60 * 24);
      return diffDays > 0 && diffDays <= 7;
    }
    if (subFilterStatus === "expired") {
      return o.planStatus === "expired" || (o.subscriptionExpiresAt && o.subscriptionExpiresAt < now);
    }
    if (subFilterStatus === "trialing") {
      return o.planStatus === "trialing";
    }
    return true;
  });

  const filtered = organizations.filter(
    (o) =>
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      o.slug.toLowerCase().includes(search.toLowerCase()),
  );
  const totalBookings = organizations.reduce((s, o) => s + o.stats.bookingsCount, 0);
  const totalConversations = organizations.reduce((s, o) => s + o.stats.conversationsCount, 0);
  const totalOfferings = organizations.reduce((s, o) => s + o.stats.offeringsCount, 0);

  const SidebarNav = () => (
    <>
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center border-b border-border/40 px-5">
        <Brand href="/app" className="hover:opacity-80 transition-opacity" />
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
    </>
  );

  /* ── Render ─────────────────────────────── */
  return (
    <div className="flex min-h-dvh w-full bg-[#f6f7fa] flex-col md:flex-row">
      {/* ── Sidebar (Desktop) ── */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border/60 bg-white shadow-sm md:flex">
        <SidebarNav />
      </aside>

      {/* ── Main Content ── */}
      <div className="flex min-h-dvh w-full flex-col md:pl-60">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b border-border/60 bg-white/90 px-4 md:px-8 backdrop-blur-sm">
          <div className="flex items-center gap-3 md:gap-2 text-sm">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="size-5" />
                  <span className="sr-only">Toggle navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0 flex flex-col bg-white">
                <SidebarNav />
              </SheetContent>
            </Sheet>
            <span className="font-medium text-muted-foreground hidden sm:inline-block">Admin</span>
            <span className="text-muted-foreground/40 hidden sm:inline-block">/</span>
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

        <main className="flex-1 px-4 md:px-8 py-6 md:py-8">
          <div className="max-w-5xl space-y-7">

            {/* ───── OVERVIEW ───── */}
            {activeTab === "overview" && (
              <div className="space-y-7">
                <SectionHeader
                  title="Platform Overview"
                  description="Live snapshot of all tenant activity across the platform."
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard label="Businesses" value={organizations.length} icon={Building2} accent="bg-blue-500" />
                  <StatCard label="Total Offerings" value={totalOfferings} icon={Layers} accent="bg-emerald-500" />
                  <StatCard label="Total Bookings" value={totalBookings} icon={CalendarDays} accent="bg-orange-500" />
                  <StatCard label="AI Conversations" value={totalConversations} icon={Sparkles} accent="bg-purple-500" />
                </div>

                {/* Quick breakdown table */}
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-foreground">Plan Distribution</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {(["free_org", "engage", "voice"] as const).map((plan) => {
                      const count = organizations.filter((o) => o.plan === plan).length;
                      const label = { free_org: "Core", engage: "Engage", voice: "Voice" }[plan];
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
                                  {org.owner?.email && (
                                    <div className="text-[10px] font-mono text-muted-foreground/80 truncate max-w-[180px]">
                                      {org.owner.email}
                                    </div>
                                  )}
                                  <a
                                    href={`/${org.slug}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-0.5 font-mono text-[10px] text-primary/80 hover:underline"
                                  >
                                    /{org.slug} <ExternalLink className="size-2.5" />
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
                                  <SelectItem value="free_org">Core (₦{prices.core.toLocaleString()})</SelectItem>
                                  <SelectItem value="engage">Engage (₦{prices.engage.toLocaleString()})</SelectItem>
                                  <SelectItem value="voice">Voice (₦{prices.voice.toLocaleString()})</SelectItem>
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

            {/* ───── SUBSCRIPTIONS ───── */}
            {activeTab === "subscriptions" && (
              <div className="space-y-6">
                <SectionHeader
                  title="SaaS Subscriptions & Billing"
                  description="Monitor tenant renewals, active subscriptions, automated Paystack billing, and record offline payments."
                />

                {/* Stat cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard
                    label="Estimated MRR"
                    value={`₦${totalMrr.toLocaleString()}`}
                    icon={Banknote}
                    accent="bg-emerald-600"
                  />
                  <StatCard
                    label="Active Subscriptions"
                    value={activeSubs.length}
                    icon={CreditCard}
                    accent="bg-blue-600"
                  />
                  <StatCard
                    label="Expiring (≤ 7 Days)"
                    value={expiringSoonSubs.length}
                    icon={CalendarClock}
                    accent="bg-amber-600"
                  />
                  <StatCard
                    label="Expired / Overdue"
                    value={expiredSubs.length}
                    icon={AlertCircle}
                    accent="bg-rose-600"
                  />
                </div>

                {/* Filter and search bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search tenant, slug, or owner..."
                      value={subSearch}
                      onChange={(e) => setSubSearch(e.target.value)}
                      className="h-9 pl-9 text-xs bg-white"
                    />
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Select value={subFilterStatus} onValueChange={setSubFilterStatus}>
                      <SelectTrigger className="h-9 w-44 text-xs bg-white">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses ({organizations.length})</SelectItem>
                        <SelectItem value="active">Active Only ({activeSubs.length})</SelectItem>
                        <SelectItem value="expiring_soon">Expiring in 7 Days ({expiringSoonSubs.length})</SelectItem>
                        <SelectItem value="expired">Expired ({expiredSubs.length})</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Subscriptions Table */}
                <div className="overflow-hidden rounded-2xl border border-border/60 bg-white shadow-sm">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tenant</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Plan Tier</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Renewal / Expiry</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Channel / Last Payment</TableHead>
                        <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-28 text-center">
                            <RefreshCw className="mx-auto size-5 animate-spin text-muted-foreground/50" />
                          </TableCell>
                        </TableRow>
                      ) : filteredSubs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-28 text-center text-sm text-muted-foreground">
                            No subscriptions match the selected criteria.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredSubs.map((org) => {
                          const isExpired =
                            (org.subscriptionExpiresAt && org.subscriptionExpiresAt < now) ||
                            org.planStatus === "expired";
                          const diffDays = org.subscriptionExpiresAt
                            ? Math.ceil((org.subscriptionExpiresAt - now) / (1000 * 60 * 60 * 24))
                            : null;

                          return (
                            <TableRow key={org._id} className="group">
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-xs font-bold text-primary">
                                    {org.name[0]?.toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="text-[13px] font-semibold text-foreground">{org.name}</div>
                                    <div className="text-[10px] font-mono text-muted-foreground/80 truncate max-w-[180px]">
                                      {org.owner?.email || "No owner email"}
                                    </div>
                                    <span className="font-mono text-[10px] text-muted-foreground">
                                      /{org.slug}
                                    </span>
                                  </div>
                                </div>
                              </TableCell>

                              <TableCell>
                                <div>
                                  {planBadge(org.plan)}
                                  <div className="text-[10px] text-muted-foreground mt-0.5">
                                    {org.plan === "voice"
                                      ? `₦${(prices.voice || 75000).toLocaleString()}/mo`
                                      : org.plan === "engage"
                                      ? `₦${(prices.engage || 25000).toLocaleString()}/mo`
                                      : `₦${(prices.core || 5000).toLocaleString()}/mo`}
                                  </div>
                                </div>
                              </TableCell>

                              <TableCell>
                                {isExpired ? (
                                  <Badge variant="outline" className="border-rose-300 bg-rose-50 text-rose-700 text-[10px] font-semibold gap-1">
                                    <AlertCircle className="size-2.5" /> Expired
                                  </Badge>
                                ) : diffDays !== null && diffDays <= 7 && diffDays > 0 ? (
                                  <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 text-[10px] font-semibold gap-1">
                                    <CalendarClock className="size-2.5" /> Renews in {diffDays}d
                                  </Badge>
                                ) : org.planStatus === "trialing" ? (
                                  <Badge variant="outline" className="border-sky-300 bg-sky-50 text-sky-700 text-[10px] font-semibold">
                                    Trialing
                                  </Badge>
                                ) : org.planStatus === "canceled" ? (
                                  <Badge variant="outline" className="border-slate-300 bg-slate-50 text-slate-600 text-[10px] font-semibold">
                                    Canceled
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 text-[10px] font-semibold gap-1">
                                    <CheckCircle2 className="size-2.5" /> Active
                                  </Badge>
                                )}
                              </TableCell>

                              <TableCell>
                                {org.subscriptionExpiresAt ? (
                                  <div>
                                    <div className="text-[12px] font-medium text-foreground">
                                      {new Date(org.subscriptionExpiresAt).toLocaleDateString(undefined, {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                      })}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground">
                                      {diffDays !== null
                                        ? diffDays > 0
                                          ? `${diffDays} days remaining`
                                          : `Expired ${Math.abs(diffDays)} days ago`
                                        : "—"}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-muted-foreground italic">No expiration recorded</span>
                                )}
                              </TableCell>

                              <TableCell>
                                <div className="space-y-0.5">
                                  <div className="inline-flex items-center gap-1 font-medium text-[11px] text-foreground capitalize">
                                    {org.paystack?.channel === "paystack" ? (
                                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                                        <Zap className="size-3" /> Paystack Auto-debit
                                      </span>
                                    ) : org.paystack?.channel ? (
                                      <span>{org.paystack.channel.replace("_", " ")}</span>
                                    ) : (
                                      <span className="text-muted-foreground">Manual</span>
                                    )}
                                  </div>
                                  {org.paystack?.amount ? (
                                    <div className="text-[10px] text-muted-foreground">
                                      ₦{org.paystack.amount.toLocaleString()} recorded
                                    </div>
                                  ) : null}
                                  {org.paystack?.manualNotes ? (
                                    <div className="text-[10px] text-muted-foreground/80 truncate max-w-[160px]" title={org.paystack.manualNotes}>
                                      {org.paystack.manualNotes}
                                    </div>
                                  ) : null}
                                </div>
                              </TableCell>

                              <TableCell className="text-right">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenManageSub(org)}
                                  className="h-7 gap-1 text-[11px] font-medium border-primary/30 text-primary hover:bg-primary/5"
                                >
                                  Manage <Settings2 className="size-3" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
                {filteredSubs.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Showing {filteredSubs.length} of {organizations.length} tenant subscriptions
                  </p>
                )}
              </div>
            )}

            {/* ───── PRICING ───── */}
            {activeTab === "pricing" && (
              <div className="space-y-5">
                <SectionHeader
                  title="Platform Pricing"
                  description="Set subscription prices in Nigerian Naira (₦) for each plan tier."
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
                          { key: "engage", label: "Engage", sub: "Text assistant unlocked.", colour: "emerald" },
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
                            {label} Tier (₦)
                          </Label>
                          <div className="mt-2 flex items-center gap-1">
                            <span className="text-lg font-bold text-muted-foreground">₦</span>
                            <Input
                              id={`price-${key}`}
                              type="number"
                              min="0"
                              step="500"
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

                    <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/40 p-4 text-xs text-emerald-900 flex items-center gap-2">
                      <span className="font-semibold text-emerald-800">Purely Naira (₦) Billing:</span>
                      <span>All platform subscriptions and customer checkouts are processed directly in Nigerian Naira via Paystack without any currency conversion.</span>
                    </div>

                    <Button type="submit" disabled={savingPrices} className="gap-2">
                      {savingPrices ? <><LoaderCircle className="size-4 animate-spin" /> Saving…</> : <><Save className="size-4" /> Save Naira Pricing</>}
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
                  {/* Vapi AI Config */}
                  <div className="rounded-2xl border bg-white p-5 shadow-sm space-y-5 ring-1 ring-orange-500/15">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-orange-700">
                        Vapi AI Configuration
                      </h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        If left blank, values are automatically loaded from environment variables (<code className="text-[10px]">VAPI_PUBLIC_KEY</code>, <code className="text-[10px]">VAPI_PRIVATE_KEY</code>, <code className="text-[10px]">VAPI_ASSISTANT_ID</code>).
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="vapi-public-key" className="text-xs font-semibold">
                        Public Key
                      </Label>
                      <div className="flex max-w-sm gap-2">
                        <Input
                          id="vapi-public-key"
                          type={showVapiKeys ? "text" : "password"}
                          placeholder="e.g. 1a2b3c4d5e6f..."
                          value={vapiPublicKey}
                          onChange={(e) => setVapiPublicKey(e.target.value)}
                          className="font-mono text-xs"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setShowVapiKeys(!showVapiKeys)}
                          className="shrink-0"
                        >
                          {showVapiKeys ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="vapi-private-key" className="text-xs font-semibold">
                        Private API Key
                      </Label>
                      <div className="flex max-w-sm gap-2">
                        <Input
                          id="vapi-private-key"
                          type={showVapiKeys ? "text" : "password"}
                          placeholder="e.g. 1a2b3c4d5e6f..."
                          value={vapiPrivateKey}
                          onChange={(e) => setVapiPrivateKey(e.target.value)}
                          className="font-mono text-xs"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setShowVapiKeys(!showVapiKeys)}
                          className="shrink-0"
                        >
                          {showVapiKeys ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </Button>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Required for secure Vapi AI API interactions.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="vapi-assistant-id" className="text-xs font-semibold">
                        Assistant ID
                      </Label>
                      <Input
                        id="vapi-assistant-id"
                        placeholder="e.g. uuid-of-assistant"
                        value={vapiAssistantId}
                        onChange={(e) => setVapiAssistantId(e.target.value)}
                        className="max-w-sm font-mono text-xs"
                      />
                    </div>
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

            {/* ───── WHATSAPP GATEWAY ───── */}
            {activeTab === "whatsapp" && (
              <div className="space-y-6">
                <SectionHeader
                  title="WhatsApp Automation Gateway"
                  description="Configure the platform-wide Free WhatsApp Gateway (WAHA) so tenant businesses can link their WhatsApp number via QR code with zero Meta API fees (100% Free)."
                />

                {/* Architecture Banner */}
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-50/50 p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="size-5 text-emerald-700" />
                    <h3 className="text-sm font-bold text-emerald-950">
                      100% Free Self-Hosted WhatsApp Architecture
                    </h3>
                  </div>
                  <p className="text-xs leading-5 text-emerald-900/80">
                    Unlike Meta Cloud API (which charges per conversation) or Twilio, this system connects directly to the WhatsApp Multi-Device Web protocol using open-source <strong>WAHA (WhatsApp HTTP API)</strong>. Each tenant simply scans their QR code in their dashboard settings, and messages are dispatched directly from their phone number.
                  </p>
                  <div className="rounded-xl bg-white border border-emerald-200 p-3 space-y-1.5 font-mono text-[11px]">
                    <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-muted-foreground block">
                      Quick Docker Setup Command
                    </span>
                    <div className="text-foreground select-all bg-muted/40 p-2 rounded">
                      docker run -d -p 3000:3000/tcp --name waha devlikeapro/waha
                    </div>
                  </div>
                </div>

                {/* Gateway Configuration Form */}
                <form onSubmit={handleSaveWaGateway} className="space-y-5">
                  <div className="rounded-2xl border bg-white p-5 shadow-sm space-y-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                          Gateway Server Status
                        </h4>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Enable or disable automated background WhatsApp dispatch.
                        </p>
                      </div>
                      <Switch
                        checked={waGatewayEnabled}
                        onCheckedChange={setWaGatewayEnabled}
                      />
                    </div>

                    <Separator />

                    <div className="space-y-1.5">
                      <Label htmlFor="wa-server-url" className="text-xs font-semibold">
                        WAHA Gateway Server URL
                      </Label>
                      <Input
                        id="wa-server-url"
                        placeholder="e.g. http://localhost:3000 or https://waha.yourdomain.com"
                        value={waGatewayUrl}
                        onChange={(e) => setWaGatewayUrl(e.target.value)}
                        className="font-mono text-xs max-w-lg bg-muted/20"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        The HTTP address where your WAHA container or Evolution API server is reachable by this server.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="wa-api-key" className="text-xs font-semibold">
                        Gateway API Key <span className="font-normal text-muted-foreground">(Optional)</span>
                      </Label>
                      <Input
                        id="wa-api-key"
                        type="password"
                        placeholder="Optional secret token / header key"
                        value={waGatewayApiKey}
                        onChange={(e) => setWaGatewayApiKey(e.target.value)}
                        className="font-mono text-xs max-w-lg bg-muted/20"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Configured as <code className="text-[10px]">WAHA_API_KEY</code> on your Docker container to prevent unauthorized access.
                      </p>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleTestWaGateway}
                        disabled={testingWaGateway || !waGatewayUrl.trim()}
                        className="h-8 text-xs gap-1.5"
                      >
                        {testingWaGateway ? (
                          <LoaderCircle className="size-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="size-3.5 text-emerald-600" />
                        )}
                        Test Gateway Connection
                      </Button>
                    </div>
                  </div>

                  <Button type="submit" disabled={savingWaGateway} className="gap-2">
                    {savingWaGateway ? (
                      <><LoaderCircle className="size-4 animate-spin" /> Saving…</>
                    ) : (
                      <><Save className="size-4" /> Save WhatsApp Gateway Settings</>
                    )}
                  </Button>
                </form>
              </div>
            )}

            {/* ───── MESSAGES ───── */}
            {activeTab === "messages" && (
              <div className="space-y-5">
                <SectionHeader
                  title="Contact Messages"
                  description="Inquiries received from the public platform contact page."
                />

                <div className="overflow-hidden rounded-2xl border border-border/60 bg-white shadow-sm">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sender</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Message</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Date</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                        <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingMessages ? (
                        <TableRow>
                          <TableCell colSpan={5} className="h-28 text-center">
                            <RefreshCw className="mx-auto size-5 animate-spin text-muted-foreground/50" />
                          </TableCell>
                        </TableRow>
                      ) : messages.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="h-28 text-center text-sm text-muted-foreground">
                            No contact messages found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        messages.map((m) => (
                          <TableRow key={m._id} className={cn("group", m.status === "unread" ? "bg-primary/5" : "")}>
                            <TableCell>
                              <div className="text-[13px] font-semibold text-foreground">{m.name}</div>
                              <div className="text-[11px] text-muted-foreground">{m.email}</div>
                              {m.phone && <div className="text-[11px] text-muted-foreground">{m.phone}</div>}
                            </TableCell>
                            <TableCell className="max-w-xs">
                              <p className="truncate text-xs text-muted-foreground" title={m.message}>
                                {m.message}
                              </p>
                            </TableCell>
                            <TableCell>
                              <span className="text-[11px] text-muted-foreground">
                                {new Date(m.createdAt).toLocaleDateString()}
                              </span>
                            </TableCell>
                            <TableCell>
                              {m.status === "unread" ? (
                                <Badge variant="default" className="text-[10px] h-5 bg-blue-500">Unread</Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] h-5 text-muted-foreground">Read</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setViewingMessage(m)}
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                  title="View Details"
                                >
                                  <Eye className="size-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleMarkAsRead(m._id, m.status)}
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                  title={m.status === "read" ? "Mark as unread" : "Mark as read"}
                                >
                                  <Check className="size-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteMessage(m._id)}
                                  className="h-7 w-7 p-0 text-muted-foreground/50 hover:bg-destructive/5 hover:text-destructive"
                                  title="Delete"
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
              </div>
            )}

            {/* ───── WAITLIST ───── */}
            {activeTab === "waitlist" && (
              <div className="space-y-5">
                <SectionHeader
                  title="Waitlist Entries"
                  description="Users who signed up on the waitlist landing page."
                />

                <div className="overflow-hidden rounded-2xl border border-border/60 bg-white shadow-sm">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Name</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Email</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Date Joined</TableHead>
                        <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingWaitlist ? (
                        <TableRow>
                          <TableCell colSpan={4} className="h-28 text-center">
                            <RefreshCw className="mx-auto size-5 animate-spin text-muted-foreground/50" />
                          </TableCell>
                        </TableRow>
                      ) : waitlist.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="h-28 text-center text-sm text-muted-foreground">
                            No waitlist entries found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        waitlist.map((entry) => (
                          <TableRow key={entry._id} className="group">
                            <TableCell>
                              <div className="text-[13px] font-semibold text-foreground">{entry.name}</div>
                            </TableCell>
                            <TableCell>
                              <div className="text-[13px] text-muted-foreground">{entry.email}</div>
                            </TableCell>
                            <TableCell>
                              <span className="text-[11px] text-muted-foreground">
                                {new Date(entry.createdAt).toLocaleDateString()}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteWaitlistEntry(entry._id)}
                                  className="h-7 w-7 p-0 text-muted-foreground/50 hover:bg-destructive/5 hover:text-destructive"
                                  title="Delete"
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
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
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
                          placeholder="hello@qwilo.ng"
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
                    <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-semibold">Enable Waitlist Mode</Label>
                        <p className="text-[11px] text-muted-foreground">
                          Replaces the public homepage with a waitlist landing page.
                        </p>
                      </div>
                      <Switch
                        checked={isWaitlistActive}
                        onCheckedChange={setIsWaitlistActive}
                      />
                    </div>
                    <Separator />
                    <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-semibold">Enable Google OAuth Sign-In</Label>
                        <p className="text-[11px] text-muted-foreground">
                          Allows users to sign in or sign up using their Google accounts. Super-admin can toggle this off to restrict authentication to email/password only.
                        </p>
                      </div>
                      <Switch
                        checked={googleAuthEnabled}
                        onCheckedChange={setGoogleAuthEnabled}
                      />
                    </div>
                    <Separator />
                    <div className="flex flex-row items-center justify-between rounded-lg border p-4 bg-muted/10">
                      <div className="space-y-0.5 max-w-lg">
                        <div className="flex items-center gap-2">
                          <Label className="text-sm font-semibold">Compulsory Payment on Signup</Label>
                          {enforcePaymentOnSignup ? (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px]">
                              Enforced
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">
                              Default (Disabled)
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          When disabled (default), new users register freely and access their workspace immediately with a free trial. When enabled, new users must select a plan and complete Paystack payment during registration before workspace activation.
                        </p>
                      </div>
                      <Switch
                        checked={enforcePaymentOnSignup}
                        onCheckedChange={setEnforcePaymentOnSignup}
                      />
                    </div>

                    {!enforcePaymentOnSignup && (
                      <div className="space-y-1.5 rounded-lg border bg-muted/5 p-4">
                        <Label htmlFor="trial-days" className="text-xs font-semibold">
                          Free Trial Duration (Days)
                        </Label>
                        <Input
                          id="trial-days"
                          type="number"
                          min={1}
                          max={365}
                          value={trialDays}
                          onChange={(e) => setTrialDays(Number(e.target.value))}
                          className="text-sm max-w-xs"
                        />
                        <p className="text-[11px] text-muted-foreground">
                          Number of days granted before service expires when compulsory payment is disabled (default: 14 days).
                        </p>
                      </div>
                    )}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    <SelectItem value="NGN">NGN (₦)</SelectItem>
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
      {/* ── View Message Dialog ── */}
      <Dialog open={Boolean(viewingMessage)} onOpenChange={() => setViewingMessage(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="size-4 text-primary" /> Contact Message
            </DialogTitle>
          </DialogHeader>
          {viewingMessage && (
            <div className="space-y-4 pt-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Sender Name</div>
                  <div className="text-sm font-medium">{viewingMessage.name}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Email</div>
                  <div className="text-sm font-medium">{viewingMessage.email}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Phone</div>
                  <div className="text-sm font-medium">{viewingMessage.phone || "Not provided"}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Date</div>
                  <div className="text-sm font-medium">{new Date(viewingMessage.createdAt).toLocaleString()}</div>
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Message</div>
                <div className="rounded-xl border bg-muted/30 p-3 text-sm whitespace-pre-wrap text-foreground/90">
                  {viewingMessage.message}
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setViewingMessage(null)}>Close</Button>
            {viewingMessage && viewingMessage.status === "unread" && (
              <Button 
                onClick={() => {
                  handleMarkAsRead(viewingMessage._id, viewingMessage.status);
                  setViewingMessage(null);
                }}
              >
                Mark as Read
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── View Business Details Modal ── */}
      <Dialog open={Boolean(viewingOrg)} onOpenChange={() => setViewingOrg(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Building2 className="size-4 text-primary" />
              {viewingOrg?.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Complete business profile, owner information, and activity metrics.
            </DialogDescription>
          </DialogHeader>

          {viewingOrg && (
            <div className="space-y-4 pt-1 text-xs">
              {/* Profile Card */}
              <div className="grid grid-cols-2 gap-3 rounded-xl border bg-muted/20 p-3.5">
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Owner Name</span>
                  <span className="font-semibold text-foreground">{viewingOrg.owner?.name || "N/A"}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Owner Email</span>
                  <span className="font-mono font-medium text-foreground select-all">{viewingOrg.owner?.email || "N/A"}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Business URL Slug</span>
                  <span className="font-mono text-primary font-semibold">/{viewingOrg.slug}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Subscription Tier</span>
                  <span className="font-medium capitalize">{viewingOrg.plan.replace("_org", "")} ({viewingOrg.planStatus})</span>
                </div>
                {viewingOrg.businessType && (
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Industry / Type</span>
                    <span className="font-medium text-foreground capitalize">{viewingOrg.businessType}</span>
                  </div>
                )}
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Provisioned Date</span>
                  <span className="text-muted-foreground">{new Date(viewingOrg.createdAt).toLocaleString()}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Timezone & Currency</span>
                  <span className="text-muted-foreground">{viewingOrg.timezone} ({viewingOrg.currency})</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Public Phone</span>
                  <span className="font-mono text-muted-foreground">{viewingOrg.publicSite?.phone || "N/A"}</span>
                </div>
              </div>

              {/* Live Portals Links */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-primary">Live Portals</div>
                <div className="flex flex-col gap-1 font-mono text-[11px]">
                  <a
                    href={`/${viewingOrg.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-primary hover:underline"
                  >
                    <ExternalLink className="size-3" /> Public Site: /{viewingOrg.slug}
                  </a>
                  <a
                    href={`/${viewingOrg.slug}/staff-portal`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-emerald-700 hover:underline"
                  >
                    <ExternalLink className="size-3" /> Staff Portal: /{viewingOrg.slug}/staff-portal
                  </a>
                </div>
              </div>

              {/* Activity Summary */}
              <div>
                <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Activity & Resource Counts</div>
                <div className="grid grid-cols-5 gap-2 text-center">
                  <div className="rounded-lg border bg-background p-2">
                    <span className="block text-sm font-bold text-foreground">{viewingOrg.stats.bookingsCount}</span>
                    <span className="text-[9px] text-muted-foreground">Bookings</span>
                  </div>
                  <div className="rounded-lg border bg-background p-2">
                    <span className="block text-sm font-bold text-foreground">{viewingOrg.stats.offeringsCount}</span>
                    <span className="text-[9px] text-muted-foreground">Offerings</span>
                  </div>
                  <div className="rounded-lg border bg-background p-2">
                    <span className="block text-sm font-bold text-foreground">{viewingOrg.stats.teamMembersCount}</span>
                    <span className="text-[9px] text-muted-foreground">Staff</span>
                  </div>
                  <div className="rounded-lg border bg-background p-2">
                    <span className="block text-sm font-bold text-foreground">{viewingOrg.stats.conversationsCount}</span>
                    <span className="text-[9px] text-muted-foreground">AI Chats</span>
                  </div>
                  <div className="rounded-lg border bg-background p-2">
                    <span className="block text-sm font-bold text-foreground">{viewingOrg.stats.knowledgeCount}</span>
                    <span className="text-[9px] text-muted-foreground">Knowledge</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setViewingOrg(null)}>Close</Button>
            {viewingOrg && (
              <Button
                onClick={() => {
                  handleSwitchOrg(viewingOrg);
                  setViewingOrg(null);
                }}
                className="gap-1"
              >
                Manage Workspace <ArrowUpRight className="size-3.5" />
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Manage Subscription Modal Dialog ── */}
      <Dialog open={Boolean(managingOrg)} onOpenChange={() => setManagingOrg(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <CreditCard className="size-4 text-primary" />
              Manage Subscription — {managingOrg?.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Extend duration, change plan tier, update status, and record offline payments (Bank Transfer, Cash, POS).
            </DialogDescription>
          </DialogHeader>

          {managingOrg && (
            <form onSubmit={handleSaveSubscription} className="space-y-4 pt-1 text-xs">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Subscription Plan Tier</Label>
                <Select
                  value={subPlan}
                  onValueChange={(val: "free_org" | "engage" | "voice") => {
                    setSubPlan(val);
                    if (val === "voice") setSubAmount(prices.voice || 75000);
                    else if (val === "engage") setSubAmount(prices.engage || 25000);
                    else setSubAmount(prices.core || 5000);
                  }}
                >
                  <SelectTrigger className="h-8 text-xs bg-muted/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free_org">Core (₦{(prices.core || 5000).toLocaleString()}/mo)</SelectItem>
                    <SelectItem value="engage">Engage (₦{(prices.engage || 25000).toLocaleString()}/mo)</SelectItem>
                    <SelectItem value="voice">Voice (₦{(prices.voice || 75000).toLocaleString()}/mo)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Subscription Status</Label>
                <Select value={subStatus} onValueChange={setSubStatus}>
                  <SelectTrigger className="h-8 text-xs bg-muted/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active (Full access)</SelectItem>
                    <SelectItem value="trialing">Trialing (Grace period)</SelectItem>
                    <SelectItem value="expired">Expired (Requires renewal)</SelectItem>
                    <SelectItem value="canceled">Canceled</SelectItem>
                    <SelectItem value="past_due">Past Due</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Extend Access Duration</Label>
                <Select
                  value={String(subDurationMonths)}
                  onValueChange={(val) => setSubDurationMonths(Number(val))}
                >
                  <SelectTrigger className="h-8 text-xs bg-muted/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">+1 Month (30 Days)</SelectItem>
                    <SelectItem value="3">+3 Months (90 Days - Quarter)</SelectItem>
                    <SelectItem value="6">+6 Months (180 Days - Half Year)</SelectItem>
                    <SelectItem value="12">+1 Year (365 Days - Annual)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">
                  Extends from current expiry date (or from today if currently expired).
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Payment Channel</Label>
                  <Select value={subChannel} onValueChange={setSubChannel}>
                    <SelectTrigger className="h-8 text-xs bg-muted/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank_transfer">Direct Bank Transfer</SelectItem>
                      <SelectItem value="cash">Cash / In-person</SelectItem>
                      <SelectItem value="pos">POS Terminal</SelectItem>
                      <SelectItem value="paystack">Paystack (Auto-debit)</SelectItem>
                      <SelectItem value="complimentary">Complimentary / Promo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Amount Received (₦)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={subAmount}
                    onChange={(e) => setSubAmount(Number(e.target.value))}
                    className="h-8 text-xs font-mono bg-muted/20"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Audit / Payment Notes</Label>
                <Input
                  placeholder="e.g. Paid via GTBank transfer - Reference #TRX902348"
                  value={subNotes}
                  onChange={(e) => setSubNotes(e.target.value)}
                  className="h-8 text-xs bg-muted/20"
                />
              </div>

              <DialogFooter className="gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setManagingOrg(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={savingSub} className="gap-1.5">
                  {savingSub ? (
                    <LoaderCircle className="size-3.5 animate-spin" />
                  ) : (
                    <Save className="size-3.5" />
                  )}
                  Save Subscription
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
