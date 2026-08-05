"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Building2, ArrowRight, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { BrandIcon } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const BUSINESS_TYPES = [
  { value: "salon", label: "Hair Salon / Barbershop" },
  { value: "spa", label: "Spa & Wellness" },
  { value: "clinic", label: "Medical / Health Clinic" },
  { value: "fitness", label: "Gym / Fitness Studio" },
  { value: "beauty", label: "Beauty & Aesthetics" },
  { value: "therapy", label: "Therapy & Counselling" },
  { value: "dental", label: "Dental Practice" },
  { value: "photography", label: "Photography Studio" },
  { value: "consulting", label: "Consulting / Coaching" },
  { value: "education", label: "Education / Tutoring" },
  { value: "other", label: "Other" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, update: updateSession } = useSession();
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!businessName.trim() || businessName.trim().length < 2) {
      toast.error("Please enter your business name (at least 2 characters).");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName: businessName.trim(), businessType }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save business name.");
      }

      // Clear the isNewGoogleUser flag from session
      await updateSession({ isNewGoogleUser: false, orgSlug: data.slug });

      toast.success("Business set up successfully! Welcome to Oneboard.");

      // Brief delay to allow session update to propagate
      setTimeout(() => {
        router.push(data.slug ? `/app/${data.slug}` : "/app");
      }, 300);
    } catch (err: any) {
      toast.error(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const userName = (session?.user as any)?.name || "there";

  return (
    <div className="min-h-screen bg-[#f3f0e8] flex items-center justify-center px-4 py-12">
      {/* Subtle grid background */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle, #1c1c1a 1px, transparent 1px)`,
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative z-10 w-full max-w-lg">
        {/* Brand header */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-foreground text-background shadow-lg">
            <BrandIcon className="size-7 border-none bg-transparent text-background" inverted />
          </div>
          <h1 className="font-heading text-[28px] font-bold tracking-tight text-foreground">
            Let&apos;s set up your business
          </h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm">
            Welcome, {userName.split(" ")[0]}! Just a couple of details and your workspace will be ready.
          </p>
        </div>

        {/* Card */}
        <div className="overflow-hidden rounded-2xl border border-black/10 bg-[#faf9f5] shadow-[0_24px_70px_rgba(44,36,24,0.12)]">
          {/* Progress indicator */}
          <div className="flex items-center gap-3 border-b border-black/8 bg-black/[0.02] px-6 py-4">
            <div className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">1</div>
            <span className="text-sm font-medium text-foreground">Business Details</span>
            <div className="ml-auto text-xs text-muted-foreground font-mono">Step 1 of 1</div>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-6 p-7">
            {/* Business Name */}
            <div className="space-y-2">
              <Label htmlFor="businessName" className="text-sm font-semibold">
                Business Name <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Building2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="businessName"
                  type="text"
                  placeholder="e.g. Luxe Hair Studio, Vitality Clinic..."
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="h-12 pl-10 text-base sm:text-sm"
                  autoFocus
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                This will be the name of your Oneboard workspace and public booking site.
              </p>
            </div>

            {/* Business Type */}
            <div className="space-y-2">
              <Label htmlFor="businessType" className="text-sm font-semibold">
                Business Type <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <div className="relative">
                <Briefcase className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground z-10" />
                <Select value={businessType} onValueChange={setBusinessType}>
                  <SelectTrigger id="businessType" className="h-12 pl-10 text-sm">
                    <SelectValue placeholder="Select your industry..." />
                  </SelectTrigger>
                  <SelectContent>
                    {BUSINESS_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Google account note */}
            <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
              <div className="mt-0.5 size-4 shrink-0">
                <svg viewBox="0 0 24 24" className="size-4">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                You signed in with Google. Your personal account is linked — this business name will be used for your workspace.
              </p>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-sm font-semibold gap-2 shadow-sm cursor-pointer"
              disabled={loading || !businessName.trim()}
            >
              {loading ? "Setting up your workspace..." : (
                <>
                  Launch my workspace
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          You can always rename your business later in{" "}
          <span className="font-semibold text-foreground">Settings → Business Details</span>.
        </p>
      </div>
    </div>
  );
}
