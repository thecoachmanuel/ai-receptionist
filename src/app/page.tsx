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
  Sparkles,
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
    label: "Voice AI Reception",
    detail: "Answered questions & booked slot · 2m 14s",
    tone: "bg-blue-600 text-white",
  },
  {
    time: "09:44",
    icon: CalendarDays,
    label: "Appointment Reserved",
    detail: "Tuesday, 14:30 · Stylist Maya",
    tone: "bg-[#dff5e8] text-[#17623a]",
  },
  {
    time: "09:47",
    icon: MessageSquareText,
    label: "Web AI Assistant",
    detail: "Guided client & confirmed booking",
    tone: "bg-[#f8e9c8] text-[#6b4710]",
  },
  {
    time: "09:49",
    icon: MessageCircle,
    label: "WhatsApp Alert Sent",
    detail: "Instant reminder to client & staff",
    tone: "bg-[#e1f3fe] text-[#0369a1]",
  },
];

// Moved dynamic plans creation into Home component

function MarketingNav({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/92 backdrop-blur-md">
      <div className="mx-auto flex h-17 max-w-[1400px] items-center px-5 sm:px-8 lg:px-12">
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
      copy: "The complete online booking & scheduling engine for growing businesses.",
      features: [
        "Online self-serve booking calendar",
        "Staff availability & slot management",
        "Branded public booking site",
        "Automated WhatsApp notifications",
      ],
    },
    {
      name: "Engage",
      planKey: "engage" as const,
      monthlyPrice: settings.planPrices.engage,
      copy: "Smart booking paired with an intelligent 24/7 Web AI assistant.",
      features: [
        "Everything in Core",
        "Conversational Web AI chat assistant",
        "Instant FAQ & service recommendations",
        "In-chat appointment booking",
      ],
      featured: true,
    },
    {
      name: "Voice",
      planKey: "voice" as const,
      monthlyPrice: settings.planPrices.voice,
      copy: "Full AI voice receptionist with live browser audio scheduling.",
      features: [
        "Everything in Engage",
        "24/7 Live AI Voice Receptionist",
        "Microphone voice bookings in browser",
        "Advanced appointment analytics",
      ],
    },
  ];

  if (settings.isWaitlistActive) {
    return <WaitlistPage />;
  }

  return (
    <main className="bg-background">
      <MarketingNav signedIn={Boolean(userId)} />

      <section className="relative border-b">
        <div className="absolute inset-0 hairline-grid opacity-45 [mask-image:linear-gradient(to_bottom,black,transparent_88%)]" />
        <div className="relative mx-auto grid max-w-[1400px] gap-14 px-5 pb-20 pt-16 sm:px-8 sm:pt-24 lg:grid-cols-[1.02fr_0.98fr] lg:px-12 lg:pb-28 lg:pt-30">
          <div className="max-w-3xl">
            <Badge variant="outline" className="mb-7 rounded-sm bg-background px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em]">
              AI Front Desk & 24/7 Smart Booking Platform
            </Badge>
            <h1 className="font-heading text-[clamp(3.8rem,8vw,7.4rem)] font-medium leading-[0.82] tracking-[-0.065em] text-balance">
              Never miss a booking.
              <span className="mt-3 block text-primary italic">Scheduled by AI.</span>
            </h1>
            <p className="mt-9 max-w-xl text-lg leading-7 text-muted-foreground sm:text-xl sm:leading-8">
              Qwilo pairs an effortless online booking engine with intelligent AI voice and web receptionists. Clients book appointments around the clock, get questions answered instantly, and receive automated WhatsApp confirmations—even while you sleep.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="h-12 gap-2 rounded-md px-6 shadow-none">
                <Link href="/sign-up">
                  Build your booking front desk <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 gap-2 rounded-md bg-background px-6 shadow-none">
                <Link href="/p/papafam-cuts">
                  View a live booking site <MoveUpRight className="size-4" />
                </Link>
              </Button>
            </div>
            <div className="mt-12 flex flex-wrap gap-x-8 gap-y-3 border-t pt-5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              <span className="flex items-center gap-2"><Check className="size-3 text-primary" /> From ₦1,000/mo</span>
              <span className="flex items-center gap-2"><Check className="size-3 text-primary" /> 24/7 Online Bookings</span>
              <span className="flex items-center gap-2"><Check className="size-3 text-primary" /> Conversational Voice AI</span>
              <span className="flex items-center gap-2"><Check className="size-3 text-primary" /> WhatsApp Confirmations</span>
            </div>
          </div>

          <div className="relative flex items-center lg:pl-8">
            <div className="w-full border border-foreground/12 bg-card shadow-[18px_22px_0_0_oklch(0.205_0.018_264.4)]">
              <div className="flex items-center border-b px-5 py-4">
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Tuesday · Live front desk</p>
                  <p className="mt-1 text-sm font-semibold">Real-time activity & bookings</p>
                </div>
                <span className="ml-auto inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_0_3px_oklch(0.9_0.08_151)]" />
                  Agent & booking desk online
                </span>
              </div>
              <div className="p-3 sm:p-5">
                {moments.map(({ time, icon: Icon, label, detail, tone }, index) => (
                  <div key={label} className="grid grid-cols-[42px_40px_1fr_auto] items-center gap-3 border-b px-1 py-4 last:border-0 sm:grid-cols-[48px_44px_1fr_auto]">
                    <span className="font-mono text-[10px] text-muted-foreground">{time}</span>
                    <span className={`grid size-9 place-items-center rounded-md ${tone}`}><Icon className="size-4" /></span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{label}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{detail}</p>
                    </div>
                    <span className="hidden font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground sm:inline">0{index + 1}</span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 border-t bg-[#171b24] text-white">
                {[["24/7", "online bookings"], ["100%", "auto-scheduled"], ["0", "missed calls"]].map(([value, label]) => (
                  <div key={label} className="border-r px-4 py-5 last:border-0 border-white/10">
                    <p className="font-heading text-3xl tracking-[-0.04em]">{value}</p>
                    <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.16em] text-white/45">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="platform" className="mx-auto max-w-[1400px] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
        <div className="grid gap-12 lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">One unified front office</p>
            <h2 className="mt-4 max-w-md font-heading text-5xl font-medium leading-[0.96] tracking-[-0.05em] sm:text-6xl">
              Where smart scheduling meets conversational AI.
            </h2>
            <p className="mt-6 max-w-md text-sm leading-6 text-muted-foreground">
              Turn curious inquiries into confirmed appointments on your calendar. Qwilo gives your business a branded booking portal, real-time availability sync, and an AI receptionist that knows your exact services and team.
            </p>
          </div>
          <div className="grid border-t md:grid-cols-3">
            {[
              {
                icon: CalendarDays,
                n: "01",
                title: "Smart Booking Engine",
                copy: "Self-serve booking calendar, team member assignment, real-time slot availability, multi-service offerings, and deposit settings.",
              },
              {
                icon: Headphones,
                n: "02",
                title: "24/7 Voice AI Receptionist",
                copy: "Clients can speak naturally with your front desk right in the browser. The AI answers service queries and schedules their appointment hands-free.",
              },
              {
                icon: Bot,
                n: "03",
                title: "Interactive Web AI Assistant",
                copy: "An on-page AI chat assistant that greets visitors, explains your pricing, recommends packages, and guides clients directly into booking.",
              },
            ].map(({ icon: Icon, n, title, copy }) => (
              <article key={n} className="border-b border-r px-0 py-8 pr-7 md:px-7 md:first:pl-0 md:last:border-r-0">
                <div className="flex items-center justify-between">
                  <Icon className="size-5 text-primary" />
                  <span className="font-mono text-[10px] text-muted-foreground">{n}</span>
                </div>
                <h3 className="mt-12 font-heading text-3xl font-medium tracking-[-0.035em]">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="border-t bg-muted/20 py-20 sm:py-28">
        <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12">
          <div className="max-w-2xl">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
              Full-Cycle Booking Automation
            </p>
            <h2 className="mt-3 font-heading text-4xl sm:text-5xl font-medium tracking-[-0.045em]">
              From first inquiry to confirmed appointment.
            </h2>
            <p className="mt-4 text-base text-muted-foreground leading-relaxed">
              Say goodbye to endless back-and-forth messages, double bookings, and lost after-hours inquiries.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: "01",
                icon: Mic,
                title: "24/7 AI Inquiries",
                description: "Visitors talk or chat with your AI front desk to ask about pricing, opening hours, services, and staff.",
              },
              {
                step: "02",
                icon: CalendarCheck,
                title: "Real-Time Scheduling",
                description: "Clients select available dates and times tailored to your staff's working hours and buffer periods.",
              },
              {
                step: "03",
                icon: MessageCircle,
                title: "Instant WhatsApp Alerts",
                description: "Both the client and the assigned staff member immediately receive automated WhatsApp booking confirmations.",
              },
              {
                step: "04",
                icon: ShieldCheck,
                title: "Zero Missed Bookings",
                description: "Automated reminders reduce no-shows while keeping your calendar filled around the clock.",
              },
            ].map(({ step, icon: Icon, title, description }) => (
              <div
                key={step}
                className="group relative rounded-xl border border-border/70 bg-card p-6 shadow-xs transition-all hover:border-primary/40 hover:shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </span>
                  <span className="font-mono text-xs font-semibold text-muted-foreground/60">{step}</span>
                </div>
                <h3 className="mt-6 text-lg font-semibold tracking-tight">{title}</h3>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="built-for" className="border-y bg-[#171b24] text-white">
        <div className="mx-auto grid max-w-[1400px] lg:grid-cols-2">
          <div className="border-b border-white/10 px-5 py-20 sm:px-8 lg:border-b-0 lg:border-r lg:px-12 lg:py-28">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-blue-300">Customized For Your Industry</p>
            <h2 className="mt-5 max-w-xl font-heading text-5xl font-medium leading-[0.96] tracking-[-0.05em] sm:text-6xl">
              Your business defines how clients book.
            </h2>
            <p className="mt-6 max-w-lg text-base leading-7 text-white/58">
              A salon books appointments by stylist. A consultant schedules 1-on-1 strategy sessions. A clinic books patient visits. Qwilo’s booking forms, AI receptionist knowledge, team availability, and public scheduling adapt without changing your workflow.
            </p>
          </div>
          <div className="grid grid-cols-2">
            {[
              ["Barbers & salons", "Service · Stylist · Appointment · Instant WhatsApp"],
              ["Studios & coaches", "Session · Coach · Booking · Calendar sync"],
              ["Clinics & practices", "Visit · Practitioner · Patient · Slot management"],
              ["Consulting & firms", "Consultation · Specialist · Client · Intake forms"],
            ].map(([title, vocabulary], index) => (
              <div key={title} className="min-h-48 border-b border-r border-white/10 p-6 last:border-b-0 sm:p-8 even:border-r-0">
                <span className="font-mono text-[9px] text-white/30">0{index + 1}</span>
                <h3 className="mt-10 text-base font-semibold">{title}</h3>
                <p className="mt-2 text-xs leading-5 text-white/45">{vocabulary}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PricingSection plans={plans} />

      <section className="border-t bg-[#dce6ff]">
        <div className="mx-auto flex max-w-[1400px] flex-col items-start gap-8 px-5 py-20 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:px-12 lg:py-24">
          <div>
            <Sparkles className="size-6 text-primary" />
            <h2 className="mt-6 max-w-3xl font-heading text-5xl font-medium leading-[0.94] tracking-[-0.05em] sm:text-7xl">
              Ready for an AI front desk that fills your calendar?
            </h2>
            <p className="mt-4 max-w-xl text-base text-slate-700 leading-relaxed">
              Start taking automated bookings, answering client inquiries, and sending WhatsApp reminders in under 5 minutes.
            </p>
          </div>
          <Button asChild size="lg" className="h-12 shrink-0 gap-2 rounded-md px-6 shadow-none">
            <Link href="/sign-up">Start with Core for ₦1,000/mo <ArrowRight className="size-4" /></Link>
          </Button>
        </div>
      </section>

      <footer className="border-t bg-card">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-5 px-5 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:px-8 lg:px-12">
          <Brand />
          <p className="sm:ml-auto">
            Website developed by <a href="https://www.instagram.com/thecoachmanuel" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 hover:underline">Coach Manuel</a>.
          </p>
          <Link href="/pricing" className="hover:text-foreground">Pricing</Link>
          <Link href="/contact" className="hover:text-foreground">Contact</Link>
          <Link href="/sign-in" className="hover:text-foreground">Sign in</Link>
        </div>
      </footer>
    </main>
  );
}
