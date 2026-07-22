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
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  // AI Provider & Credentials state (ElevenLabs vs Gemini 2.5 Flash)
  const [activeProvider, setActiveProvider] = useState<"elevenlabs" | "gemini">("elevenlabs");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [geminiModel, setGeminiModel] = useState("gemini-2.5-flash");
  const [apiKeys, setApiKeys] = useState<string[]>([]);
  const [newKeyInput, setNewKeyInput] = useState("");
  const [defaultAgentId, setDefaultAgentId] = useState("");
  const [savingElevenLabs, setSavingElevenLabs] = useState(false);

  // Platform contact info state
  const [contactPhone, setContactPhone] = useState("+2348168882014");
  const [contactEmail, setContactEmail] = useState("oneboardng@gmail.com");
  const [savingContact, setSavingContact] = useState(false);

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
          setGeminiApiKey(data.elevenlabs.geminiApiKey || "");
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
      toast.success("Platform contact phone and email updated — changes reflect immediately on homepage and contact page.");
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
      // Update core price
      const r0 = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "core", usdPrice: prices.core }),
      });
      if (!r0.ok) throw new Error("Failed to save Core price.");

      // Update engage price
      const r1 = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "engage", usdPrice: prices.engage }),
      });
      if (!r1.ok) throw new Error("Failed to save Engage price.");

      // Update voice price
      const r2 = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "voice", usdPrice: prices.voice }),
      });
      if (!r2.ok) throw new Error("Failed to save Voice price.");

      // Update exchange rate
      const r3 = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usdToNgnRate: prices.usdToNgnRate }),
      });
      if (!r3.ok) throw new Error("Failed to save exchange rate.");

      toast.success("Platform pricing updated — Core, Engage, Voice, and exchange rates reflect immediately across pricing and checkout.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save settings.");
    } finally {
      setSavingPrices(false);
    }
  };

  const handleAddApiKey = () => {
    const trimmed = newKeyInput.trim();
    if (!trimmed) {
      toast.error("Please enter a valid ElevenLabs API key.");
      return;
    }
    if (apiKeys.includes(trimmed)) {
      toast.error("This ElevenLabs API key is already in the rotation list.");
      return;
    }
    setApiKeys((prev) => [...prev, trimmed]);
    setNewKeyInput("");
    toast.success("ElevenLabs API key added to rotation list.");
  };

  const handleRemoveApiKey = (keyToRemove: string) => {
    setApiKeys((prev) => prev.filter((k) => k !== keyToRemove));
    toast.success("API key removed from rotation list.");
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
          geminiApiKey: geminiApiKey.trim(),
          geminiModel: geminiModel.trim(),
          elevenLabsApiKeys: apiKeys,
          elevenLabsDefaultAgentId: defaultAgentId.trim(),
        }),
      });
      if (!res.ok) throw new Error("Failed to save AI Provider settings.");
      toast.success(
        `AI Voice & Chat provider updated to ${activeProvider === "gemini" ? "Google Gemini (" + geminiModel + ")" : "ElevenLabs"}.`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save AI Provider settings.");
    } finally {
      setSavingElevenLabs(false);
    }
  };

      {/* AI Provider & Voice Engine Settings (ElevenLabs & Gemini 2.5 Flash) */}
      <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="size-4 text-purple-600" />
              AI Voice & Chat Engine Provider
            </CardTitle>
            <Badge variant="outline" className="border-purple-500/30 text-purple-600 font-mono text-[10px]">
              {activeProvider === "gemini" ? `Active: Gemini (${geminiModel})` : `Active: ElevenLabs (${apiKeys.length} Keys)`}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Switch between ElevenLabs and Google Gemini for natural humanlike TTS/STT receptionist interactions. Super Admin can manage Gemini API key, model selection, and ElevenLabs multi-key auto-rotation.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSaveElevenLabs} className="space-y-5">
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
                      ? "border-purple-600 bg-purple-50/50 dark:bg-purple-950/20 ring-1 ring-purple-600"
                      : "border-border hover:bg-muted/50",
                  )}
                >
                  <span className="text-xs font-semibold flex items-center gap-1.5">
                    <Bot className="size-3.5 text-purple-600" /> ElevenLabs Conversational AI
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-1">
                    Uses ElevenLabs voice agents with multi-key auto-rotation.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveProvider("gemini")}
                  className={cn(
                    "flex flex-col items-start p-3 rounded-lg border text-left transition-all",
                    activeProvider === "gemini"
                      ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 ring-1 ring-blue-600"
                      : "border-border hover:bg-muted/50",
                  )}
                >
                  <span className="text-xs font-semibold flex items-center gap-1.5 text-blue-700">
                    <Sparkles className="size-3.5 text-blue-600" /> Google Gemini 2.5 Flash (Free / Low Cost)
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-1">
                    Uses Gemini API for fast, natural human receptionist chat & voice speech.
                  </span>
                </button>
              </div>
            </div>

            {/* Gemini Configuration Section */}
            {activeProvider === "gemini" && (
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-blue-800">
                  <Sparkles className="size-4 text-blue-600" />
                  Gemini API Configuration
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="gemini-api-key" className="text-xs font-semibold">
                    Gemini API Key
                  </Label>
                  <Input
                    id="gemini-api-key"
                    type="password"
                    placeholder="AIzaSy..."
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    className="font-mono text-xs bg-white"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Google AI Studio API key used for receptionist responses.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="gemini-model" className="text-xs font-semibold">
                    Gemini Model Name
                  </Label>
                  <Input
                    id="gemini-model"
                    placeholder="gemini-2.5-flash"
                    value={geminiModel}
                    onChange={(e) => setGeminiModel(e.target.value)}
                    className="font-mono text-xs bg-white"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Defaults to <code className="font-semibold">gemini-2.5-flash</code> (also supports <code className="font-semibold">gemini-2.0-flash</code>, <code className="font-semibold">gemini-1.5-flash</code>).
                  </p>
                </div>
              </div>
            )}

            {/* ElevenLabs Configuration Section */}
            {activeProvider === "elevenlabs" && (
              <div className="space-y-4 border-t pt-4">
                <div className="space-y-1.5">
                  <Label htmlFor="elevenlabs-agent-id" className="text-xs font-semibold">
                    Default ElevenLabs Agent ID
                  </Label>
                  <Input
                    id="elevenlabs-agent-id"
                    placeholder="e.g. agent_abc123xyz..."
                    value={defaultAgentId}
                    onChange={(e) => setDefaultAgentId(e.target.value)}
                    className="font-mono text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Agent ID used for voice receptionist sessions.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Active ElevenLabs API Keys List</Label>
                  {apiKeys.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                      No API keys added yet. Add one below or rely on ELEVENLABS_API_KEY environment variable.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {apiKeys.map((key, idx) => (
                        <div
                          key={key + idx}
                          className="flex items-center justify-between rounded-lg border bg-card p-2.5 text-xs font-mono"
                        >
                          <div className="flex items-center gap-2.5">
                            <Badge variant="secondary" className="text-[10px] font-sans">
                              Key #{idx + 1}
                            </Badge>
                            <span>
                              {key.slice(0, 8)}••••••••••••••••{key.slice(-6)}
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveApiKey(key)}
                            className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="Paste new ElevenLabs API Key (e.g. sk_...)"
                    value={newKeyInput}
                    onChange={(e) => setNewKeyInput(e.target.value)}
                    className="font-mono text-xs flex-1"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={handleAddApiKey} className="gap-1.5 shrink-0">
                    <Plus className="size-3.5" /> Add Key
                  </Button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <p className="text-[11px] text-muted-foreground">
                {activeProvider === "gemini"
                  ? `Active Engine: Gemini ${geminiModel} for natural receptionist speech.`
                  : apiKeys.length > 1
                  ? "Requests will rotate round-robin across all keys automatically."
                  : "Add 2+ keys to enable multi-key auto-rotation."}
              </p>
              <Button type="submit" size="sm" disabled={savingElevenLabs} className="gap-2 bg-purple-600 text-white hover:bg-purple-700">
                <Save className="size-3.5" />
                {savingElevenLabs ? "Saving AI Settings..." : "Save AI Settings"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

  const fetchOrganizations = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/organizations");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load admin stats.");
      setOrganizations(data.organizations || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load organizations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Business entity name is required.");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/admin/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), timezone, currency }),
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
    <div className="space-y-8">
      {/* ElevenLabs API Keys & Auto-Rotation Settings */}
      <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="size-4 text-purple-600" />
              ElevenLabs API Keys & Auto-Rotation
            </CardTitle>
            <Badge variant="outline" className="border-purple-500/30 text-purple-600 font-mono text-[10px]">
              {apiKeys.length > 1
                ? `Auto-Rotation Active (${apiKeys.length} Keys)`
                : apiKeys.length === 1
                ? "1 API Key Active"
                : "No Keys Configured"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Configure multiple ElevenLabs API keys. The system automatically rotates through all configured keys in round-robin order to prevent credit exhaustion.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSaveElevenLabs} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="elevenlabs-agent-id" className="text-xs font-semibold">
                Default ElevenLabs Agent ID
              </Label>
              <Input
                id="elevenlabs-agent-id"
                placeholder="e.g. agent_abc123xyz..."
                value={defaultAgentId}
                onChange={(e) => setDefaultAgentId(e.target.value)}
                className="font-mono text-xs"
              />
              <p className="text-[10px] text-muted-foreground">
                Agent ID used for voice receptionist sessions.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Active ElevenLabs API Keys List</Label>
              {apiKeys.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  No API keys added yet. Add one below or rely on ELEVENLABS_API_KEY environment variable.
                </p>
              ) : (
                <div className="space-y-2">
                  {apiKeys.map((key, idx) => (
                    <div
                      key={key + idx}
                      className="flex items-center justify-between rounded-lg border bg-card p-2.5 text-xs font-mono"
                    >
                      <div className="flex items-center gap-2.5">
                        <Badge variant="secondary" className="text-[10px] font-sans">
                          Key #{idx + 1}
                        </Badge>
                        <span>
                          {key.slice(0, 8)}••••••••••••••••{key.slice(-6)}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveApiKey(key)}
                        className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Paste new ElevenLabs API Key (e.g. sk_...)"
                value={newKeyInput}
                onChange={(e) => setNewKeyInput(e.target.value)}
                className="font-mono text-xs flex-1"
              />
              <Button type="button" variant="outline" size="sm" onClick={handleAddApiKey} className="gap-1.5 shrink-0">
                <Plus className="size-3.5" /> Add Key
              </Button>
            </div>

            <div className="flex items-center justify-between pt-2">
              <p className="text-[11px] text-muted-foreground">
                {apiKeys.length > 1
                  ? "Requests will rotate round-robin across all keys automatically."
                  : "Add 2+ keys to enable multi-key auto-rotation."}
              </p>
              <Button type="submit" size="sm" disabled={savingElevenLabs} className="gap-2 bg-purple-600 text-white hover:bg-purple-700">
                <Save className="size-3.5" />
                {savingElevenLabs ? "Saving Keys..." : "Save ElevenLabs Settings"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Platform Contact Details */}
      <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="size-4 text-blue-600" />
            Platform Contact Information
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Set the official support phone number and email address for Oneboard. Updates immediately on the public website and contact page.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveContact} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="contact-phone" className="text-xs font-semibold">
                  Contact Phone Number
                </Label>
                <Input
                  id="contact-phone"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+2348168882014"
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contact-email" className="text-xs font-semibold">
                  Contact Email Address
                </Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="oneboardng@gmail.com"
                  className="font-mono text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <p className="text-[11px] text-muted-foreground">
                Current: {contactPhone} · {contactEmail}
              </p>
              <Button type="submit" size="sm" disabled={savingContact} className="gap-2 bg-blue-600 text-white hover:bg-blue-700">
                <Save className="size-3.5" />
                {savingContact ? "Saving Contact..." : "Save Contact Info"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Platform Pricing Settings */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings2 className="size-4 text-primary" />
            Platform Pricing Settings
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Set the USD price for Core, Engage, and Voice plans. Changes take effect immediately on billing pages, pricing page, and Paystack checkout.
          </p>
        </CardHeader>
        <CardContent>
          <form ref={priceFormRef} onSubmit={handleSavePrices}>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="core-price" className="text-xs font-semibold">
                  Core Plan — USD Price
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm text-muted-foreground">$</span>
                  <Input
                    id="core-price"
                    type="number"
                    min={0}
                    step={0.01}
                    value={prices.core}
                    onChange={(e) => setPrices((p) => ({ ...p, core: Number(e.target.value) }))}
                    className="pl-6 text-sm"
                    disabled={!pricesLoaded}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {prices.core === 0 ? "Free plan" : `≈ ₦${(prices.core * prices.usdToNgnRate).toLocaleString()} NGN`}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="engage-price" className="text-xs font-semibold">
                  Engage Plan — USD Price
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm text-muted-foreground">$</span>
                  <Input
                    id="engage-price"
                    type="number"
                    min={0}
                    step={0.01}
                    value={prices.engage}
                    onChange={(e) => setPrices((p) => ({ ...p, engage: Number(e.target.value) }))}
                    className="pl-6 text-sm"
                    disabled={!pricesLoaded}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  ≈ ₦{(prices.engage * prices.usdToNgnRate).toLocaleString()} NGN
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="voice-price" className="text-xs font-semibold">
                  Voice Plan — USD Price
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm text-muted-foreground">$</span>
                  <Input
                    id="voice-price"
                    type="number"
                    min={0}
                    step={0.01}
                    value={prices.voice}
                    onChange={(e) => setPrices((p) => ({ ...p, voice: Number(e.target.value) }))}
                    className="pl-6 text-sm"
                    disabled={!pricesLoaded}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  ≈ ₦{(prices.voice * prices.usdToNgnRate).toLocaleString()} NGN
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ngn-rate" className="text-xs font-semibold">
                  Exchange Rate (₦ per $1 USD)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm text-muted-foreground">₦</span>
                  <Input
                    id="ngn-rate"
                    type="number"
                    min={1}
                    step={1}
                    value={prices.usdToNgnRate}
                    onChange={(e) => setPrices((p) => ({ ...p, usdToNgnRate: Number(e.target.value) }))}
                    className="pl-6 text-sm"
                    disabled={!pricesLoaded}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Used for Paystack NGN conversion
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground">
                Prices update immediately on billing, pricing, and checkout pages.
              </p>
              <Button
                type="submit"
                size="sm"
                disabled={savingPrices || !pricesLoaded}
                className="gap-2"
              >
                <Save className="size-3.5" />
                {savingPrices ? "Saving..." : "Save Prices"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Badge className="bg-primary text-primary-foreground font-mono text-[10px] uppercase tracking-widest">
              Super Admin Platform
            </Badge>
            <span className="flex items-center gap-1 text-xs text-emerald-700 font-medium">
              <ShieldCheck className="size-3.5" /> Full Entity Control
            </span>
          </div>
          <h1 className="mt-2 font-heading text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            Business Entities Control Center
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage multi-tenant business entities with 100% data isolation, individual public URLs, and subscription overrides.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchOrganizations} disabled={loading}>
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="size-4" /> Provision New Business
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                Total Business Entities
              </p>
              <Building2 className="size-4 text-primary" />
            </div>
            <p className="mt-3 font-heading text-4xl font-semibold">{organizations.length}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Isolated database instances</p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                Total Appointments
              </p>
              <CalendarDays className="size-4 text-sky-500" />
            </div>
            <p className="mt-3 font-heading text-4xl font-semibold">{totalBookings}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Across all client public sites</p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                AI Concierge Chats
              </p>
              <Bot className="size-4 text-purple-500" />
            </div>
            <p className="mt-3 font-heading text-4xl font-semibold">{totalConversations}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Text & live voice sessions</p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                Active Offerings
              </p>
              <CircleDollarSign className="size-4 text-emerald-500" />
            </div>
            <p className="mt-3 font-heading text-4xl font-semibold">{totalOfferings}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Services bookable online</p>
          </CardContent>
        </Card>
      </div>

      {/* Data Isolation Notice */}
      <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs text-primary-foreground dark:text-foreground">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
        <div>
          <p className="font-semibold text-foreground">Strict Business Data Isolation Enforced</p>
          <p className="mt-0.5 text-muted-foreground">
            Every business entity has its own unique <code className="rounded bg-black/10 px-1 py-0.5 font-mono text-[11px]">organizationId</code>. Bookings, team members, availability schedules, knowledge items, and AI concierge memories are strictly scoped to ensure complete privacy and isolation between businesses.
          </p>
        </div>
      </div>

      {/* Business Entities Table */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Filter by business name, slug, or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Showing {filtered.length} of {organizations.length} business entities
          </p>
        </div>

        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 text-[11px] uppercase tracking-wider">
                <TableHead>Business Entity</TableHead>
                <TableHead>Live Public Page</TableHead>
                <TableHead>Region & Currency</TableHead>
                <TableHead>Subscription Plan</TableHead>
                <TableHead>Isolated Data Stats</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-xs text-muted-foreground">
                    Loading business entities...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-xs text-muted-foreground">
                    No business entities found matching your search.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((org) => (
                  <TableRow key={org._id} className="text-xs">
                    <TableCell className="font-medium">
                      <div>
                        <p className="font-semibold text-foreground">{org.name}</p>
                        <p className="font-mono text-[10px] text-muted-foreground">{org.slug}</p>
                      </div>
                    </TableCell>
                    <TableCell>
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
                        <span className="font-medium text-foreground">{org.currency}</span> · {org.timezone}
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
                          <CalendarDays className="size-3 text-sky-500" /> {org.stats.bookingsCount} bookings
                        </Badge>
                        <Badge variant="outline" className="gap-1 font-mono">
                          <Bot className="size-3 text-purple-500" /> {org.stats.conversationsCount} chats
                        </Badge>
                        <Badge variant="outline" className="gap-1 font-mono">
                          <UsersRound className="size-3 text-emerald-500" /> {org.stats.teamMembersCount} team
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
              <Label htmlFor="org-name" className="text-xs font-medium">
                Business Name
              </Label>
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
                <Label htmlFor="org-tz" className="text-xs font-medium">
                  Timezone
                </Label>
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
                <Label htmlFor="org-currency" className="text-xs font-medium">
                  Currency
                </Label>
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
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creating} className="gap-2">
                {creating ? "Provisioning..." : "Provision Entity"}
              </Button>
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
            <Button variant="outline" onClick={() => setDeletingId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingId && handleDelete(deletingId)}
            >
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
