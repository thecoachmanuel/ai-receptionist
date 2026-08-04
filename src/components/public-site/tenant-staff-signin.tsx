"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { clearAllCache } from "@/lib/api-client/use-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PublishedSite } from "@/components/public-site/types";

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
  const businessName = config.businessName || organization.name;

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

      if (typeof window !== "undefined" && data.user && data.organization) {
        sessionStorage.setItem("oneboard_auth_user", JSON.stringify(data.user));
        sessionStorage.setItem("oneboard_auth_org", JSON.stringify(data.organization));
        if (data.permissions) sessionStorage.setItem("oneboard_auth_permissions", JSON.stringify(data.permissions));
        if (data.role) sessionStorage.setItem("oneboard_auth_role", JSON.stringify(data.role));
      }

      toast.success(`Welcome back to ${businessName} Staff Portal!`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-svh place-items-center bg-[#faf9f5] px-4 py-12">
      <Card className="w-full max-w-md border-black/10 bg-white shadow-xl">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 overflow-hidden">
            {config.logoUrl ? (
              <img
                src={config.logoUrl}
                alt={businessName}
                className="size-9 rounded-xl object-cover"
              />
            ) : (
              <ShieldCheck className="size-6 text-primary" />
            )}
          </div>
          <Badge variant="outline" className="mx-auto bg-primary/5 text-primary border-primary/20 text-[10px] uppercase tracking-wider px-2.5 py-0.5 mb-1">
            Staff Portal Access
          </Badge>
          <CardTitle className="font-heading text-2xl font-bold tracking-tight">
            {businessName}
          </CardTitle>
          <CardDescription className="text-xs">
            Sign in to access your daily schedule, manage appointments, and view client details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs font-medium text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="staff-email" className="text-xs">Staff Email Address</Label>
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
            <div className="space-y-1.5">
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
            <Button type="submit" className="w-full h-10 text-xs font-semibold" disabled={loading}>
              {loading ? "Verifying staff access..." : `Sign in to ${businessName}`}
            </Button>
            <div className="pt-2 text-center text-[11px] text-muted-foreground">
              Need access? Contact your workspace administrator for account setup.
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
