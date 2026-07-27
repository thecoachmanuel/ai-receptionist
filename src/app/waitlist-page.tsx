"use client";

import { useState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { Brand } from "@/components/brand";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function WaitlistPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error("Please provide both name and email.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to join waitlist");
      
      setSubmitted(true);
      toast.success("You've been added to the waitlist!");
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 border-b border-border/80 bg-background/92 backdrop-blur-md">
        <div className="mx-auto flex h-17 max-w-[1400px] items-center px-5 sm:px-8 lg:px-12">
          <Brand />
        </div>
      </header>

      <section className="relative flex-1 flex items-center justify-center border-b">
        <div className="absolute inset-0 hairline-grid opacity-45 [mask-image:linear-gradient(to_bottom,black,transparent_88%)]" />
        
        <div className="relative mx-auto w-full max-w-[1400px] px-5 py-20 sm:px-8 lg:px-12 flex flex-col items-center text-center">
          <Badge variant="outline" className="mb-7 rounded-sm bg-background px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em]">
            Waitlist Mode
          </Badge>
          
          <h1 className="font-heading text-[clamp(3.5rem,8vw,6.5rem)] font-medium leading-[0.82] tracking-[-0.065em] text-balance">
            Something great is
            <span className="mt-3 block text-primary italic">coming soon.</span>
          </h1>
          
          <p className="mt-9 max-w-xl text-lg leading-7 text-muted-foreground sm:text-xl sm:leading-8">
            Oneboard is a next-generation AI receptionist that works 24/7 for your business. Oneboard handles your bookings, and chats with your customers exactly the way you would. Join the waitlist to be the first to know when we launch.
          </p>
          
          <div className="mt-12 w-full max-w-md bg-card border border-foreground/12 shadow-[8px_12px_0_0_oklch(0.205_0.018_264.4)] p-6 sm:p-8">
            {submitted ? (
              <div className="text-center py-8">
                <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10">
                  <ArrowRight className="size-6 text-primary" />
                </div>
                <h3 className="font-heading text-2xl font-medium tracking-tight">You&apos;re on the list!</h3>
                <p className="mt-2 text-sm text-muted-foreground">We&apos;ll be in touch as soon as we&apos;re ready for you.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 text-left">
                <div className="space-y-1.5">
                  <label htmlFor="name" className="text-xs font-semibold text-foreground">Name</label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    required
                    className="h-11 rounded-md bg-background"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-xs font-semibold text-foreground">Email</label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="hello@example.com"
                    required
                    className="h-11 rounded-md bg-background"
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full h-11 mt-2 text-sm rounded-md shadow-none gap-2">
                  {loading ? <LoaderCircle className="size-4 animate-spin" /> : <>Join Waitlist <ArrowRight className="size-4" /></>}
                </Button>
              </form>
            )}
          </div>
        </div>
      </section>

      <footer className="bg-card">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-5 px-5 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:px-8 lg:px-12">
          <span>&copy; {new Date().getFullYear()} Oneboard Platform.</span>
          <span className="sm:ml-auto">
            Website built by <a href="https://www.instagram.com/thecoachmanuel" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 hover:underline">Coach Manuel</a>.
          </span>
        </div>
      </footer>
    </main>
  );
}
