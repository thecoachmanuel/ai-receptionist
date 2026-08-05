"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useAuth } from "@/lib/auth/context";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignUpPage() {
  const router = useRouter();
  const { isAuthenticated, isLoaded } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleAuthEnabled, setGoogleAuthEnabled] = useState(true);

  useEffect(() => {
    if (isLoaded && isAuthenticated) {
      router.replace("/app");
    }
  }, [isAuthenticated, isLoaded, router]);

  useEffect(() => {
    async function checkPublicSettings() {
      try {
        const res = await fetch("/api/public/settings");
        if (res.ok) {
          const data = await res.json();
          setGoogleAuthEnabled(data.googleAuthEnabled !== false);
        }
      } catch {}
    }
    void checkPublicSettings();
  }, []);

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
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Sign up failed");
      }

      // Also trigger NextAuth sign in
      await signIn("credentials", {
        email: formEmail,
        password: formPassword,
        redirect: false,
      });

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
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
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
              placeholder="e.g. Oneboard Barbershop"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              className="h-11 text-base sm:text-sm"
            />
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
          <Button type="submit" className="w-full h-11 text-sm font-medium cursor-pointer" disabled={loading || googleLoading}>
            {loading ? "Creating account..." : "Start free workspace"}
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
