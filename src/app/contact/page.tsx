export const dynamic = "force-dynamic";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Clock3,
  Mail,
  MessageSquare,
  Phone,
  Send,
  Sparkles,
} from "lucide-react";

import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getSession } from "@/lib/auth/session";
import { getPlatformSettings } from "@/lib/services/settings";

export default async function ContactPage() {
  const [session, settings] = await Promise.all([
    getSession(),
    getPlatformSettings(),
  ]);

  const phone = settings.contactPhone || "+2348168882014";
  const email = settings.contactEmail || "oneboardng@gmail.com";
  const cleanPhone = phone.replace(/[^0-9+]/g, "");

  return (
    <main className="min-h-dvh bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/80 bg-background/92 backdrop-blur-md">
        <div className="mx-auto flex h-17 max-w-[1400px] items-center px-5 sm:px-8 lg:px-12">
          <Brand />
          <nav className="ml-12 hidden items-center gap-7 text-sm text-muted-foreground md:flex">
            <Link className="transition-colors hover:text-foreground" href="/#platform">
              Platform
            </Link>
            <Link className="transition-colors hover:text-foreground" href="/#built-for">
              Built for
            </Link>
            <Link className="transition-colors hover:text-foreground" href="/pricing">
              Pricing
            </Link>
            <Link className="font-semibold text-foreground transition-colors" href="/contact">
              Contact
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {!session?.user ? (
              <>
                <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                  <Link href="/sign-in">Sign in</Link>
                </Button>
                <Button asChild size="sm" className="gap-1.5 shadow-none">
                  <Link href="/sign-up">
                    Start free <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              </>
            ) : (
              <Button asChild size="sm" className="gap-1.5 shadow-none">
                <Link href="/app">
                  Open workspace <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <section className="mx-auto max-w-[1400px] px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
        <div className="mb-14 max-w-3xl">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
            We are here to help
          </p>
          <h1 className="mt-5 font-heading text-5xl font-medium leading-[0.92] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
            Get in touch with Oneboard.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground">
            Have questions about setting up your AI Receptionist, custom pricing, or enterprise features? Reach out to our team directly.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.8fr)] lg:items-start">
          {/* Contact Details Cards */}
          <div className="space-y-4">
            <Card className="bg-card border-border/80 shadow-sm transition hover:shadow-md">
              <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
                <div className="grid size-11 place-items-center rounded-full bg-primary/10 text-primary">
                  <Phone className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">Call or WhatsApp</CardTitle>
                  <CardDescription className="text-xs">Direct phone & instant messaging support</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <a
                  href={`tel:${cleanPhone}`}
                  className="font-mono text-lg font-medium text-foreground hover:text-primary transition-colors block"
                >
                  {phone}
                </a>
                <p className="mt-1 text-xs text-muted-foreground">
                  Available for phone calls, WhatsApp messages, and SMS support.
                </p>
                <div className="mt-4 flex gap-2">
                  <Button asChild variant="outline" size="xs" className="gap-1.5 font-mono">
                    <a href={`tel:${cleanPhone}`}>
                      <Phone className="size-3" /> Call now
                    </a>
                  </Button>
                  <Button asChild variant="secondary" size="xs" className="gap-1.5 font-mono">
                    <a
                      href={`https://wa.me/${cleanPhone.replace("+", "")}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MessageSquare className="size-3" /> WhatsApp
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border/80 shadow-sm transition hover:shadow-md">
              <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
                <div className="grid size-11 place-items-center rounded-full bg-purple-500/10 text-purple-600">
                  <Mail className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">Email Support</CardTitle>
                  <CardDescription className="text-xs">Inquiries, setup assistance & partnerships</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <a
                  href={`mailto:${email}`}
                  className="font-mono text-base font-medium text-foreground hover:text-primary transition-colors block truncate"
                >
                  {email}
                </a>
                <p className="mt-1 text-xs text-muted-foreground">
                  We reply to email inquiries within 1 to 2 business hours.
                </p>
                <div className="mt-4">
                  <Button asChild variant="outline" size="xs" className="gap-1.5 font-mono">
                    <a href={`mailto:${email}`}>
                      <Mail className="size-3" /> Send email
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border/80 shadow-sm">
              <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
                <div className="grid size-11 place-items-center rounded-full bg-emerald-500/10 text-emerald-600">
                  <Clock3 className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">Operating Hours</CardTitle>
                  <CardDescription className="text-xs">Always-on AI concierge platform</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="pt-2 text-xs text-muted-foreground leading-relaxed">
                <p>
                  <strong className="text-foreground font-medium">AI Concierge & Booking Engine:</strong> 24/7/365 active
                </p>
                <p className="mt-1">
                  <strong className="text-foreground font-medium">Human Operations Desk:</strong> Monday – Saturday, 8:00 AM – 8:00 PM WAT
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Contact Message Form */}
          <Card className="bg-card border-border/80 shadow-sm p-2 sm:p-4">
            <CardHeader>
              <CardTitle className="font-heading text-2xl font-semibold tracking-tight">
                Send us a message
              </CardTitle>
              <CardDescription className="text-xs">
                Fill out the form below and an Operations Desk representative will contact you shortly.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="contact-name" className="text-xs font-medium">
                      Your Name
                    </Label>
                    <Input id="contact-name" placeholder="e.g. Dr. Alex Johnson" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="contact-email-input" className="text-xs font-medium">
                      Email Address
                    </Label>
                    <Input id="contact-email-input" type="email" placeholder="name@business.com" required />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="contact-phone-input" className="text-xs font-medium">
                    Phone Number
                  </Label>
                  <Input id="contact-phone-input" type="tel" placeholder="+234..." />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="contact-message" className="text-xs font-medium">
                    How can we help your business?
                  </Label>
                  <Textarea
                    id="contact-message"
                    rows={5}
                    placeholder="Tell us about your organization, appointment booking requirements, or voice agent needs..."
                    required
                  />
                </div>

                <Button type="submit" size="lg" className="w-full gap-2 mt-2">
                  <Send className="size-4" /> Send message
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card py-12">
        <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-6 px-5 sm:flex-row sm:px-8 lg:px-12">
          <Brand />
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <Link href="/" className="hover:text-foreground">Home</Link>
            <Link href="/pricing" className="hover:text-foreground">Pricing</Link>
            <Link href="/contact" className="hover:text-foreground font-semibold">Contact</Link>
            <a href={`tel:${cleanPhone}`} className="hover:text-foreground font-mono">{phone}</a>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Oneboard. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}
