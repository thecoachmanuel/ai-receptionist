"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { clearAllCache } from "@/lib/api-client/use-data";
import { useAuth } from "@/lib/auth/context";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || searchParams.get("redirect_url");
  const { isAuthenticated, isLoaded } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isLoaded && isAuthenticated) {
      router.replace(redirectUrl || "/app");
    }
  }, [isAuthenticated, isLoaded, redirectUrl, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Sign in failed");
      }

      // Completely wipe any stale memory/storage cache from previous account before entering workspace.
      // Do NOT write to sessionStorage here — it is unreliable across navigations on mobile browsers
      // (Safari/Android kill sessionStorage when the tab is backgrounded or navigated away).
      // The AuthProvider's fetchSession() rehydrates client state from the HTTP-only cookie via /api/auth/me.
      clearAllCache();

      setSuccess("Welcome back! Signed in successfully. Redirecting to workspace...");
      toast.success("Welcome back! Signed in successfully.");

      const defaultTarget = (data.role === "member" || data.role === "operator") && data.orgSlug
        ? `/${data.orgSlug}/staff-portal`
        : data.orgSlug ? `/app/${data.orgSlug}` : "/app";
      const targetUrl = redirectUrl || defaultTarget;

      // Hard-navigate so the browser sends the newly set session cookie with
      // the very first request to the protected route (goes through middleware).
      // window.location.replace() is the most reliable approach across all mobile
      // browsers since router.push() + router.refresh() was causing exceptions.
      window.location.replace(targetUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {success && (
        <div className="rounded-md bg-emerald-50 border border-emerald-200 p-3 text-xs font-medium text-emerald-800 animate-in fade-in duration-200">
          ✓ {success}
        </div>
      )}
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-xs text-red-700 animate-in fade-in duration-200">
          {error}
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Signing in..." : "Sign in"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/sign-up" className="font-semibold text-primary hover:underline">
          Sign up
        </Link>
      </p>
    </form>
  );
}

export default function SignInPage() {
  return (
    <AuthShell eyebrow="Welcome back" title="Open your workspace">
      <Suspense fallback={<div className="p-4 text-center text-xs text-muted-foreground">Loading sign in...</div>}>
        <SignInForm />
      </Suspense>
    </AuthShell>
  );
}
