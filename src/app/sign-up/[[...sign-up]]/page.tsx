"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useAuth } from "@/lib/auth/context";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Check,
  ShieldCheck,
  Briefcase,
  Camera,
  Dumbbell,
  Headphones,
  HeartPulse,
  Scissors,
  SlidersHorizontal,
  Smile,
  Sparkles,
  Zap,
} from "lucide-react";
import type { PlanType } from "@/lib/db/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BUSINESS_PRESET_LIST,
  getBusinessPreset,
  type BusinessPresetId,
} from "@/lib/business-presets";

const PRESET_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  barber: Scissors,
  salon: Sparkles,
  clinic: HeartPulse,
  dental: Smile,
  spa: Sparkles,
  consulting: Briefcase,
  fitness: Dumbbell,
  support: Headphones,
  photography: Camera,
  general: SlidersHorizontal,
};

type BillingCycle = "monthly" | "yearly";

export default function SignUpPage() {
  const router = useRouter();
  const { isAuthenticated, isLoaded } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [businessType, setBusinessType] = useState<BusinessPresetId>("barber");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleAuthEnabled, setGoogleAuthEnabled] = useState(true);
  const [enforcePayment, setEnforcePayment] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>("free_org");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [planPrices, setPlanPrices] = useState({ core: 1000, engage: 5000, voice: 15000 });

  const activePreset = getBusinessPreset(businessType);

  const yearlyPrice = (p: number) => p * 10;
  const displayPrice = (monthly: number) =>
    billingCycle === "yearly" ? yearlyPrice(monthly) : monthly;

  useEffect(() => {
    if (isLoaded && isAuthenticated) {
      router.replace("/app");
    }
  }, [isAuthenticated, isLoaded, router]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlPlan = params.get("plan");
      const urlCycle = params.get("cycle");
      if (urlPlan === "voice") setSelectedPlan("voice");
      else if (urlPlan === "engage") setSelectedPlan("engage");
      else if (urlPlan === "core") setSelectedPlan("free_org");
      if (urlCycle === "yearly") setBillingCycle("yearly");
    }

    async function checkPublicSettings() {
      try {
        const res = await fetch("/api/public/settings");
        if (res.ok) {
          const data = await res.json();
          setGoogleAuthEnabled(data.googleAuthEnabled !== false);
          setEnforcePayment(data.enforcePaymentOnSignup !== false);
          if (data.planPrices) {
            setPlanPrices({
              core: data.planPrices.core ?? 1000,
              engage: data.planPrices.engage ?? 5000,
              voice: data.planPrices.voice ?? 15000,
            });
          }
        }
      } catch {}
    }
    void checkPublicSettings();
  }, []);

  const currentPrice =
    selectedPlan === "voice"
      ? planPrices.voice
      : selectedPlan === "engage"
        ? planPrices.engage
        : planPrices.core;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.target as HTMLFormElement);
    const formName = ((formData.get("name") as string) || name || "").trim();
    const formEmail = ((formData.get("email") as string) || email || "").trim();
    const formPassword = ((formData.get("password") as string) || password || "").trim();
    const formOrg = ((formData.get("organizationName") as string) || organizationName || "").trim();

    if (!formName || !formEmail || !formPassword) {
      setError("Full name, email, and password are required.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/sign-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          email: formEmail,
          password: formPassword,
          organizationName: formOrg,
          businessType,
          plan: selectedPlan,
          billingCycle,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Sign up failed");
      }

      await signIn("credentials", {
        email: formEmail,
        password: formPassword,
        redirect: false,
      });

      if (data.paymentRequired && data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
        return;
      }

      if (data.billingUrl) {
        window.location.href = data.billingUrl;
        return;
      }

      if (typeof window !== "undefined") {
        await new Promise((resolve) => setTimeout(resolve, 150));
        window.location.replace(`/app/${data.orgSlug}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      if (typeof document !== "undefined") {
        document.cookie = `qwilo_chosen_plan=${selectedPlan}; path=/; max-age=3600; SameSite=Lax`;
        document.cookie = `qwilo_chosen_cycle=${billingCycle}; path=/; max-age=3600; SameSite=Lax`;
        document.cookie = `qwilo_business_type=${businessType}; path=/; max-age=3600; SameSite=Lax`;
        if (organizationName.trim()) {
          document.cookie = `qwilo_org_name=${encodeURIComponent(organizationName.trim())}; path=/; max-age=3600; SameSite=Lax`;
        }
      }
      await signIn("google", { callbackUrl: "/app" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google Sign-Up failed");
      setGoogleLoading(false);
    }
  };

  return (
    <AuthShell eyebrow="Get started" title="Build your AI front desk">
      <div className="space-y-6">
        {googleAuthEnabled && (
          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              className="w-full h-11 text-sm font-medium gap-2 border-border/80 hover:bg-accent cursor-pointer"
              onClick={handleGoogleSignUp}
              disabled={googleLoading || loading}
            >
              <svg className="size-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              {googleLoading ? "Connecting to Google..." : "Sign up with Google"}
            </Button>
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/60" />
              </div>
              <span className="relative bg-background px-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Or create credentials
              </span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-xs text-red-700">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              placeholder="Jane Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="h-11 text-base sm:text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="jane@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-11 text-base sm:text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org">Organization / Business name</Label>
            <Input
              id="org"
              name="organizationName"
              type="text"
              autoComplete="organization"
              placeholder="e.g. Qwilo Barbershop"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              className="h-11 text-base sm:text-sm"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="businessType" className="text-sm font-semibold">
                Business type / Industry
              </Label>
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                Preset terminology
              </span>
            </div>
            <Select
              value={businessType}
              onValueChange={(val) => setBusinessType(val as BusinessPresetId)}
            >
              <SelectTrigger id="businessType" className="h-11 w-full text-base sm:text-sm bg-background">
                <SelectValue placeholder="Select your industry..." />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {BUSINESS_PRESET_LIST.map((preset) => {
                  const Icon = PRESET_ICONS[preset.id] || SlidersHorizontal;
                  return (
                    <SelectItem key={preset.id} value={preset.id} className="cursor-pointer py-2">
                      <div className="flex items-center gap-2.5">
                        <Icon className="size-4 text-primary shrink-0" />
                        <div className="flex flex-col text-left">
                          <span className="font-medium text-xs text-foreground">{preset.label}</span>
                          <span className="text-[10px] text-muted-foreground">{preset.description}</span>
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Configures custom terminology ({activePreset.terminology.teamMemberPlural}, {activePreset.terminology.offeringPlural}), booking page copy, and AI receptionist greeting.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="h-11 text-base sm:text-sm"
            />
          </div>

          <div className="space-y-3 pt-1">
            {/* Plan selector */}
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground">Select Subscription Plan</Label>
              <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                {enforcePayment ? "Compulsory on signup" : "14-day free trial on selected plan"}
              </span>
            </div>

            {/* Billing cycle toggle */}
            <div className="inline-flex items-center rounded-full border border-border bg-muted/60 p-1 gap-1">
              <button
                type="button"
                onClick={() => setBillingCycle("monthly")}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  billingCycle === "monthly"
                    ? "bg-white text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle("yearly")}
                className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  billingCycle === "yearly"
                    ? "bg-white text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Yearly
                <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[8px] font-bold uppercase text-white">
                  <Zap className="size-2" />2 FREE
                </span>
              </button>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              {[
                { id: "free_org" as const, name: "Core", price: planPrices.core, desc: "Bookings & public site" },
                { id: "engage" as const, name: "Engage", price: planPrices.engage, desc: "AI text assistant" },
                { id: "voice" as const, name: "Voice", price: planPrices.voice, desc: "Live browser audio" },
              ].map((p) => {
                const isSelected = selectedPlan === p.id;
                const shown = displayPrice(p.price);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPlan(p.id)}
                    className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                        : "border-border/70 bg-card hover:border-border hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-semibold text-xs text-foreground">{p.name}</span>
                      {isSelected && <Check className="size-3.5 text-primary" />}
                    </div>
                    <span className="font-heading text-sm font-bold text-foreground mt-1">
                      ₦{shown.toLocaleString()}
                      <span className="text-[10px] font-normal text-muted-foreground">
                        /{billingCycle === "yearly" ? "yr" : "mo"}
                      </span>
                    </span>
                    {billingCycle === "yearly" && (
                      <span className="text-[9px] text-emerald-700 font-medium">2 months free</span>
                    )}
                    <span className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{p.desc}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 pt-0.5">
              <ShieldCheck className="size-3.5 text-emerald-600 shrink-0" />
              Paystack secured Nigerian Naira (₦) checkout.
            </p>
          </div>

          <Button
            type="submit"
            className="w-full h-11 text-sm font-medium cursor-pointer"
            disabled={loading || googleLoading}
          >
            {loading
              ? enforcePayment
                ? "Connecting to Paystack..."
                : "Creating workspace..."
              : enforcePayment
                ? `Pay ₦${displayPrice(currentPrice).toLocaleString()}/${billingCycle === "yearly" ? "yr" : "mo"} with Paystack`
                : `Get Started with ${selectedPlan === "voice" ? "Voice" : selectedPlan === "engage" ? "Engage" : "Core"} (₦${displayPrice(currentPrice).toLocaleString()}/${billingCycle === "yearly" ? "yr" : "mo"})`}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link href="/sign-in" className="font-semibold text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </AuthShell>
  );
}
