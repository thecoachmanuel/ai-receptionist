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
  Layers,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  UsersRound,
  LayoutDashboard,
  CreditCard,
  Building,
  LoaderCircle,
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
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarInset,
} from "@/components/ui/sidebar";
import { Brand } from "@/components/brand";

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

export function SuperAdminScreen() {
  const router = useRouter();
  const { switchOrganization } = useAuth();
  const [activeTab, setActiveTab] = useState<"overview" | "tenants" | "pricing" | "ai_engine" | "settings">("overview");

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

  // Platform pricing state
  const [prices, setPrices] = useState<PlatformPrices>({ core: 0, engage: 49, voice: 149, usdToNgnRate: 1500 });
  const [pricesLoaded, setPricesLoaded] = useState(false);
  const [savingPrices, setSavingPrices] = useState(false);
  const priceFormRef = useRef<HTMLFormElement>(null);

  // AI Provider & Credentials state
  const [activeProvider, setActiveProvider] = useState<"elevenlabs" | "gemini">("elevenlabs");
  const [geminiModel, setGeminiModel] = useState("gemini-2.5-flash");
  
  const [geminiApiKeys, setGeminiApiKeys] = useState<string[]>([]);
  const [newGeminiKeyInput, setNewGeminiKeyInput] = useState("");

  const [apiKeys, setApiKeys] = useState<string[]>([]);
  const [newKeyInput, setNewKeyInput] = useState("");
  const [defaultAgentId, setDefaultAgentId] = useState("");
  const [savingElevenLabs, setSavingElevenLabs] = useState(false);

  // Platform contact info state
  const [contactPhone, setContactPhone] = useState("+2348168882014");
  const [contactEmail, setContactEmail] = useState("oneboardng@gmail.com");
  const [savingContact, setSavingContact] = useState(false);

  function fetchOrganizations() {
    setLoading(true);
    fetch("/api/admin/organizations")
      .then((r) => r.json())
      .then((data) => setOrganizations(data.organizations || []))
      .catch(() => toast.error("Failed to load business entities."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchOrganizations();
  }, []);

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
        }
        if (data.elevenlabs) {
          setActiveProvider(data.elevenlabs.activeProvider || "elevenlabs");
          setGeminiApiKeys(data.elevenlabs.geminiApiKeys || (data.elevenlabs.geminiApiKey ? [data.elevenlabs.geminiApiKey] : []));
          setGeminiModel(data.elevenlabs.geminiModel || "gemini-2.5-flash");
          setApiKeys(data.elevenlabs.apiKeys || []);
          setDefaultAgentId(data.elevenlabs.defaultAgentId || "");
        }
        setPricesLoaded(true);
      })
      .catch(() => setPricesLoaded(true));
  }, []);

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingContact(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactPhone, contactEmail }),
      });
      if (!res.ok) throw new Error("Failed to update contact info.");
      toast.success("Platform contact phone and email updated — changes reflect immediately.");
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
      const plans = ["core", "engage", "voice"] as const;
      for (const plan of plans) {
        const r = await fetch("/api/admin/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan, usdPrice: prices[plan] }),
        });
        if (!r.ok) throw new Error(`Failed to save ${plan} price.`);
      }

      const r3 = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usdToNgnRate: prices.usdToNgnRate }),
      });
      if (!r3.ok) throw new Error("Failed to save exchange rate.");

      toast.success("Platform pricing updated successfully.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save settings.");
    } finally {
      setSavingPrices(false);
    }
  };

  const handleAddApiKey = () => {
    const trimmed = newKeyInput.trim();
    if (!trimmed) return toast.error("Enter a valid API key.");
    if (apiKeys.includes(trimmed)) return toast.error("API key already in rotation list.");
    setApiKeys((prev) => [...prev, trimmed]);
    setNewKeyInput("");
    toast.success("ElevenLabs API key added.");
  };

  const handleRemoveApiKey = (keyToRemove: string) => {
    setApiKeys((prev) => prev.filter((k) => k !== keyToRemove));
    toast.success("API key removed.");
  };

  const handleAddGeminiKey = () => {
    const trimmed = newGeminiKeyInput.trim();
    if (!trimmed) return toast.error("Enter a valid Gemini API key.");
    if (geminiApiKeys.includes(trimmed)) return toast.error("Gemini API key already in rotation list.");
    setGeminiApiKeys((prev) => [...prev, trimmed]);
    setNewGeminiKeyInput("");
    toast.success("Gemini API key added.");
  };

  const handleRemoveGeminiKey = (keyToRemove: string) => {
    setGeminiApiKeys((prev) => prev.filter((k) => k !== keyToRemove));
    toast.success("Gemini API key removed.");
  };

  const handleSaveElevenLabs = async (e: React.FormEvent) => {
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
        `AI Voice & Chat provider updated to ${activeProvider === "gemini" ? "Google Gemini" : "ElevenLabs"}.`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save settings.");
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

      toast.success(`Business entity "${name}" provisioned successfully!`);
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

      toast.success("Subscription plan updated successfully.");
      setOrganizations((prev) =>
        prev.map((o) => (o._id === orgId ? { ...o, plan: newPlan } : o)),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update plan.");
    }
  };

  const handleDelete = async (orgId: string) => {
    try {
      const res = await fetch(`/api/admin/organizations/${orgId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete business entity.");

      toast.success("Business entity deleted cleanly.");
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
      toast.success(`Switched active workspace to ${org.name}`);
    } catch (err) {
      toast.error("Failed to switch workspace.");
    }
  };

  const filtered = organizations.filter(
    (o) =>
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      o.slug.toLowerCase().includes(search.toLowerCase()) ||
      o.clerkOrgId.toLowerCase().includes(search.toLowerCase()),
  );

  const totalBookings = organizations.reduce((sum, o) => sum + o.stats.bookingsCount, 0);
  const totalConversations = organizations.reduce((sum, o) => sum + o.stats.conversationsCount, 0);
  const totalOfferings = organizations.reduce((sum, o) => sum + o.stats.offeringsCount, 0);

  return (
    <SidebarProvider>
      <div className="flex min-h-dvh w-full bg-background">
        <Sidebar className="border-r border-border">
          <SidebarHeader className="p-4 flex h-14 items-center">
            <Link href="/" className="flex items-center gap-2 px-2 hover:opacity-90">
              <Brand className="w-32" />
            </Link>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={activeTab === "overview"}
                      onClick={() => setActiveTab("overview")}
                    >
                      <LayoutDashboard />
                      <span>Overview</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={activeTab === "tenants"}
                      onClick={() => setActiveTab("tenants")}
                    >
                      <Building2 />
                      <span>Tenants</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={activeTab === "pricing"}
                      onClick={() => setActiveTab("pricing")}
                    >
                      <CreditCard />
                      <span>Pricing</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={activeTab === "ai_engine"}
                      onClick={() => setActiveTab("ai_engine")}
                    >
                      <Bot />
                      <span>AI & Engine</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={activeTab === "settings"}
                      onClick={() => setActiveTab("settings")}
                    >
                      <Settings2 />
                      <span>Platform Settings</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <SidebarInset className="flex w-full flex-col">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-6">
            <h1 className="text-sm font-semibold capitalize tracking-tight text-foreground">
              Super Admin / {activeTab.replace("_", " ")}
            </h1>
          </header>

          <main className="flex-1 p-6 md:p-8 overflow-y-auto">
            <div className="mx-auto max-w-5xl space-y-8">
              {activeTab === "overview" && (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card className="shadow-sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                          Total Businesses
                          <Building2 className="size-3.5" />
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{organizations.length}</div>
                      </CardContent>
                    </Card>
                    <Card className="shadow-sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                          Total Offerings
                          <CircleDollarSign className="size-3.5" />
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{totalOfferings}</div>
                      </CardContent>
                    </Card>
                    <Card className="shadow-sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                          Total Bookings
                          <CalendarDays className="size-3.5" />
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{totalBookings}</div>
                      </CardContent>
                    </Card>
                    <Card className="shadow-sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                          AI Conversations
                          <Bot className="size-3.5" />
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{totalConversations}</div>
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}

              {activeTab === "tenants" && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                      <Input
                        placeholder="Search organizations..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 h-9 text-xs"
                      />
                    </div>
                    <Button onClick={() => setCreateOpen(true)} className="h-9 gap-1.5" size="sm">
                      <Plus className="size-3.5" /> Provision Business
                    </Button>
                  </div>
                  
                  <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="w-12 text-center text-[10px] uppercase">Clerk</TableHead>
                          <TableHead className="text-xs font-semibold">Business Entity</TableHead>
                          <TableHead className="text-xs font-semibold">Locale & Currency</TableHead>
                          <TableHead className="text-xs font-semibold w-40">Subscription</TableHead>
                          <TableHead className="text-xs font-semibold">Usage & Data</TableHead>
                          <TableHead className="text-right text-xs font-semibold w-32">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading ? (
                          <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                              <RefreshCw className="mx-auto size-5 animate-spin text-muted-foreground" />
                            </TableCell>
                          </TableRow>
                        ) : filtered.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center text-sm text-muted-foreground">
                              No businesses found.
                            </TableCell>
                          </TableRow>
                        ) : (
                          filtered.map((org) => (
                            <TableRow key={org._id} className="group hover:bg-muted/30">
                              <TableCell className="text-center">
                                <span className="font-mono text-[10px] text-muted-foreground" title={org.clerkOrgId}>
                                  {org.clerkOrgId.replace("org_", "").slice(0, 5)}
                                </span>
                              </TableCell>
                              <TableCell>
                                <div className="font-semibold text-xs text-foreground mb-1">{org.name}</div>
                                <a
                                  href={`/p/${org.slug}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-primary hover:underline font-mono text-[11px]"
                                >
                                  /p/{org.slug} <ExternalLink className="size-3" />
                                </a>
                              </TableCell>
                              <TableCell>
                                <div className="text-[11px] text-muted-foreground">
                                  <span className="font-medium text-foreground">{org.currency}</span> / {org.timezone}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={org.plan}
                                  onValueChange={(val: "free_org" | "engage" | "voice") =>
                                    handlePlanChange(org._id, val)
                                  }
                                >
                                  <SelectTrigger className="h-7 w-32 text-[11px] capitalize">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="free_org">Core (Free)</SelectItem>
                                    <SelectItem value="engage">Engage (${prices.engage})</SelectItem>
                                    <SelectItem value="voice">Voice (${prices.voice})</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1.5 text-[10px]">
                                  <Badge variant="outline" className="gap-1 font-mono">
                                    <CalendarDays className="size-3 text-sky-500" /> {org.stats.bookingsCount}
                                  </Badge>
                                  <Badge variant="outline" className="gap-1 font-mono">
                                    <Bot className="size-3 text-purple-500" /> {org.stats.conversationsCount}
                                  </Badge>
                                  <Badge variant="outline" className="gap-1 font-mono">
                                    <UsersRound className="size-3 text-emerald-500" /> {org.stats.teamMembersCount}
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => handleSwitchOrg(org)}
                                    className="h-7 gap-1 text-[11px]"
                                  >
                                    Manage <ArrowUpRight className="size-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setDeletingId(org._id)}
                                    className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
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

              {activeTab === "pricing" && (
                <Card className="border-border/60">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base">Platform Pricing & Exchange Rates</CardTitle>
                    <CardDescription className="text-xs">
                      Set base USD prices for SaaS tiers and global fallback exchange rates.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!pricesLoaded ? (
                      <div className="flex h-32 items-center justify-center">
                        <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <form ref={priceFormRef} onSubmit={handleSavePrices} className="space-y-6">
                        <div className="grid gap-4 sm:grid-cols-3">
                          <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
                            <Label htmlFor="price-core" className="text-xs font-bold text-foreground">Core Tier (USD)</Label>
                            <Input
                              id="price-core"
                              type="number"
                              min="0"
                              step="1"
                              value={prices.core}
                              onChange={(e) => setPrices((p) => ({ ...p, core: Number(e.target.value) }))}
                              className="font-mono text-sm"
                            />
                            <p className="text-[10px] text-muted-foreground">Self-serve only. No AI agents.</p>
                          </div>
                          <div className="space-y-2 rounded-lg border bg-muted/30 p-4 border-emerald-500/30">
                            <Label htmlFor="price-engage" className="text-xs font-bold text-emerald-600">Engage Tier (USD)</Label>
                            <Input
                              id="price-engage"
                              type="number"
                              min="0"
                              step="1"
                              value={prices.engage}
                              onChange={(e) => setPrices((p) => ({ ...p, engage: Number(e.target.value) }))}
                              className="font-mono text-sm border-emerald-500/30 focus-visible:ring-emerald-500"
                            />
                            <p className="text-[10px] text-muted-foreground">Text concierge unlocked.</p>
                          </div>
                          <div className="space-y-2 rounded-lg border bg-muted/30 p-4 border-purple-500/30">
                            <Label htmlFor="price-voice" className="text-xs font-bold text-purple-600">Voice Tier (USD)</Label>
                            <Input
                              id="price-voice"
                              type="number"
                              min="0"
                              step="1"
                              value={prices.voice}
                              onChange={(e) => setPrices((p) => ({ ...p, voice: Number(e.target.value) }))}
                              className="font-mono text-sm border-purple-500/30 focus-visible:ring-purple-500"
                            />
                            <p className="text-[10px] text-muted-foreground">Live voice receptionist unlocked.</p>
                          </div>
                        </div>

                        <div className="space-y-2 max-w-sm rounded-lg border p-4 bg-orange-500/5 border-orange-500/20">
                          <Label htmlFor="rate-usd-ngn" className="text-xs font-bold text-orange-600 flex items-center gap-1.5">
                            USD to NGN Fixed Rate
                          </Label>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground">1 USD = </span>
                            <Input
                              id="rate-usd-ngn"
                              type="number"
                              min="1"
                              step="0.01"
                              value={prices.usdToNgnRate}
                              onChange={(e) => setPrices((p) => ({ ...p, usdToNgnRate: Number(e.target.value) }))}
                              className="font-mono text-sm flex-1 border-orange-500/30"
                            />
                            <span className="text-xs font-medium text-muted-foreground">NGN</span>
                          </div>
                          <p className="text-[10px] text-orange-700/80">Used exclusively for Paystack checkout calculations.</p>
                        </div>

                        <Button type="submit" disabled={savingPrices} className="gap-2">
                          {savingPrices ? "Updating..." : "Save Pricing Configuration"}
                          <Save className="size-4" />
                        </Button>
                      </form>
                    )}
                  </CardContent>
                </Card>
              )}

              {activeTab === "ai_engine" && (
                <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Bot className="size-4 text-purple-600" />
                        AI Voice & Chat Engine Provider
                      </CardTitle>
                      <Badge variant="outline" className="border-purple-500/30 text-purple-600 font-mono text-[10px]">
                        {activeProvider === "gemini" ? `Active: Gemini (${geminiApiKeys.length} Keys)` : `Active: ElevenLabs (${apiKeys.length} Keys)`}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">
                      Switch between ElevenLabs and Google Gemini for natural humanlike TTS/STT receptionist interactions.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-4">
                    <form onSubmit={handleSaveElevenLabs} className="space-y-6">
                      
                      {/* Active Provider Selector */}
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold">Select Active AI Provider</Label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setActiveProvider("elevenlabs")}
                            className={cn(
                              "flex flex-col items-start p-3 rounded-lg border text-left transition-all",
                              activeProvider === "elevenlabs"
                                ? "border-purple-600 bg-purple-50/50 dark:bg-purple-950/20 ring-1 ring-purple-600 shadow-sm"
                                : "hover:bg-muted/50 text-muted-foreground"
                            )}
                          >
                            <span className="font-semibold text-sm mb-1 text-foreground flex items-center justify-between w-full">
                              ElevenLabs {activeProvider === "elevenlabs" && <Check className="size-3.5 text-purple-600" />}
                            </span>
                            <span className="text-[10px]">Premium ultra-realistic voices via WebSocket</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveProvider("gemini")}
                            className={cn(
                              "flex flex-col items-start p-3 rounded-lg border text-left transition-all",
                              activeProvider === "gemini"
                                ? "border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 ring-1 ring-emerald-600 shadow-sm"
                                : "hover:bg-muted/50 text-muted-foreground"
                            )}
                          >
                            <span className="font-semibold text-sm mb-1 text-foreground flex items-center justify-between w-full">
                              Google Gemini {activeProvider === "gemini" && <Check className="size-3.5 text-emerald-600" />}
                            </span>
                            <span className="text-[10px]">Free real-time Web Speech Synthesis API</span>
                          </button>
                        </div>
                      </div>

                      {/* Provider Specific Settings */}
                      <div className={cn("space-y-6 rounded-lg border bg-card p-4", activeProvider === "gemini" ? "border-emerald-500/30" : "border-purple-500/30")}>
                        {activeProvider === "gemini" ? (
                          <>
                            <div className="space-y-1.5">
                              <Label htmlFor="gemini-model" className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                                Active Gemini Model
                              </Label>
                              <Input
                                id="gemini-model"
                                placeholder="e.g. gemini-2.5-flash"
                                value={geminiModel}
                                onChange={(e) => setGeminiModel(e.target.value)}
                                className="font-mono text-xs border-emerald-500/30 focus-visible:ring-emerald-500"
                              />
                              <p className="text-[10px] text-muted-foreground">
                                E.g., gemini-2.5-flash, gemini-2.0-flash, gemini-1.5-flash
                              </p>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Gemini API Keys Auto-Rotation</Label>
                              {geminiApiKeys.length === 0 ? (
                                <p className="text-xs text-muted-foreground italic">No Gemini API keys added.</p>
                              ) : (
                                <div className="space-y-2">
                                  {geminiApiKeys.map((key, idx) => (
                                    <div key={key + idx} className="flex items-center justify-between rounded-lg border bg-background p-2.5 text-xs font-mono">
                                      <div className="flex items-center gap-2.5">
                                        <Badge variant="secondary" className="text-[10px] font-sans">Key #{idx + 1}</Badge>
                                        <span>{key.slice(0, 6)}••••••••••••••••{key.slice(-4)}</span>
                                      </div>
                                      <Button type="button" size="sm" variant="ghost" onClick={() => handleRemoveGeminiKey(key)} className="h-6 w-6 p-0 text-destructive">
                                        <Trash2 className="size-3" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              )}
                              <div className="flex gap-2 pt-2">
                                <Input
                                  placeholder="Add new Gemini API Key..."
                                  value={newGeminiKeyInput}
                                  onChange={(e) => setNewGeminiKeyInput(e.target.value)}
                                  className="text-xs font-mono"
                                  type="password"
                                />
                                <Button type="button" onClick={handleAddGeminiKey} variant="secondary" size="sm" className="shrink-0 text-xs gap-1">
                                  <Plus className="size-3.5" /> Add
                                </Button>
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="space-y-1.5">
                              <Label htmlFor="elevenlabs-agent-id" className="text-xs font-semibold text-purple-700 dark:text-purple-400">
                                Default ElevenLabs Agent ID
                              </Label>
                              <Input
                                id="elevenlabs-agent-id"
                                placeholder="e.g. agent_abc123xyz..."
                                value={defaultAgentId}
                                onChange={(e) => setDefaultAgentId(e.target.value)}
                                className="font-mono text-xs border-purple-500/30 focus-visible:ring-purple-500"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs font-semibold text-purple-700 dark:text-purple-400">ElevenLabs API Keys Auto-Rotation</Label>
                              {apiKeys.length === 0 ? (
                                <p className="text-xs text-muted-foreground italic">No ElevenLabs API keys added.</p>
                              ) : (
                                <div className="space-y-2">
                                  {apiKeys.map((key, idx) => (
                                    <div key={key + idx} className="flex items-center justify-between rounded-lg border bg-background p-2.5 text-xs font-mono">
                                      <div className="flex items-center gap-2.5">
                                        <Badge variant="secondary" className="text-[10px] font-sans">Key #{idx + 1}</Badge>
                                        <span>{key.slice(0, 8)}••••••••••••••••{key.slice(-6)}</span>
                                      </div>
                                      <Button type="button" size="sm" variant="ghost" onClick={() => handleRemoveApiKey(key)} className="h-6 w-6 p-0 text-destructive">
                                        <Trash2 className="size-3" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              )}
                              <div className="flex gap-2 pt-2">
                                <Input
                                  placeholder="Add new ElevenLabs API Key..."
                                  value={newKeyInput}
                                  onChange={(e) => setNewKeyInput(e.target.value)}
                                  className="text-xs font-mono"
                                  type="password"
                                />
                                <Button type="button" onClick={handleAddApiKey} variant="secondary" size="sm" className="shrink-0 text-xs gap-1">
                                  <Plus className="size-3.5" /> Add
                                </Button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      <Button type="submit" disabled={savingElevenLabs} className="gap-2">
                        {savingElevenLabs ? "Saving Provider Settings..." : "Save AI Engine Configuration"}
                        <Save className="size-4" />
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )}

              {activeTab === "settings" && (
                <Card className="border-border/60">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Settings2 className="size-4 text-muted-foreground" />
                      Platform Default Contacts
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Update the default contact phone and email displayed across platform landing pages.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSaveContact} className="space-y-5">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="contact-phone" className="text-xs font-semibold">Contact Phone Number</Label>
                          <Input
                            id="contact-phone"
                            type="text"
                            value={contactPhone}
                            onChange={(e) => setContactPhone(e.target.value)}
                            className="text-sm"
                            placeholder="+2348168882014"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="contact-email" className="text-xs font-semibold">Contact Email</Label>
                          <Input
                            id="contact-email"
                            type="email"
                            value={contactEmail}
                            onChange={(e) => setContactEmail(e.target.value)}
                            className="text-sm"
                            placeholder="oneboardng@gmail.com"
                          />
                        </div>
                      </div>
                      <Button type="submit" disabled={savingContact} className="gap-2">
                        {savingContact ? "Saving Contact..." : "Save Contact Info"}
                        <Save className="size-4" />
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )}
            </div>
          </main>
        </SidebarInset>

        {/* Provision New Business Dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="size-5 text-primary" /> Provision New Business Entity
              </DialogTitle>
              <DialogDescription className="text-xs">
                Creates a brand-new, completely isolated business entity with dedicated offerings, availability, and instant public page.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="org-name" className="text-xs font-medium">Business Name</Label>
                <Input
                  id="org-name"
                  placeholder="e.g. Apex Health Clinic"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="org-tz" className="text-xs font-medium">Timezone</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger id="org-tz" className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
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
                  <Label htmlFor="org-currency" className="text-xs font-medium">Currency</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger id="org-currency" className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="NGN">NGN (₦)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</Button>
                <Button type="submit" disabled={creating} className="gap-2">{creating ? "Provisioning..." : "Provision Entity"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={Boolean(deletingId)} onOpenChange={() => setDeletingId(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <ShieldAlert className="size-5" /> Delete Business Entity?
              </DialogTitle>
              <DialogDescription className="text-xs">
                This action cannot be undone. All isolated bookings, offerings, team members, and conversations for this business will be permanently deleted.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 pt-2">
              <Button variant="outline" onClick={() => setDeletingId(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => deletingId && handleDelete(deletingId)}>Confirm Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </SidebarProvider>
  );
}
