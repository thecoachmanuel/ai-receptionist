"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Zap } from "lucide-react";
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

  // Yearly = 10× monthly (pay for 10, get 12 — 2 months free)
  const toYearly = (p: number) => p * 10;
  const displayed = (p: number) => (cycle === "yearly" ? toYearly(p) : p);

  return (
    <section id="pricing" className="mx-auto max-w-[1400px] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">

      {/* Header row */}
      <div className="mb-12 flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            Feature-based plans
          </p>
          <h2 className="mt-4 font-heading text-5xl font-medium tracking-[-0.05em] sm:text-6xl">
            Start useful. Add a voice.
          </h2>
        </div>

        {/* Billing cycle pill toggle */}
        <div className="flex flex-col items-start gap-3 sm:items-end">
          <div className="relative inline-flex items-center rounded-full border border-border bg-muted/60 p-1 gap-1">
            {/* sliding indicator handled via button active classes */}
            <button
              type="button"
              onClick={() => setCycle("monthly")}
              className={`relative rounded-full px-5 py-2 text-sm font-semibold transition-all duration-200 ${
                cycle === "monthly"
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setCycle("yearly")}
              className={`relative flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-all duration-200 ${
                cycle === "yearly"
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Yearly
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
                <Zap className="size-3" />2 free
              </span>
            </button>
          </div>
          {cycle === "yearly" && (
            <p className="text-xs sm:text-sm font-medium text-emerald-700">
              🎉 You save 2 months on every plan!
            </p>
          )}
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            Full plan comparison →
          </Link>
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid gap-0 border-l border-t lg:grid-cols-3">
        {plans.map((plan) => {
          const monthlyAmt = plan.monthlyPrice;
          const shownAmt = displayed(monthlyAmt);
          const fullYearlyAmt = monthlyAmt * 12;
          const signUpUrl = `/sign-up?plan=${
            plan.planKey === "free_org" ? "core" : plan.planKey
          }&cycle=${cycle}`;

          return (
            <article
              key={plan.name}
              className={`relative flex min-h-[460px] flex-col border-b border-r p-7 transition-all sm:p-9 ${
                plan.featured
                  ? "bg-primary text-primary-foreground"
                  : "bg-card hover:bg-muted/20"
              }`}
            >
              {plan.featured && (
                <span className="absolute right-5 top-5 font-mono text-xs font-semibold uppercase tracking-wider text-primary-foreground/90">
                  Most popular
                </span>
              )}

              {/* Plan name */}
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] opacity-75">
                {plan.name}
              </p>

              {/* Price */}
              <div className="mt-8">
                <p className="font-heading text-6xl font-medium tracking-[-0.06em] leading-none">
                  {sym}{shownAmt.toLocaleString()}
                  <span className="ml-1 font-sans text-sm font-normal tracking-normal opacity-70">
                    /{cycle === "yearly" ? "yr" : "mo"}
                  </span>
                </p>

                {/* Yearly savings callout */}
                {cycle === "yearly" ? (
                  <p className={`mt-2.5 text-xs sm:text-sm font-medium ${plan.featured ? "text-primary-foreground/80" : "text-emerald-700"}`}>
                    <span className="line-through opacity-60">
                      {sym}{fullYearlyAmt.toLocaleString()}/yr
                    </span>
                    {" "}— you save {sym}{(fullYearlyAmt - shownAmt).toLocaleString()}
                  </p>
                ) : (
                  <p className={`mt-2.5 text-xs sm:text-sm ${plan.featured ? "text-primary-foreground/75" : "text-muted-foreground"}`}>
                    or {sym}{toYearly(monthlyAmt).toLocaleString()}/yr{" "}
                    <span className={`font-semibold ${plan.featured ? "text-primary-foreground/95" : "text-emerald-700"}`}>
                      (save 2 months)
                    </span>
                  </p>
                )}
              </div>

              {/* Description */}
              <p className="mt-5 text-sm sm:text-base leading-relaxed opacity-75">{plan.copy}</p>

              {/* Features */}
              <div className="mt-8 space-y-3.5 border-t border-current/15 pt-6 flex-1">
                {plan.features.map((feature) => (
                  <p key={feature} className="flex items-center gap-2.5 text-sm sm:text-base">
                    <Check className="size-4 shrink-0 opacity-85" /> {feature}
                  </p>
                ))}
              </div>

              {/* CTA */}
              <Button
                asChild
                variant={plan.featured ? "secondary" : "outline"}
                className="mt-8 h-11 justify-between rounded-md shadow-none"
              >
                <Link href={signUpUrl}>
                  Choose {plan.name}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </article>
          );
        })}
      </div>

      {/* Footer note */}
      <p className="mt-6 text-center text-xs sm:text-sm text-muted-foreground">
        All plans billed in Nigerian Naira (₦) via Paystack.
        {cycle === "yearly" ? " Yearly billing charged as a single payment." : " Switch to yearly anytime to save 2 months."}
      </p>
    </section>
  );
}
