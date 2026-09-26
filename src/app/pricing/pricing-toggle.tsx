"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

type Plan = {
  name: string;
  planKey: "free_org" | "engage" | "voice";
  monthlyPrice: number;
  description: string;
  features: string[];
  featured?: boolean;
};

export function PricingTogglePage({
  plans,
  userId,
}: {
  plans: Plan[];
  userId: string | null;
}) {
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  const sym = "₦";
  const yearlyPrice = (p: number) => p * 10;

  return (
    <>
      {/* Toggle */}
      <div className="mb-10 flex justify-center">
        <div className="inline-flex items-center rounded-lg border border-border/70 bg-muted/40 p-1">
          <button
            onClick={() => setCycle("monthly")}
            className={`rounded-md px-5 py-2 text-sm font-medium transition-all ${
              cycle === "monthly"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setCycle("yearly")}
            className={`flex items-center gap-2 rounded-md px-5 py-2 text-sm font-medium transition-all ${
              cycle === "yearly"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Yearly
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold tracking-wide text-emerald-700">
              2 MONTHS FREE
            </span>
          </button>
        </div>
      </div>

      <div className="grid border-l border-t lg:grid-cols-3">
        {plans.map((plan) => {
          const displayPrice =
            cycle === "yearly" ? yearlyPrice(plan.monthlyPrice) : plan.monthlyPrice;
          const signUpHref = userId
            ? "/app"
            : `/sign-up?plan=${plan.planKey === "free_org" ? "core" : plan.planKey}&cycle=${cycle}`;
          const btnLabel = userId ? "Manage in workspace" : "Create an organization";

          return (
            <article
              key={plan.name}
              className={`flex min-h-[460px] flex-col border-b border-r p-8 transition-all ${
                plan.featured ? "bg-primary text-primary-foreground" : "bg-card"
              }`}
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] opacity-60">
                {plan.name}
              </p>

              <div className="mt-8">
                <p className="font-heading text-6xl tracking-[-0.06em]">
                  {sym}{displayPrice.toLocaleString()}
                  <span className="ml-1 font-sans text-xs tracking-normal opacity-60">
                    /{cycle === "yearly" ? "yr" : "mo"}
                  </span>
                </p>
                {cycle === "yearly" && (
                  <p
                    className={`mt-1 text-[11px] line-through ${
                      plan.featured ? "text-primary-foreground/50" : "text-muted-foreground"
                    }`}
                  >
                    {sym}{(plan.monthlyPrice * 12).toLocaleString()}/yr
                  </p>
                )}
                {cycle === "monthly" && (
                  <p
                    className={`mt-1 text-[11px] font-medium ${
                      plan.featured ? "text-primary-foreground/60" : "text-emerald-700"
                    }`}
                  >
                    or {sym}{yearlyPrice(plan.monthlyPrice).toLocaleString()}/yr (save 2 months)
                  </p>
                )}
              </div>

              <p className="mt-4 text-sm leading-6 opacity-65">{plan.description}</p>

              <div className="mt-8 space-y-3 border-t border-current/15 pt-6">
                {plan.features.map((feature) => (
                  <p key={feature} className="flex items-center gap-2 text-sm">
                    <Check className="size-3.5" /> {feature}
                  </p>
                ))}
              </div>

              <Button
                asChild
                variant={plan.featured ? "secondary" : "outline"}
                className="mt-auto shadow-none"
              >
                <Link href={signUpHref}>{btnLabel}</Link>
              </Button>
            </article>
          );
        })}
      </div>
    </>
  );
}
