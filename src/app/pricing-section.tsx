"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

type Plan = {
  name: string;
  planKey: "free_org" | "engage" | "voice";
  monthlyPrice: number;
  copy: string;
  features: string[];
  featured?: boolean;
};

export function PricingSection({ plans }: { plans: Plan[] }) {
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  const sym = "₦";

  const yearlyPrice = (p: number) => p * 10; // 2 months free

  return (
    <section id="pricing" className="mx-auto max-w-[1400px] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
      <div className="mb-10 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
            Feature-based plans
          </p>
          <h2 className="mt-4 font-heading text-5xl font-medium tracking-[-0.05em] sm:text-6xl">
            Start useful. Add a voice.
          </h2>
        </div>

        {/* Monthly / Yearly toggle */}
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <div className="inline-flex items-center rounded-lg border border-border/70 bg-muted/40 p-1">
            <button
              onClick={() => setCycle("monthly")}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${
                cycle === "monthly"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setCycle("yearly")}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${
                cycle === "yearly"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Yearly
              <span className="ml-1.5 inline-flex items-center rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-emerald-700">
                2 months free
              </span>
            </button>
          </div>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            Compare plans <span aria-hidden>›</span>
          </Link>
        </div>
      </div>

      <div className="grid border-l border-t lg:grid-cols-3">
        {plans.map((plan) => {
          const displayPrice =
            cycle === "yearly" ? yearlyPrice(plan.monthlyPrice) : plan.monthlyPrice;
          const signUpUrl = `/sign-up?plan=${plan.planKey === "free_org" ? "core" : plan.planKey}&cycle=${cycle}`;

          return (
            <article
              key={plan.name}
              className={`relative flex min-h-[430px] flex-col border-b border-r p-7 sm:p-9 ${
                plan.featured ? "bg-primary text-primary-foreground" : "bg-card"
              }`}
            >
              {plan.featured && (
                <span className="absolute right-5 top-5 font-mono text-[9px] uppercase tracking-[0.15em] text-primary-foreground/65">
                  Most popular
                </span>
              )}
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] opacity-55">
                {plan.name}
              </p>
              <p className="mt-8 font-heading text-6xl font-medium tracking-[-0.06em]">
                {sym}{displayPrice.toLocaleString()}
                <span className="ml-1 font-sans text-xs font-normal tracking-normal opacity-60">
                  /{cycle === "yearly" ? "yr" : "mo"}
                </span>
              </p>
              {cycle === "yearly" && (
                <p className="mt-1 font-mono text-[10px] opacity-65 line-through">
                  {sym}{(plan.monthlyPrice * 12).toLocaleString()}/yr
                </p>
              )}
              <p className="mt-4 max-w-xs text-sm leading-6 opacity-65">{plan.copy}</p>
              <div className="mt-9 space-y-3 border-t border-current/15 pt-6">
                {plan.features.map((feature) => (
                  <p key={feature} className="flex items-center gap-2 text-sm">
                    <Check className="size-3.5" /> {feature}
                  </p>
                ))}
              </div>
              <Button
                asChild
                variant={plan.featured ? "secondary" : "outline"}
                className="mt-auto h-11 justify-between rounded-md shadow-none"
              >
                <Link href={signUpUrl}>
                  Choose {plan.name} <ArrowRight className="size-4" />
                </Link>
              </Button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
