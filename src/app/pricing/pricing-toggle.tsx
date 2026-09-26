"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Zap } from "lucide-react";
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
  const toYearly = (p: number) => p * 10;
  const displayed = (p: number) => (cycle === "yearly" ? toYearly(p) : p);

  return (
    <>
      {/* Billing cycle toggle */}
      <div className="mb-10 flex flex-col items-center gap-3">
        <div className="inline-flex items-center rounded-full border border-border bg-muted/60 p-1 gap-1">
          <button
            type="button"
            onClick={() => setCycle("monthly")}
            className={`rounded-full px-6 py-2.5 text-sm font-semibold transition-all duration-200 ${
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
            className={`flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold transition-all duration-200 ${
              cycle === "yearly"
                ? "bg-white text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Yearly
            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
              <Zap className="size-2.5" />2 months free
            </span>
          </button>
        </div>
        {cycle === "yearly" && (
          <p className="text-sm font-medium text-emerald-700">
            🎉 Pay for 10 months, get 12 — you save 2 months on every plan!
          </p>
        )}
      </div>

      {/* Plan grid */}
      <div className="grid border-l border-t lg:grid-cols-3">
        {plans.map((plan) => {
          const monthlyAmt = plan.monthlyPrice;
          const shownAmt = displayed(monthlyAmt);
          const fullYearlyAmt = monthlyAmt * 12;
          const signUpHref = userId
            ? "/app"
            : `/sign-up?plan=${plan.planKey === "free_org" ? "core" : plan.planKey}&cycle=${cycle}`;
          const btnLabel = userId ? "Manage in workspace" : "Create an organization";

          return (
            <article
              key={plan.name}
              className={`flex min-h-[500px] flex-col border-b border-r p-8 transition-all ${
                plan.featured ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted/20"
              }`}
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] opacity-60">
                {plan.name}
              </p>

              <div className="mt-8">
                <p className="font-heading text-6xl tracking-[-0.06em] leading-none">
                  {sym}{shownAmt.toLocaleString()}
                  <span className="ml-1 font-sans text-sm tracking-normal opacity-60">
                    /{cycle === "yearly" ? "yr" : "mo"}
                  </span>
                </p>

                {cycle === "yearly" ? (
                  <p className={`mt-2 text-[11px] font-medium ${plan.featured ? "text-primary-foreground/60" : "text-emerald-700"}`}>
                    <span className="line-through opacity-50">
                      {sym}{fullYearlyAmt.toLocaleString()}/yr
                    </span>
                    {" "}— save {sym}{(fullYearlyAmt - shownAmt).toLocaleString()}
                  </p>
                ) : (
                  <p className={`mt-2 text-[11px] ${plan.featured ? "text-primary-foreground/55" : "text-muted-foreground"}`}>
                    or{" "}
                    <button
                      type="button"
                      onClick={() => setCycle("yearly")}
                      className={`font-semibold underline underline-offset-2 cursor-pointer ${
                        plan.featured ? "text-primary-foreground/80" : "text-emerald-700"
                      }`}
                    >
                      {sym}{toYearly(monthlyAmt).toLocaleString()}/yr
                    </button>
                    {" "}(2 months free)
                  </p>
                )}
              </div>

              <p className="mt-5 text-sm leading-6 opacity-65">{plan.description}</p>

              <div className="mt-8 space-y-3 border-t border-current/15 pt-6 flex-1">
                {plan.features.map((feature) => (
                  <p key={feature} className="flex items-center gap-2 text-sm">
                    <Check className="size-3.5 shrink-0" /> {feature}
                  </p>
                ))}
              </div>

              <Button
                asChild
                variant={plan.featured ? "secondary" : "outline"}
                className="mt-8 shadow-none"
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
