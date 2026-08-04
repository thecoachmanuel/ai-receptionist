"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

  useEffect(() => {
    if (isLoaded && isAuthenticated) {
      router.replace("/app");
    }
  }, [isAuthenticated, isLoaded, router]);

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

      if (typeof window !== "undefined") {
        await new Promise((resolve) => setTimeout(resolve, 150));
        window.location.replace(`/app/${data.orgSlug}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell eyebrow="Get started" title="Build your AI front desk">
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
        <Button type="submit" className="w-full h-11 text-sm font-medium" disabled={loading}>
          {loading ? "Creating account..." : "Start free workspace"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Already have an account?{" "}
          <Link href="/sign-in" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
