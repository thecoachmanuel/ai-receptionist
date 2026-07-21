"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
};

export type AuthOrg = {
  id: string;
  clerkOrgId: string;
  name: string;
  slug: string;
  timezone: string;
  currency: string;
  locale: string;
  plan: string;
  role?: string;
};

export type UserOrgSummary = {
  id: string;
  clerkOrgId: string;
  name: string;
  slug: string;
  role: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  organization: AuthOrg | null;
  orgSlug: string | null;
  orgId: string | null;
  userId: string | null;
  userOrganizations: UserOrgSummary[];
  isLoaded: boolean;
  isAuthenticated: boolean;
  role?: string;
  permissions: string[];
  switchOrganization: (orgIdOrSlug: string) => Promise<void>;
  createOrganization: (name: string) => Promise<{ slug: string }>;
  updatePlan: (plan: "free_org" | "engage" | "voice") => Promise<void>;
  signOut: () => Promise<void>;
  has: (check: { permission?: string; role?: string; plan?: string; feature?: string }) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [organization, setOrganization] = useState<AuthOrg | null>(null);
  const [userOrganizations, setUserOrganizations] = useState<UserOrgSummary[]>([]);
  const [role, setRole] = useState<string | undefined>(undefined);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const fetchSession = async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user || null);
        setOrganization(data.organization || null);
        setUserOrganizations(data.userOrganizations || []);
        setRole(data.role);
        setPermissions(data.permissions || []);
      } else {
        setUser(null);
        setOrganization(null);
        setUserOrganizations([]);
      }
    } catch (err) {
      console.error("Failed to load auth session", err);
    } finally {
      setIsLoaded(true);
    }
  };

  useEffect(() => {
    void fetchSession();
  }, []);

  const switchOrganization = async (orgIdOrSlug: string) => {
    const res = await fetch("/api/auth/switch-org", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgIdOrSlug }),
    });
    if (res.ok) {
      const data = await res.json();
      await fetchSession();
      router.push(`/app/${data.slug}`);
    } else {
      throw new Error("Failed to switch organization.");
    }
  };

  const createOrganization = async (name: string) => {
    const res = await fetch("/api/auth/create-org", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const data = await res.json();
      await fetchSession();
      return { slug: data.slug };
    }
    throw new Error("Failed to create organization.");
  };

  const updatePlan = async (plan: "free_org" | "engage" | "voice") => {
    if (!organization?.id) return;
    const res = await fetch("/api/auth/update-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId: organization.id, plan }),
    });
    if (res.ok) {
      await fetchSession();
    } else {
      throw new Error("Failed to update plan.");
    }
  };

  const signOut = async () => {
    await fetch("/api/auth/sign-out", { method: "POST" });
    setUser(null);
    setOrganization(null);
    router.push("/sign-in");
  };

  const has = (check: { permission?: string; role?: string; plan?: string; feature?: string }) => {
    if (!user || !organization) return false;

    if (check.role) {
      const currentRole = role || "member";
      const candidateRole = check.role.startsWith("org:") ? check.role.slice(4) : check.role;
      if (candidateRole === "admin" && (currentRole === "admin" || currentRole === "owner")) return true;
      if (candidateRole === "operator" && (currentRole === "admin" || currentRole === "operator" || currentRole === "owner")) return true;
      if (currentRole === candidateRole) return true;
    }

    if (check.permission) {
      const p = check.permission.startsWith("org:") ? check.permission : `org:${check.permission}`;
      if (permissions.includes(p) || role === "admin" || role === "owner") return true;
    }

    if (check.plan) {
      const planKey = check.plan.startsWith("org:") ? check.plan.slice(4) : check.plan;
      if (organization.plan === planKey) return true;
      if (planKey === "engage" && organization.plan === "voice") return true;
    }

    if (check.feature) {
      const plan = organization.plan || "free_org";
      if (check.feature === "operations_hub" || check.feature === "custom_public_page") return true;
      if (check.feature === "web_agent" && (plan === "engage" || plan === "voice")) return true;
      if (check.feature === "browser_voice" || check.feature === "advanced_analytics") return plan === "voice";
    }

    return false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        orgSlug: organization?.slug || null,
        orgId: organization?.id || null,
        userId: user?.id || null,
        userOrganizations,
        isLoaded,
        isAuthenticated: Boolean(user),
        role,
        permissions,
        switchOrganization,
        createOrganization,
        updatePlan,
        signOut,
        has,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}

export function useOrganization() {
  const ctx = useAuth();
  return {
    organization: ctx.organization
      ? {
          id: ctx.organization.id,
          name: ctx.organization.name,
          slug: ctx.organization.slug,
        }
      : null,
    isLoaded: ctx.isLoaded,
  };
}
