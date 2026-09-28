export const dynamic = "force-dynamic";

import Link from "next/link";
import {
  ArrowRight,
  Bot,
  CalendarCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Headphones,
  MessageCircle,
  MessageSquareText,
  Mic,
  MoveUpRight,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Truck,
  Zap,
} from "lucide-react";
import { UserButton } from "@/components/auth/user-button";
import { getSession } from "@/lib/auth/session";
import { getPlatformSettings } from "@/lib/services/settings";
import { Brand } from "@/components/brand";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WaitlistPage } from "./waitlist-page";
import { PricingSection } from "./pricing-section";

const moments = [
  {
    time: "09:41",
    icon: Mic,
    label: "Voice AI Receptionist",
    detail: "Answered pricing & booked slot · 2m 14s",
    tone: "bg-blue-600 text-white",
  },
  {
    time: "09:44",
    icon: ShoppingBag,
    label: "WhatsApp Order Received",
    detail: "ORD-0084 · Signature Cotton Tee (₦12,000)",
    tone: "bg-[#dff5e8] text-[#17623a]",
  },
  {
    time: "09:47",
    icon: CalendarDays,
    label: "Appointment Reserved",
    detail: "Tuesday, 14:30 · Stylist Maya",
    tone: "bg-[#f8e9c8] text-[#6b4710]",
  },
  {
    time: "09:50",
    icon: MessageCircle,
    label: "WhatsApp Alert Dispatched",
    detail: "Tracking link sent to customer & staff",
    tone: "bg-[#e1f3fe] text-[#0369a1]",
  },
];

