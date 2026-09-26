export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth/session";
import { getPlatformSettings } from "@/lib/services/settings";
import { PricingTogglePage } from "./pricing-toggle";

export default async function PricingPage() {
  const [session, settings] = await Promise.all([
    getSession(),
    getPlatformSettings(),
  ]);
  const userId = session?.user.id;

  const plans = [
    {
      name: "Core",
      planKey: "free_org" as const,
      monthlyPrice: settings.planPrices.core,
      description: "Bookings, operations, and a custom public page.",
      features: [
        "Bookings and availability",
        "Offerings and team management",
        "Configurable public booking site",
        "Automated WhatsApp notifications",
      ],
    },
    {
      name: "Engage",
      planKey: "engage" as const,
      monthlyPrice: settings.planPrices.engage,
      description: "Add an intelligent AI web agent to every client page.",
      features: [
        "Everything in Core",
        "Web text assistant (AI agent)",
        "Conversation history & summaries",
      ],
      featured: true,
    },
    {
      name: "Voice",
      planKey: "voice" as const,
      monthlyPrice: settings.planPrices.voice,
      description: "Let clients speak with your agent directly in the browser.",
      features: [
        "Everything in Engage",
        "Live browser audio (Voice chat)",
        "Advanced analytics & outcome reporting",
      ],
    },
  ];

  return (
    <main className="min-h-dvh bg-background">
      <header className="sticky top-0 z-50 border-b border-border/80 bg-background/92 backdrop-blur-md">
        <div className="mx-auto flex h-18 max-w-[1400px] items-center px-5 sm:px-8 lg:px-12">
          <Brand />
          <Button asChild variant="ghost" size="sm" className="ml-auto gap-2">
            <Link href={userId ? "/app" : "/"}>
              <ArrowLeft className="size-3.5" /> {userId ? "Workspace" : "Home"}
            </Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-[1400px] px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
        <div className="mb-14 max-w-3xl">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
            Plans that unlock capabilities
          </p>
          <h1 className="mt-5 font-heading text-6xl font-medium leading-[0.92] tracking-[-0.055em] sm:text-7xl">
            Affordable plans for modern businesses. Add AI where it matters.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground">
            Each plan belongs to an organization, so every workspace can choose
            the capabilities it needs.
          </p>
        </div>

        <PricingTogglePage plans={plans} userId={userId ?? null} />

        <p className="mt-5 text-center text-xs text-muted-foreground">
          Yearly billing saves you 2 months. All plans billed in Nigerian Naira (₦) via Paystack.
        </p>
      </section>
    </main>
  );
}
