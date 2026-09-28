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
  Sparkles,
  Layers,
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

  // Step 1: Model ("services" | "ecommerce" | "hybrid"), Step 2: Details
  const [step, setStep] = useState<1 | 2>(1);
  const [businessModel, setBusinessModel] = useState<"services" | "ecommerce" | "hybrid">("services");

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
        businessType: businessModel === "ecommerce" ? category : businessType,
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

      const welcomeMessage =
        businessModel === "ecommerce"
          ? "Online store created successfully! Welcome to Qwilo."
          : businessModel === "hybrid"
          ? "Unified booking & commerce workspace created! Welcome to Qwilo."
          : "Business workspace set up successfully! Welcome to Qwilo.";

      toast.success(welcomeMessage);

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

      <div className="relative z-10 w-full max-w-3xl">
        {/* Brand header */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-foreground text-background shadow-lg">
            <BrandIcon className="size-7 border-none bg-transparent text-background" inverted />
          </div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
            {step === 1 ? "What kind of business are you setting up?" : "Configure your workspace"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-lg">
            {step === 1
              ? `Welcome, ${firstName}! Choose whether you offer appointments, sell products online, or want both combined.`
              : businessModel === "ecommerce"
              ? "A few quick details to prepare your online store, catalog, and WhatsApp checkout."
              : businessModel === "hybrid"
              ? "Configure your combined booking calendar, staff availability, and retail product storefront."
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
              {step === 1
                ? "Choose Business Model"
                : businessModel === "ecommerce"
                ? "Store & Delivery Details"
                : businessModel === "hybrid"
                ? "Unified Setup Details"
                : "Service & Booking Details"}
            </span>
            <div className="ml-auto text-xs text-muted-foreground font-mono">
              Step {step} of 2
            </div>
          </div>

          {/* STEP 1: CHOOSE MODEL */}
          {step === 1 ? (
            <div className="space-y-6 p-7">
              <div className="grid gap-4 sm:grid-cols-3">
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

                  <h2 className="text-sm font-bold text-foreground">Services & Bookings</h2>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    Barbershops, salons, dental clinics, spas, fitness & service appointments.
                  </p>

                  <div className="mt-4 space-y-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Check className="size-3.5 text-emerald-600 shrink-0" />
                      <span>24/7 AI receptionist</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="size-3.5 text-emerald-600 shrink-0" />
                      <span>Self-serve booking calendar</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="size-3.5 text-emerald-600 shrink-0" />
                      <span>Staff & branch scheduling</span>
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

                  <h2 className="text-sm font-bold text-foreground">Online Store & Products</h2>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    Fashion, beauty, electronics, food & retail product brands.
                  </p>

                  <div className="mt-4 space-y-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Check className="size-3.5 text-blue-600 shrink-0" />
                      <span>Online store & cart</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="size-3.5 text-blue-600 shrink-0" />
                      <span>WhatsApp checkout</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="size-3.5 text-blue-600 shrink-0" />
                      <span>Live delivery tracking</span>
                    </div>
                  </div>
                </button>

                {/* Hybrid Card */}
                <button
                  type="button"
                  onClick={() => setBusinessModel("hybrid")}
                  className={cn(
                    "flex flex-col text-left rounded-xl border p-5 transition-all cursor-pointer relative",
                    businessModel === "hybrid"
                      ? "border-primary bg-primary/[0.03] ring-2 ring-primary/20 shadow-sm"
                      : "border-border/80 hover:border-border hover:bg-black/[0.01]"
                  )}
                >
                  <div className="flex items-center justify-between w-full mb-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-purple-50 text-purple-700 border border-purple-200/60">
                      <Sparkles className="size-5" />
                    </div>
                    <Badge variant="outline" className="text-2xs font-semibold bg-purple-50 text-purple-800 border-purple-200">
                      Unified Suite
                    </Badge>
                  </div>

                  <h2 className="text-sm font-bold text-foreground">Both (Services + Store)</h2>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    Salons selling hair products, clinics selling skincare, or wellness studios.
                  </p>

                  <div className="mt-4 space-y-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Check className="size-3.5 text-purple-600 shrink-0" />
                      <span>Bookings + Storefront</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="size-3.5 text-purple-600 shrink-0" />
                      <span>AI voice & chat assistant</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="size-3.5 text-purple-600 shrink-0" />
                      <span>Unified WhatsApp alerts</span>
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
                  Continue with{" "}
                  {businessModel === "ecommerce"
                    ? "Commerce Suite"
                    : businessModel === "hybrid"
                    ? "Unified Suite (Services + Store)"
                    : "Booking Suite"}
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
                  {businessModel === "ecommerce"
                    ? "🛍️ Commerce Suite"
                    : businessModel === "hybrid"
                    ? "✨ Unified Suite"
                    : "📅 Booking Suite"}
                </Badge>
              </div>

              {/* Business / Store Name */}
              <div className="space-y-2">
                <Label htmlFor="businessName" className="text-sm font-semibold">
                  {businessModel === "ecommerce"
                    ? "Store / Brand Name"
                    : "Business Name"}{" "}
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
                    placeholder={
                      businessModel === "ecommerce"
                        ? "e.g. Bella Fashion Hub, Kicks Empire..."
                        : "e.g. Luxe Hair Studio, Vitality Clinic..."
                    }
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
                    : "This will be the name of your workspace, public site, and customer receipts."}
                </p>
              </div>

              {/* Services or Hybrid: Service Business Type */}
              {(businessModel === "services" || businessModel === "hybrid") && (
                <div className="space-y-2">
                  <Label htmlFor="businessType" className="text-sm font-semibold">
                    Primary Service Type / Industry
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
                  <p className="text-xs text-muted-foreground">
                    Customizes your appointment calendar, treatment duration templates, and staff terminology.
                  </p>
                </div>
              )}

              {/* Ecommerce or Hybrid: Retail Product Category */}
              {(businessModel === "ecommerce" || businessModel === "hybrid") && (
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-sm font-semibold">
                    Product Retail Category
                  </Label>
                  <div className="relative">
                    <Store className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground z-10" />
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger id="category" className="h-12 pl-10 text-sm">
                        <SelectValue placeholder="Select product category..." />
                      </SelectTrigger>
                      <SelectContent>
                        {ECOMMERCE_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            <span className="font-medium text-sm">{cat.label}</span>
                            <span className="ml-2 text-xs text-muted-foreground">({cat.description})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Pre-configures sample products and storefront collections tailored to your brand.
                  </p>
                </div>
              )}

              {/* Ecommerce or Hybrid: Delivery Area */}
              {(businessModel === "ecommerce" || businessModel === "hybrid") && (
                <div className="space-y-2">
                  <Label htmlFor="deliveryCity" className="text-sm font-semibold">
                    Primary Delivery City / Area
                  </Label>
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground z-10" />
                    <Select value={deliveryCity} onValueChange={setDeliveryCity}>
                      <SelectTrigger id="deliveryCity" className="h-12 pl-10 text-sm">
                        <SelectValue placeholder="Select primary shipping region..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Lagos Mainland">Lagos (Mainland & Surulere)</SelectItem>
                        <SelectItem value="Lagos Island">Lagos (Island, Lekki, Ikoyi & VI)</SelectItem>
                        <SelectItem value="Abuja Express">Abuja (FCT Express)</SelectItem>
                        <SelectItem value="Port Harcourt Central">Port Harcourt Central</SelectItem>
                        <SelectItem value="Nationwide Standard">Nationwide Standard Shipping</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Sets up your first active shipping rate. You can add more delivery zones at any time.
                  </p>
                </div>
              )}

              {/* Currency */}
              <div className="space-y-2">
                <Label htmlFor="currency" className="text-sm font-semibold">
                  Operating Currency
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
                      <SelectItem value="GBP">GBP (£) — British Pound</SelectItem>
                      <SelectItem value="EUR">EUR (€) — Euro</SelectItem>
                      <SelectItem value="CAD">CAD ($) — Canadian Dollar</SelectItem>
                      <SelectItem value="GHS">GHS (₵) — Ghanaian Cedi</SelectItem>
                      <SelectItem value="KES">KES (KSh) — Kenyan Shilling</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">
                  Applied to your price tags, booking deposits, and WhatsApp checkout totals.
                </p>
              </div>

              {/* Submit */}
              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={loading || !businessName.trim()}
                  className="w-full h-12 text-sm font-semibold gap-2 shadow-sm cursor-pointer"
                >
                  {loading ? (
                    <>Configuring your workspace...</>
                  ) : (
                    <>
                      Complete Setup & Enter Workspace
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