function MarketingNav({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/92 backdrop-blur-md">
      <div className="mx-auto flex h-17 max-w-[1400px] items-center px-4 sm:px-8 lg:px-12">
        <Brand />
        <nav className="ml-12 hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <Link className="transition-colors hover:text-foreground" href="#platform">
            Platform
          </Link>
          <Link className="transition-colors hover:text-foreground" href="#features">
            Features
          </Link>
          <Link className="transition-colors hover:text-foreground" href="#built-for">
            Built for
          </Link>
          <Link className="transition-colors hover:text-foreground" href="/pricing">
            Pricing
          </Link>
          <Link className="transition-colors hover:text-foreground" href="/contact">
            Contact
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {!signedIn ? (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href="/sign-in">Sign in</Link>
              </Button>
              <Button asChild size="sm" className="gap-1.5 shadow-none">
                <Link href="/sign-up">
                  Get started <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </>
          ) : (
            <>
              <Button asChild size="sm" className="gap-1.5 shadow-none">
                <Link href="/app">
                  Open workspace <ArrowRight className="size-3.5" />
                </Link>
              </Button>
              <UserButton />
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default async function Home() {
  const [session, settings] = await Promise.all([getSession(), getPlatformSettings()]);
  const userId = session?.user.id;

  const plans = [
    {
      name: "Core",
      planKey: "free_org" as const,
      monthlyPrice: settings.planPrices.core,
      copy: "The complete online booking & ecommerce scheduling engine for growing businesses.",
      features: [
        "Online booking calendar & catalog storefront",
        "Staff availability & delivery zone management",
        "Branded public booking & shop site",
        "Automated WhatsApp notifications & checkout",
      ],
    },
    {
      name: "Engage",
      planKey: "engage" as const,
      monthlyPrice: settings.planPrices.engage,
      copy: "Smart bookings & commerce paired with an intelligent 24/7 Web AI assistant.",
      features: [
        "Everything in Core",
        "Conversational Web AI chat assistant",
        "Instant service & product recommendations",
        "In-chat bookings & order inquiries",
      ],
      featured: true,
    },
    {
      name: "Voice",
      planKey: "voice" as const,
      monthlyPrice: settings.planPrices.voice,
      copy: "Full AI voice receptionist with live browser audio scheduling & product advisory.",
      features: [
        "Everything in Engage",
        "24/7 Live AI Voice Receptionist",
        "Microphone voice bookings & inquiries",
        "Advanced appointment & commerce analytics",
      ],
    },
  ];

  if (settings.isWaitlistActive) {
    return <WaitlistPage />;
  }

  return (
    <main className="bg-background w-full overflow-x-hidden">
      <MarketingNav signedIn={Boolean(userId)} />

      {/* ── Hero Section ──────────────────────────────────────────────── */}
      <section className="relative border-b overflow-hidden">
        <div className="absolute inset-0 hairline-grid opacity-45 [mask-image:linear-gradient(to_bottom,black,transparent_88%)]" />
        <div className="relative mx-auto grid max-w-[1400px] gap-14 px-5 pb-20 pt-16 sm:px-8 sm:pt-24 lg:grid-cols-[1.02fr_0.98fr] lg:px-12 lg:pb-28 lg:pt-30">
          <div className="max-w-3xl">
            <Badge variant="outline" className="mb-7 rounded-sm bg-background px-2.5 py-1 font-mono text-2xs uppercase tracking-[0.16em]">
              AI Front Desk · Smart Bookings · WhatsApp Commerce
            </Badge>
            <h1 className="font-heading text-[clamp(3.8rem,8vw,7.4rem)] font-medium leading-[0.82] tracking-[-0.065em] text-balance">
              Never miss
              <span className="mt-3 block text-primary italic">a booking or sale.</span>
            </h1>
            <p className="mt-9 max-w-xl text-lg leading-7 text-muted-foreground sm:text-xl sm:leading-8">
              Qwilo pairs 24/7 AI voice & web receptionists with smart appointment scheduling and automated WhatsApp ecommerce. Service businesses fill their calendars around the clock, while product brands showcase catalogs and close sales via WhatsApp checkout—even while you sleep.
            </p>
            <div className="mt-9 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Button asChild size="lg" className="h-12 w-full sm:w-auto gap-2 rounded-md px-6 shadow-none">
                <Link href="/sign-up">
                  Build your front desk & store <ArrowRight className="size-4 shrink-0" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 w-full sm:w-auto gap-2 rounded-md bg-background px-6 shadow-none">
                <Link href="/p/papafam-cuts">
                  View a live demo site <MoveUpRight className="size-4 shrink-0" />
                </Link>
              </Button>
            </div>
            <div className="mt-12 flex flex-wrap gap-x-8 gap-y-3 border-t pt-5 text-sm font-medium text-foreground/85">
              <span className="flex items-center gap-2"><Check className="size-4 text-primary shrink-0" /> From ₦1,000/mo</span>
              <span className="flex items-center gap-2"><Check className="size-4 text-primary shrink-0" /> 24/7 AI Voice Receptionist</span>
              <span className="flex items-center gap-2"><Check className="size-4 text-primary shrink-0" /> Appointment Scheduling</span>
              <span className="flex items-center gap-2"><Check className="size-4 text-primary shrink-0" /> WhatsApp Commerce & Checkout</span>
            </div>
          </div>

          <div className="relative flex items-center lg:pl-8">
            <div className="w-full border border-foreground/12 bg-card shadow-[18px_22px_0_0_oklch(0.205_0.018_264.4)]">
              <div className="flex items-center border-b px-5 py-4">
                <div>
                  <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Live front desk & store</p>
                  <p className="mt-1 text-sm sm:text-base font-semibold">Real-time appointments & orders</p>
                </div>
                <span className="ml-auto inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_0_3px_oklch(0.9_0.08_151)]" />
                  Online
                </span>
              </div>
              <div className="p-3 sm:p-5">
                {moments.map(({ time, icon: Icon, label, detail, tone }, index) => (
                  <div key={label} className="grid grid-cols-[48px_44px_1fr_auto] items-center gap-3 border-b px-1 py-4 last:border-0">
                    <span className="font-mono text-xs text-muted-foreground">{time}</span>
                    <span className={`grid size-9 place-items-center rounded-md ${tone}`}><Icon className="size-4" /></span>
                    <div className="min-w-0">
                      <p className="truncate text-sm sm:text-base font-semibold">{label}</p>
                      <p className="mt-0.5 truncate text-xs sm:text-sm text-muted-foreground">{detail}</p>
                    </div>
                    <span className="hidden font-mono text-xs uppercase tracking-wider text-muted-foreground sm:inline">0{index + 1}</span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 border-t bg-[#171b24] text-white">
                {[["24/7", "live operations"], ["100%", "auto-confirmed"], ["0", "missed sales"]].map(([value, label]) => (
                  <div key={label} className="border-r px-4 py-5 last:border-0 border-white/10">
                    <p className="font-heading text-2xl sm:text-3xl tracking-[-0.04em]">{value}</p>
                    <p className="mt-1 font-mono text-xs uppercase tracking-wider text-white/70">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Platform Overview ─────────────────────────────────────────── */}
      <section id="platform" className="mx-auto max-w-[1400px] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
        <div className="grid gap-12 lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <p className="font-mono text-2xs font-semibold uppercase tracking-[0.2em] text-primary">Unified operations & commerce</p>
            <h2 className="mt-4 max-w-md font-heading text-5xl font-medium leading-[0.96] tracking-[-0.05em] sm:text-6xl">
              Where smart scheduling & ecommerce meet conversational AI.
            </h2>
            <p className="mt-6 max-w-md text-base leading-7 text-muted-foreground">
              Turn inquiries into confirmed appointments and paid orders. Qwilo gives your business a branded booking portal, a modern ecommerce storefront with WhatsApp checkout, and an intelligent AI receptionist that knows your exact services, staff, and products.
            </p>
          </div>
          <div className="grid border-t md:grid-cols-3">
            {[
              {
                icon: CalendarDays,
                n: "01",
                title: "Smart Booking Engine",
                copy: "Self-serve booking calendar, team member assignment, real-time slot availability, multi-service offerings, and deposit verification.",
              },
              {
                icon: ShoppingBag,
                n: "02",
                title: "Automated WhatsApp Commerce",
                copy: "Online product catalog, delivery zone rates, direct bank transfer with 1-click copy, structured WhatsApp checkout, and live order tracking.",
              },
              {
                icon: Headphones,
                n: "03",
                title: "24/7 Voice & Web AI Receptionist",
                copy: "Clients speak naturally with your front desk in the browser or chat online. The AI answers questions, recommends items, and schedules appointments hands-free.",
              },
            ].map(({ icon: Icon, n, title, copy }) => (
              <article key={n} className="border-b border-r px-0 py-8 pr-7 md:px-7 md:first:pl-0 md:last:border-r-0">
                <div className="flex items-center justify-between">
                  <Icon className="size-6 text-primary" />
                  <span className="font-mono text-xs font-semibold text-muted-foreground">{n}</span>
                </div>
                <h3 className="mt-10 font-heading text-2xl sm:text-3xl font-medium tracking-[-0.035em]">{title}</h3>
                <p className="mt-3.5 text-base sm:text-lg leading-relaxed text-muted-foreground">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────── */}
      <section id="features" className="border-t bg-muted/20 py-20 sm:py-28">
        <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12">
          <div className="max-w-2xl">
            <p className="font-mono text-2xs font-semibold uppercase tracking-[0.2em] text-primary">
              Full-Cycle Customer Automation
            </p>
            <h2 className="mt-4 font-heading text-5xl font-medium leading-[0.96] tracking-[-0.05em] sm:text-6xl">
              From first inquiry to confirmed booking or delivery.
            </h2>
            <p className="mt-6 text-base leading-7 text-muted-foreground">
              Eliminate endless back-and-forth messaging, lost after-hours orders, and scheduling mix-ups with an all-in-one automated pipeline.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: "01",
                icon: Mic,
                title: "24/7 AI Front Desk",
                description: "Visitors talk or chat with your AI assistant to ask about pricing, opening hours, services, and product catalog.",
              },
              {
                step: "02",
                icon: CalendarCheck,
                title: "Instant Booking & Cart",
                description: "Clients reserve appointment times or add retail products to their cart with real-time stock checks.",
              },
              {
                step: "03",
                icon: MessageCircle,
                title: "WhatsApp Checkout",
                description: "Itemized orders, direct bank details, and automated order confirmation alerts delivered directly to WhatsApp.",
              },
              {
                step: "04",
                icon: ShieldCheck,
                title: "Fulfillment & Tracking",
                description: "Customers track live order delivery or receive automated booking reminders to eliminate no-shows.",
              },
            ].map(({ step, icon: Icon, title, description }) => (
              <div
                key={step}
                className="group relative rounded-xl border border-border/70 bg-card p-6 shadow-xs transition-all hover:border-primary/40 hover:shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </span>
                  <span className="font-mono text-xs font-semibold text-muted-foreground">{step}</span>
                </div>
                <h3 className="mt-6 text-xl sm:text-2xl font-semibold tracking-tight">{title}</h3>
                <p className="mt-3 text-sm sm:text-base leading-relaxed text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Built For Section ────────────────────────────────────────── */}
      <section id="built-for" className="border-y bg-[#171b24] text-white">
        <div className="mx-auto grid max-w-[1400px] lg:grid-cols-2">
          <div className="border-b border-white/10 px-5 py-20 sm:px-8 lg:border-b-0 lg:border-r lg:px-12 lg:py-28">
            <p className="font-mono text-2xs uppercase tracking-[0.2em] text-blue-300">Customized For Services & Ecommerce</p>
            <h2 className="mt-5 max-w-xl font-heading text-5xl font-medium leading-[0.96] tracking-[-0.05em] sm:text-6xl">
              Your business defines how clients book and buy.
            </h2>
            <p className="mt-6 max-w-lg text-base leading-7 text-white/58">
              A salon books appointments by stylist. An ecommerce brand sells products with WhatsApp checkout. A wellness studio does both. Qwilo’s booking forms, product catalog, AI receptionist, and automated WhatsApp pipeline adapt without changing your workflow.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2">
            {[
              ["Barbers & salons", "Service · Stylist · Appointment · Instant WhatsApp"],
              ["Fashion & retail brands", "Products · Collections · Delivery Zones · WhatsApp Checkout"],
              ["Clinics & consultancies", "Consultation · Practitioner · Calendar Sync · Patient Intake"],
              ["Spas & wellness stores", "Treatments + Skincare Store · Unified Bookings & Product Orders"],
            ].map(([title, vocabulary], index) => (
              <div key={title} className="min-h-44 border-b border-white/10 p-6 sm:p-8 last:border-b-0 sm:odd:border-r sm:even:border-r-0">
                <span className="font-mono text-xs font-medium text-white/60">0{index + 1}</span>
                <h3 className="mt-6 text-xl sm:text-2xl font-semibold text-white">{title}</h3>
                <p className="mt-3 text-sm sm:text-base leading-relaxed text-white/80">{vocabulary}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing Section ──────────────────────────────────────────── */}
      <PricingSection plans={plans} />

      {/* ── CTA Banner ───────────────────────────────────────────────── */}
      <section className="border-t bg-[#dce6ff]">
        <div className="mx-auto flex max-w-[1400px] flex-col items-start gap-8 px-5 py-20 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:px-12 lg:py-24">
          <div>
            <Sparkles className="size-6 text-primary" />
            <h2 className="mt-6 max-w-3xl font-heading text-5xl font-medium leading-[0.94] tracking-[-0.05em] sm:text-7xl">
              Ready for an AI front desk that grows your bookings and sales?
            </h2>
            <p className="mt-4 max-w-xl text-base text-slate-700 leading-relaxed">
              Start taking automated bookings, showcasing products, answering customer inquiries, and sending WhatsApp updates in under 5 minutes.
            </p>
          </div>
          <Button asChild size="lg" className="h-12 shrink-0 gap-2 rounded-md px-6 shadow-none">
            <Link href="/sign-up">Start with Core for ₦1,000/mo <ArrowRight className="size-4 shrink-0" /></Link>
          </Button>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="border-t bg-card">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-5 px-5 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:px-8 lg:px-12">
          <Brand />
          <p className="sm:ml-auto">
            Website developed by <a href="https://www.instagram.com/thecoachmanuel" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 hover:underline">Coach Manuel</a>.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/pricing" className="hover:text-foreground">Pricing</Link>
            <Link href="/contact" className="hover:text-foreground">Contact</Link>
            <Link href="/sign-in" className="hover:text-foreground">Sign in</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
