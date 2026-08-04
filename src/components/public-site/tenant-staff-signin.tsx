"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarCheck, MapPin, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { clearAllCache } from "@/lib/api-client/use-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PublishedSite } from "@/components/public-site/types";

function safeHttpUrl(value?: string) {
  if (!value) return undefined;
  if (value.startsWith("/") || value.startsWith("data:image/")) return value;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" || url.protocol === "data:"
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function TenantStaffSignInScreen({
  publishedSite,
  siteSlug,
}: {
  publishedSite: PublishedSite;
  siteSlug: string;
}) {
  const router = useRouter();
  const { organization, site } = publishedSite;
  const { config } = site;
  const businessName = config?.businessName || site?.businessName || organization.name;

  // Resolve business accent color chosen in site configuration
  const accentColor =
    config?.theme?.accentColor ||
    site?.primaryColor ||
    "#2446D8";

  // Resolve exact business logo URL
  const logoUrl =
    safeHttpUrl(config?.logoUrl) ||
    safeHttpUrl(config?.logo) ||
    safeHttpUrl(config?.brandLogo) ||
    safeHttpUrl((organization as any)?.logoUrl) ||
    safeHttpUrl((organization as any)?.logo);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Invalid staff credentials.");
      }

      clearAllCache();
      toast.success(`Welcome back to ${businessName} Staff Portal!`);

      if (typeof window !== "undefined") {
        await new Promise((resolve) => setTimeout(resolve, 100));
        window.location.replace(`/${siteSlug}/staff-portal`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
      setLoading(false);
    }
  };

  const signals = [
    { icon: CalendarCheck, label: "Daily appointment schedule & client queues" },
    { icon: MapPin, label: "Multi-branch location management" },
    { icon: UserCheck, label: "Client details & history tracking" },
  ];

  return (
    <main
      className="grid min-h-dvh bg-card lg:grid-cols-[minmax(0,0.95fr)_minmax(560px,1.05fr)]"
      style={
        {
          "--primary": accentColor,
          "--ring": accentColor,
        } as React.CSSProperties
      }
    >
      {/* Left Panel - Tenant Brand Hero styled with business accent color & exact business logo */}
      <section className="relative hidden min-h-dvh overflow-hidden bg-[#151923] px-12 py-10 text-white lg:flex lg:flex-col">
        <div className="absolute inset-0 hairline-grid opacity-[0.09]" />
        
        {/* Accent circles matching business theme */}
        <div
          className="absolute -right-44 top-1/4 size-[460px] rounded-full border opacity-30"
          style={{ borderColor: accentColor }}
        />
        <div
          className="absolute -right-20 top-[34%] size-[250px] rounded-full border opacity-20"
          style={{ borderColor: accentColor }}
        />

        {/* Exact Business Logo & Brand Header */}
        <div className="relative z-10 flex items-center gap-3.5">
          {logoUrl ? (
            <div className="flex size-12 items-center justify-center rounded-2xl bg-white p-1.5 shadow-lg border border-white/20 overflow-hidden shrink-0">
              <img
                src={logoUrl}
                alt={businessName}
                className="max-h-full max-w-full object-contain rounded-xl"
              />
            </div>
          ) : (
            <div
              className="flex size-12 items-center justify-center rounded-2xl text-white font-heading font-bold text-lg shadow-lg border border-white/20 shrink-0"
              style={{ backgroundColor: accentColor }}
            >
              {getInitials(businessName)}
            </div>
          )}
          <div>
            <h2 className="font-heading text-xl font-bold tracking-tight text-white">{businessName}</h2>
            <p className="text-[10px] text-white/60 uppercase tracking-widest font-mono">Staff Operating Portal</p>
          </div>
        </div>

        <div className="relative z-10 my-auto max-w-xl py-16">
          <p
            className="mb-4 font-mono text-[11px] font-medium uppercase tracking-[0.22em]"
            style={{ color: accentColor }}
          >
            Staff Workspace
          </p>
          <h1 className="font-heading text-5xl font-medium leading-[0.96] tracking-[-0.04em] text-balance">
            Empowering {businessName} staff with seamless daily operations.
          </h1>
          <div className="mt-10 grid gap-4">
            {signals.map(({ icon: Icon, label }, index) => (
              <div
                key={label}
                className="flex items-center gap-4 border-t border-white/12 pt-4"
              >
                <span className="font-mono text-[10px] text-white/35">
                  0{index + 1}
                </span>
                <Icon className="size-4" style={{ color: accentColor }} />
                <span className="text-sm text-white/78">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 max-w-md text-xs leading-5 text-white/45">
          Dedicated operational dashboard for {businessName} staff members.
        </p>
      </section>

      {/* Right Panel - Sign In Form */}
      <section className="flex min-h-dvh flex-col bg-background">
        <header className="flex items-center justify-between px-6 py-6 sm:px-10">
          <div className="flex items-center gap-3 lg:hidden">
            {logoUrl ? (
              <div className="flex size-9 items-center justify-center rounded-xl bg-white p-1 shadow-sm border border-black/10 overflow-hidden shrink-0">
                <img
                  src={logoUrl}
                  alt={businessName}
                  className="max-h-full max-w-full object-contain rounded-lg"
                />
              </div>
            ) : (
              <div
                className="flex size-9 items-center justify-center rounded-xl text-white font-heading font-bold text-xs shadow-sm shrink-0"
                style={{ backgroundColor: accentColor }}
              >
                {getInitials(businessName)}
              </div>
            )}
            <span className="font-heading text-base font-semibold">{businessName}</span>
          </div>

          <Link
            href={`/${siteSlug}`}
            className="ml-auto inline-flex items-center gap-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Back to {businessName}
          </Link>
        </header>

        <div className="flex flex-1 items-center justify-center px-6 pb-16 pt-4 sm:px-10">
          <div className="w-full max-w-[440px]">
            <p
              className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em]"
              style={{ color: accentColor }}
            >
              Staff Portal Access
            </p>
            <h2 className="mb-2 mt-3 font-heading text-4xl font-medium tracking-[-0.04em]">
              Sign in to {businessName}
            </h2>
            <p className="mb-8 text-xs text-muted-foreground">
              Enter your staff credentials to open your daily operating schedule and client portal.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-xs font-medium text-destructive">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="staff-email" className="text-xs">Staff Email address</Label>
                <Input
                  id="staff-email"
                  type="email"
                  placeholder="staff@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-10 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff-password" className="text-xs">Password</Label>
                <Input
                  id="staff-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-10 text-sm"
                />
              </div>
              <Button
                type="submit"
                className="w-full h-10 text-xs font-semibold shadow-md transition-opacity hover:opacity-90"
                style={{ backgroundColor: accentColor, color: "#ffffff" }}
                disabled={loading}
              >
                {loading ? "Signing in..." : `Sign in to ${businessName}`}
              </Button>
              <p className="pt-2 text-center text-xs text-muted-foreground">
                Need staff access? Contact your workspace administrator for account setup.
              </p>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
