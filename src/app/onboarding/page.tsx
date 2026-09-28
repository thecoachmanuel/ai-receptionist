"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Building2,
  ArrowRight,
  ArrowLeft,
  Briefcase,
  CalendarDays,
  ShoppingBag,
  Check,
  Store,
  MapPin,
  Coins,
} from "lucide-react";
import { toast } from "sonner";
import { BrandIcon } from "@/components/brand";
import { Badge } from "@/components/ui/badge";
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
import { BUSINESS_PRESET_LIST } from "@/lib/business-presets";
import { cn } from "@/lib/utils";

const ECOMMERCE_CATEGORIES = [
  { id: "fashion", label: "Fashion & Apparel", description: "Clothing, shoes, bags & accessories" },
  { id: "beauty", label: "Beauty & Cosmetics", description: "Skincare, hair care, makeup & perfumes" },
  { id: "electronics", label: "Electronics & Gadgets", description: "Phones, accessories & electronics" },
  { id: "food", label: "Food & Groceries", description: "Provisions, food items & catering" },
  { id: "home", label: "Home & Living", description: "Decor, kitchenware & essentials" },
  { id: "general", label: "General Retail", description: "Multiple products & merchandise" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, update: updateSession } = useSession();

  // Step 1: Model ("services" | "ecommerce"), Step 2: Details
  const [step, setStep] = useState<1 | 2>(1);
  const [businessModel, setBusinessModel] = useState<"services" | "ecommerce">("services");

  // Common details
  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(false);

  // Services-specific details
  const [businessType, setBusinessType] = useState("barber");

  // Ecommerce-specific details
  const [category, setCategory] = useState("fashion");
  const [currency, setCurrency] = useState("NGN");
  const [deliveryCity, setDeliveryCity] = useState("Lagos Mainland");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!businessName.trim() || businessName.trim().length < 2) {
      toast.error("Please enter a valid business name (at least 2 characters).");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        businessName: businessName.trim(),
        businessModel,
        businessType: businessModel === "services" ? businessType : category,
        category,
        currency,
        deliveryCity,
      };

      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to set up workspace.");
      }

      // Clear the isNewGoogleUser flag from session
      await updateSession({ isNewGoogleUser: false, orgSlug: data.slug });

      toast.success(
        businessModel === "ecommerce"
          ? "Online store created successfully! Welcome to Qwilo."
          : "Business workspace set up successfully! Welcome to Qwilo."
      );

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
  const firstName = userName.split(" ")[0];

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center px-4 py-12">
      {/* Subtle grid background */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle, #1c1c1a 1px, transparent 1px)`,
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative z-10 w-full max-w-xl">
        {/* Brand header */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-foreground text-background shadow-lg">
            <BrandIcon className="size-7 border-none bg-transparent text-background" inverted />
          </div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
            {step === 1 ? "What kind of business are you setting up?" : "Let's configure your workspace"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-md">
            {step === 1
              ? `Welcome, ${firstName}! Choose your primary business model so we can customize your workspace suite.`
              : businessModel === "ecommerce"
              ? "A few quick details to prepare your online store, catalog, and WhatsApp checkout."
              : "A few quick details to prepare your booking calendar, service menu, and AI receptionist."}
          </p>
        </div>

        {/* Card */}
        <div className="overflow-hidden rounded-2xl border border-border/80 bg-[#fafafa] shadow-[0_24px_70px_rgba(0,0,0,0.06)]">
          {/* Progress indicator */}
          <div className="flex items-center gap-3 border-b border-black/8 bg-black/[0.02] px-6 py-4">
            <div className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
              {step}
            </div>
            <span className="text-sm font-medium text-foreground">
              {step === 1 ? "Choose Business Model" : businessModel === "ecommerce" ? "Store Details" : "Service Details"}
            </span>
            <div className="ml-auto text-xs text-muted-foreground font-mono">
              Step {step} of 2
            </div>
          </div>

          {/* STEP 1: CHOOSE MODEL */}
          {step === 1 ? (
            <div className="space-y-5 p-7">
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Services Card */}
                <button
                  type="button"
                  onClick={() => setBusinessModel("services")}
                  className={cn(
                    "flex flex-col text-left rounded-xl border p-5 transition-all cursor-pointer relative",
                    businessModel === "services"
                      ? "border-primary bg-primary/[0.03] ring-2 ring-primary/20 shadow-sm"
                      : "border-border/80 hover:border-border hover:bg-black/[0.01]"
                  )}
                >
                  <div className="flex items-center justify-between w-full mb-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                      <CalendarDays className="size-5" />
                    </div>
                    <Badge variant="outline" className="text-2xs font-semibold bg-emerald-50 text-emerald-800 border-emerald-200">
                      Booking Suite
                    </Badge>
                  </div>

                  <h2 className="text-base font-bold text-foreground">Services & Appointments</h2>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    Barbershops, salons, dental clinics, spas, fitness & service appointments.
                  </p>

                  <div className="mt-4 space-y-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Check className="size-3.5 text-emerald-600 shrink-0" />
                      <span>AI phone receptionist 24/7</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="size-3.5 text-emerald-600 shrink-0" />
                      <span>Client booking calendar</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="size-3.5 text-emerald-600 shrink-0" />
                      <span>Staff & branches setup</span>
                    </div>
                  </div>
                </button>

                {/* Ecommerce Card */}
                <button
                  type="button"
                  onClick={() => setBusinessModel("ecommerce")}
                  className={cn(
                    "flex flex-col text-left rounded-xl border p-5 transition-all cursor-pointer relative",
                    businessModel === "ecommerce"
                      ? "border-primary bg-primary/[0.03] ring-2 ring-primary/20 shadow-sm"
                      : "border-border/80 hover:border-border hover:bg-black/[0.01]"
                  )}
                >
                  <div className="flex items-center justify-between w-full mb-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700 border border-blue-200/60">
                      <ShoppingBag className="size-5" />
                    </div>
                    <Badge variant="outline" className="text-2xs font-semibold bg-blue-50 text-blue-800 border-blue-200">
                      Commerce Suite
                    </Badge>
                  </div>

                  <h2 className="text-base font-bold text-foreground">Online Store & Products</h2>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    Fashion, beauty, gadgets, groceries & retail product sellers.
                  </p>

                  <div className="mt-4 space-y-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Check className="size-3.5 text-blue-600 shrink-0" />
                      <span>Shopify-level store & cart</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="size-3.5 text-blue-600 shrink-0" />
                      <span>Automated WhatsApp checkout</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="size-3.5 text-blue-600 shrink-0" />
                      <span>Inventory & delivery tracking</span>
                    </div>
                  </div>
                </button>
              </div>

              <div className="pt-2">
                <Button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full h-12 text-sm font-semibold gap-2 shadow-sm cursor-pointer"
                >
                  Continue with {businessModel === "ecommerce" ? "Commerce Suite" : "Booking Suite"}
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            </div>
          ) : (
            /* STEP 2: DETAILS FORM */
            <form onSubmit={handleSubmit} noValidate className="space-y-6 p-7">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <ArrowLeft className="size-3.5" /> Change business model
                </button>
                <Badge variant="outline" className="text-2xs font-mono">
                  {businessModel === "ecommerce" ? "🛍️ Commerce Suite" : "📅 Booking Suite"}
                </Badge>
              </div>

              {/* Business / Store Name */}
              <div className="space-y-2">
                <Label htmlFor="businessName" className="text-sm font-semibold">
                  {businessModel === "ecommerce" ? "Store / Brand Name" : "Business Name"}{" "}
                  <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  {businessModel === "ecommerce" ? (
                    <Store className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  ) : (
                    <Building2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  )}
                  <Input
                    id="businessName"
                    type="text"
                    placeholder={businessModel === "ecommerce" ? "e.g. Bella Fashion Hub, Kicks Empire..." : "e.g. Luxe Hair Studio, Vitality Clinic..."}
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="h-12 pl-10 text-base sm:text-sm"
                    autoFocus
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {businessModel === "ecommerce"
                    ? "This will be your brand name on your public storefront and WhatsApp receipts."
                    : "This will be the name of your Qwilo workspace and public booking site."}
                </p>
              </div>

              {/* Branch based on model */}
              {businessModel === "services" ? (
                <div className="space-y-2">
                  <Label htmlFor="businessType" className="text-sm font-semibold">
                    Business Type / Industry
                  </Label>
                  <div className="relative">
                    <Briefcase className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground z-10" />
                    <Select value={businessType} onValueChange={setBusinessType}>
                      <SelectTrigger id="businessType" className="h-12 pl-10 text-sm">
                        <SelectValue placeholder="Select your industry..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {BUSINESS_PRESET_LIST.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            <span className="font-medium text-sm">{type.label}</span>
                            <span className="ml-2 text-xs text-muted-foreground">({type.description})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <>
                  {/* Ecommerce Store Category */}
                  <div className="space-y-2">
                    <Label htmlFor="category" className="text-sm font-semibold">
                      Primary Retail Category
                    </Label>
                    <div className="relative">
                      <Briefcase className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground z-10" />
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger id="category" className="h-12 pl-10 text-sm">
                          <SelectValue placeholder="Select product category..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-72">
                          {ECOMMERCE_CATEGORIES.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              <span className="font-medium text-sm">{cat.label}</span>
                              <span className="ml-2 text-xs text-muted-foreground">({cat.description})</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Delivery Location & Currency Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="deliveryCity" className="text-sm font-semibold">
                        Primary Delivery Hub
                      </Label>
                      <div className="relative">
                        <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="deliveryCity"
                          type="text"
                          placeholder="e.g. Lagos Mainland"
                          value={deliveryCity}
                          onChange={(e) => setDeliveryCity(e.target.value)}
                          className="h-12 pl-10 text-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="currency" className="text-sm font-semibold">
                        Store Currency
                      </Label>
                      <div className="relative">
                        <Coins className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground z-10" />
                        <Select value={currency} onValueChange={setCurrency}>
                          <SelectTrigger id="currency" className="h-12 pl-10 text-sm">
                            <SelectValue placeholder="Select currency..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NGN">NGN (₦) — Nigerian Naira</SelectItem>
                            <SelectItem value="USD">USD ($) — US Dollar</SelectItem>
                            <SelectItem value="GHS">GHS (₵) — Ghanaian Cedi</SelectItem>
                            <SelectItem value="KES">KES (KSh) — Kenyan Shilling</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </>
              )}

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
                  Your Google account is linked to this workspace. You can switch between organizations anytime.
                </p>
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-sm font-semibold gap-2 shadow-sm cursor-pointer"
                disabled={loading || !businessName.trim()}
              >
                {loading ? "Preparing your workspace..." : (
                  <>
                    {businessModel === "ecommerce" ? "Launch my online store" : "Launch my workspace"}
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          You can always configure additional channels and features later in{" "}
          <span className="font-semibold text-foreground">Settings</span>.
        </p>
      </div>
    </div>
  );
}
