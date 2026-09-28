"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CalendarDays,
  LockKeyhole,
  ShoppingBag,
  Layers3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/components/dashboard/workspace-context";
import type { ReactNode } from "react";

type BusinessModel = "services" | "ecommerce" | "hybrid";

/** Pages that require the "services" capability (bookings, offerings, team, etc.) */
const SERVICES_PAGES = new Set([
  "bookings",
  "offerings",
  "team",
  "locations",
  "availability",
  "staff-portal",
]);

/** Pages that require the "ecommerce" capability (products, orders, collections, shipping) */
const ECOMMERCE_PAGES = new Set([
  "products",
  "collections",
  "orders",
  "shipping",
]);

function hasServicesCapability(model: BusinessModel) {
  return model === "services" || model === "hybrid";
}

function hasCommerceCapability(model: BusinessModel) {
  return model === "ecommerce" || model === "hybrid";
}

/** Returns null if access is allowed, or a description of what's blocked */
function checkAccess(
  segment: string,
  model: BusinessModel,
): { blocked: boolean; requiredCapability: "services" | "ecommerce" | null } {
  if (SERVICES_PAGES.has(segment) && !hasServicesCapability(model)) {
    return { blocked: true, requiredCapability: "services" };
  }
  if (ECOMMERCE_PAGES.has(segment) && !hasCommerceCapability(model)) {
    return { blocked: true, requiredCapability: "ecommerce" };
  }
  return { blocked: false, requiredCapability: null };
}

// ─── Blocked-access UI ───────────────────────────────────────────────────────

function BlockedPage({
  requiredCapability,
  orgSlug,
  currentModel,
}: {
  requiredCapability: "services" | "ecommerce";
  orgSlug: string;
  currentModel: BusinessModel;
}) {
  const isServicesNeeded = requiredCapability === "services";
  const Icon = isServicesNeeded ? CalendarDays : ShoppingBag;
  const capabilityLabel = isServicesNeeded
    ? "Services & Appointments Suite"
    : "Commerce & Online Store Suite";
  const switchTarget =
    currentModel === "services" ? "hybrid or ecommerce" : "hybrid or services";

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="mx-auto flex size-16 items-center justify-center rounded-2xl border border-black/10 bg-white shadow-sm mb-6">
        <LockKeyhole className="size-7 text-muted-foreground" />
      </div>
      <p className="text-2xs font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-2">
        Suite not active
      </p>
      <h1 className="font-heading text-2xl font-semibold tracking-tight mb-3">
        {capabilityLabel} required
      </h1>
      <p className="text-sm text-muted-foreground max-w-md leading-6 mb-8">
        This section is part of the{" "}
        <span className="font-semibold text-foreground">{capabilityLabel}</span>
        , which isn&apos;t active in your current workspace configuration. Switch
        to {switchTarget} in Settings to unlock it.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <Button asChild>
          <Link href={`/app/${orgSlug}/settings`}>
            <Layers3 className="size-4" />
            Switch suite in Settings
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/app/${orgSlug}`}>
            <Icon className="size-4" />
            Back to overview
          </Link>
        </Button>
      </div>

      <div className="mt-10 rounded-xl border border-dashed border-black/10 bg-muted/30 p-4 max-w-sm text-left">
        <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Your active suite
        </p>
        <div className="flex items-center gap-2">
          {currentModel === "services" ? (
            <>
              <CalendarDays className="size-4 text-sky-500" />
              <span className="text-sm font-semibold">Services Suite</span>
              <span className="ml-auto text-2xs text-muted-foreground bg-sky-50 border border-sky-200 text-sky-700 rounded px-1.5 py-0.5">Active</span>
            </>
          ) : currentModel === "ecommerce" ? (
            <>
              <ShoppingBag className="size-4 text-emerald-500" />
              <span className="text-sm font-semibold">Commerce Suite</span>
              <span className="ml-auto text-2xs text-muted-foreground bg-emerald-50 border border-emerald-200 text-emerald-700 rounded px-1.5 py-0.5">Active</span>
            </>
          ) : (
            <>
              <Layers3 className="size-4 text-indigo-500" />
              <span className="text-sm font-semibold">Hybrid Suite</span>
              <span className="ml-auto text-2xs text-muted-foreground bg-indigo-50 border border-indigo-200 text-indigo-700 rounded px-1.5 py-0.5">Active</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Guard Component ────────────────────────────────────────────────────

/**
 * BusinessModelGuard
 *
 * Wraps a dashboard page and blocks rendering if the current business model
 * doesn't support that section. Accepts a `segment` prop matching the URL
 * segment (e.g. "products", "bookings").
 *
 * Instead of a hard redirect, it renders a friendly "suite not active" screen
 * so the user understands what happened and how to fix it.
 */
export function BusinessModelGuard({
  segment,
  children,
}: {
  segment: string;
  children: ReactNode;
}) {
  const { organization, orgSlug, isBootstrapping } = useWorkspace();

  // While bootstrapping, don't block — let children render (or show skeleton)
  if (isBootstrapping || !organization) {
    return <>{children}</>;
  }

  const model = (organization.businessModel ?? "services") as BusinessModel;
  const { blocked, requiredCapability } = checkAccess(segment, model);

  if (blocked && requiredCapability) {
    return (
      <BlockedPage
        requiredCapability={requiredCapability}
        orgSlug={orgSlug}
        currentModel={model}
      />
    );
  }

  return <>{children}</>;
}
