"use client";

import { useState } from "react";
import { ArrowRight, Check, CreditCard, ShieldCheck, Sparkles, UsersRound } from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FeatureEntitlementCard } from "@/components/dashboard/feature-gates";
import { ScreenHeader } from "@/components/dashboard/screen-kit";
import { useWorkspace } from "@/components/dashboard/workspace-context";

const dashboardPlans = [
  {
    id: "free_org" as const,
    name: "Core",
    price: "$0",
    description: "The operational home for a new organization.",
    features: [
      "Operations hub (Bookings, team, availability)",
      "Custom public page with online booking",
      "Standard email & phone contacts",
    ],
  },
  {
    id: "engage" as const,
    name: "Engage",
    price: "$49",
    description: "Add an ElevenLabs web concierge to every customer touchpoint.",
    features: [
      "Everything in Core",
      "AI text concierge (Web agent)",
      "14-day free trial included",
      "Conversation history & summaries",
    ],
    featured: true,
  },
  {
    id: "voice" as const,
    name: "Voice",
    price: "$149",
    description: "Add live browser audio to the web concierge and measure every outcome.",
    features: [
      "Everything in Engage",
      "Live browser audio (Microphone chat)",
      "Advanced analytics & outcome reporting",
      "Priority ElevenLabs agent routing",
    ],
  },
];

export function BillingScreen() {
  const { has, isLoaded, organization: authOrg, updatePlan } = useAuth();
  const { organization } = useWorkspace();
  const [updating, setUpdating] = useState<string | null>(null);

  const currentTier = has({ plan: "voice" })
    ? "Voice"
    : has({ plan: "engage" })
      ? "Engage"
      : "Core";

  const handlePlanSelect = async (planId: "free_org" | "engage" | "voice") => {
    if (authOrg?.plan === planId) return;
    setUpdating(planId);
    try {
      await updatePlan(planId);
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(null);
    }
  };

  return (
    <>
      <ScreenHeader
        eyebrow="Organization subscription"
        title="Billing"
        description={`Plans, features, and billing belong to ${organization?.name ?? "this organization"}—not to individual members. Upgrades take effect across the active workspace.`}
      />

      <section className="grid gap-4 md:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.2fr)]">
        <Card className="bg-[#20201e] text-white ring-black/15">
          <CardContent className="flex h-full flex-col justify-between pt-0">
            <div>
              <div className="flex items-center justify-between gap-3">
                <span className="grid size-9 place-items-center rounded-lg bg-white/10">
                  <CreditCard className="size-4 text-primary" />
                </span>
                <Badge variant="outline" className="border-white/15 bg-white/5 text-white">
                  Active
                </Badge>
              </div>
              <p className="mt-8 text-[10px] font-semibold tracking-[0.16em] text-white/45 uppercase">
                Current plan
              </p>
              <p className="mt-1 font-heading text-4xl font-semibold tracking-[-0.045em]">
                {isLoaded ? currentTier : "—"}
              </p>
              <p className="mt-3 text-xs leading-5 text-white/50">
                Feature access is verified directly from MongoDB on every session.
              </p>
            </div>
            <div className="mt-8 space-y-2 border-t border-white/10 pt-4 text-[11px] text-white/60">
              <p className="flex items-center gap-2">
                <ShieldCheck className="size-3.5 text-emerald-400" /> Organization-scoped billing
              </p>
              <p className="flex items-center gap-2">
                <UsersRound className="size-3.5 text-sky-400" /> MongoDB-managed entitlements
              </p>
            </div>
          </CardContent>
        </Card>
        <div className="grid gap-4 sm:grid-cols-2">
          <FeatureEntitlementCard feature="web_agent" />
          <FeatureEntitlementCard feature="browser_voice" />
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.16em] text-primary uppercase">
              Compare plans
            </p>
            <h2 className="mt-1 font-heading text-2xl font-semibold tracking-[-0.025em]">
              Choose the channels you need.
            </h2>
          </div>
          <span className="hidden items-center gap-1.5 text-[11px] text-muted-foreground sm:inline-flex">
            <Check className="size-3.5" /> Instant plan switching
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {dashboardPlans.map((plan) => {
            const isCurrent = authOrg?.plan === plan.id || (!authOrg?.plan && plan.id === "free_org");
            return (
              <div
                key={plan.id}
                className={`relative flex flex-col justify-between rounded-xl border p-6 transition-all ${
                  plan.featured
                    ? "border-primary/50 bg-primary/5 shadow-sm"
                    : "bg-white"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                      {plan.name}
                    </p>
                    {isCurrent && (
                      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                        Current plan
                      </Badge>
                    )}
                  </div>
                  <p className="mt-4 font-heading text-4xl font-semibold">
                    {plan.price}
                    <span className="text-xs font-normal text-muted-foreground">/mo</span>
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">{plan.description}</p>
                  <div className="mt-6 space-y-2 border-t pt-4 text-xs">
                    {plan.features.map((f) => (
                      <p key={f} className="flex items-center gap-2">
                        <Check className="size-3.5 text-primary" /> {f}
                      </p>
                    ))}
                  </div>
                </div>
                <Button
                  className="mt-8 w-full"
                  variant={isCurrent ? "outline" : plan.featured ? "default" : "secondary"}
                  disabled={isCurrent || updating !== null}
                  onClick={() => handlePlanSelect(plan.id)}
                >
                  {updating === plan.id
                    ? "Updating..."
                    : isCurrent
                      ? "Current Plan"
                      : `Switch to ${plan.name}`}
                </Button>
              </div>
            );
          })}
        </div>
      </section>

      <div className="mt-6 flex items-start gap-2 rounded-lg border border-black/10 bg-white p-3 text-[11px] leading-5 text-muted-foreground">
        <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" />
        Switchboard gates capabilities by MongoDB feature entitlement, so features seamlessly adapt to plan updates without code changes.
      </div>
    </>
  );
}
