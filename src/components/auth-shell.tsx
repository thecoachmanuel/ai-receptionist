import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarCheck, Headphones, Sparkles } from "lucide-react";
import { Brand } from "@/components/brand";

const signals = [
  { icon: Headphones, label: "Every conversation, answered" },
  { icon: CalendarCheck, label: "Every request, organized" },
  { icon: Sparkles, label: "Every organization, its own" },
];

export function AuthShell({
  children,
  eyebrow,
  title,
}: {
  children: ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <main className="h-screen max-h-screen overflow-hidden lg:grid lg:grid-cols-[minmax(0,0.92fr)_minmax(560px,1.08fr)] bg-background">
      {/* Left side: FIXED TO VIEWPORT, NEVER SCROLLS */}
      <section className="relative hidden h-screen overflow-hidden bg-[#151923] px-10 xl:px-14 py-10 text-white lg:flex lg:flex-col justify-between select-none">
        <div className="absolute inset-0 hairline-grid opacity-[0.09] pointer-events-none" />
        <div className="absolute -right-44 top-1/4 size-[460px] rounded-full border border-blue-300/20 pointer-events-none" />
        <div className="absolute -right-20 top-[34%] size-[250px] rounded-full border border-blue-300/15 pointer-events-none" />

        <Brand inverted className="relative z-10" />

        <div className="relative z-10 my-auto max-w-xl py-8">
          <p className="mb-4 font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-blue-300">
            One workspace. Every front door.
          </p>
          <h1 className="font-heading text-5xl xl:text-6xl font-medium leading-[0.94] tracking-[-0.05em] text-balance">
            Your business can be personal without being permanently online.
          </h1>

          <div className="mt-8 grid gap-3">
            {signals.map(({ icon: Icon, label }, index) => (
              <div
                key={label}
                className="flex items-center gap-3.5 border-t border-white/12 pt-3"
              >
                <span className="font-mono text-[10px] text-white/35">
                  0{index + 1}
                </span>
                <Icon className="size-4 text-blue-300 shrink-0" />
                <span className="text-sm text-white/85 font-medium">{label}</span>
              </div>
            ))}
          </div>

          {/* Pricing Highlight */}
          <div className="mt-8 inline-flex items-center gap-2.5 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 backdrop-blur-xs">
            <span className="flex size-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-white/90">
              Plans start at <strong className="font-semibold text-white">₦1,000/mo</strong> (Core) · 2 months free yearly
            </span>
          </div>
        </div>

        <p className="relative z-10 max-w-md text-xs leading-5 text-white/45">
          Built for the way service businesses, studios, practices, and support
          teams actually work.
        </p>
      </section>

      {/* Right side: SCROLLABLE CONTAINER with STICKY HEADER */}
      <section className="relative flex h-screen max-h-screen flex-col overflow-y-auto bg-background">
        {/* Fixed / Sticky Header - stays permanently in position as right side scrolls */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border/40 bg-background/95 px-6 py-4 backdrop-blur-md sm:px-10">
          <Brand className="lg:hidden" />
          <Link
            href="/"
            className="ml-auto inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3.5 py-1.5 text-xs font-semibold text-foreground/80 shadow-2xs transition-all hover:bg-accent hover:text-foreground active:scale-95"
          >
            <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
            Back to the site
          </Link>
        </header>

        {/* Scrollable form body */}
        <div className="flex flex-1 items-start justify-center px-6 py-8 sm:px-10 lg:py-10">
          <div className="w-full max-w-[460px] pb-16">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
              {eyebrow}
            </p>
            <h2 className="mb-6 mt-2 font-heading text-3xl sm:text-4xl font-medium tracking-[-0.04em]">
              {title}
            </h2>
            {children}
          </div>
        </div>
      </section>
    </main>
  );
}
