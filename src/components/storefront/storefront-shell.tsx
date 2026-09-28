"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Copy,
  CreditCard,
  ExternalLink,
  HelpCircle,
  Loader2,
  Minus,
  Package,
  Plus,
  ShoppingBag,
  Store,
  Tag,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useCart, type ShippingZoneOption } from "@/components/storefront/cart-context";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMoney(minor: number, currency = "NGN"): string {
  const major = minor / 100;
  if (currency === "NGN") {
    return `₦${major.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }
  return `${currency} ${major.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface StorefrontShellProps {
  siteSlug: string;
  storeName: string;
  logoUrl?: string;
  currency?: string;
  shippingZones?: ShippingZoneOption[];
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    accountName: string;
    instructions?: string;
  } | null;
  whatsappPhone?: string;
  children: React.ReactNode;
}

export function StorefrontShell({
  siteSlug,
  storeName,
  logoUrl,
  currency = "NGN",
  shippingZones = [],
  bankDetails,
  whatsappPhone,
  children,
}: StorefrontShellProps) {
  const router = useRouter();
  const {
    items,
    itemCount,
    subtotalMinor,
    shippingFeeMinor,
    totalMinor,
    selectedShippingZone,
    setSelectedShippingZone,
    updateQuantity,
    removeItem,
    clearCart,
    isCartOpen,
    setIsCartOpen,
  } = useCart();

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [copiedBank, setCopiedBank] = useState(false);
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // Form State
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<
    "whatsapp_bank_transfer" | "whatsapp_paystack" | "cash_on_delivery"
  >("whatsapp_bank_transfer");

  // Promo Code State
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    discountMinor: number;
  } | null>(null);
  const [validatingPromo, setValidatingPromo] = useState(false);

  const discountMinor = appliedPromo?.discountMinor ?? 0;
  const finalTotalMinor = Math.max(0, totalMinor - discountMinor);

  const handleApplyPromo = async () => {
    if (!promoCodeInput.trim()) return;
    setValidatingPromo(true);
    try {
      const res = await fetch("/api/data/publicCommerce/validatePromoCode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteSlug,
          code: promoCodeInput.trim(),
          subtotalMinor,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) {
        toast.error(data.error || "Invalid promo code");
        return;
      }
      setAppliedPromo({
        code: data.promoCode,
        discountMinor: data.discountMinor,
      });
      toast.success(`Promo code ${data.promoCode} applied!`);
    } catch {
      toast.error("Failed to apply promo code");
    } finally {
      setValidatingPromo(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoCodeInput("");
  };

  const activeZones = shippingZones.filter((z: any) => z.active !== false);

  const copyAccountNumber = (acc: string) => {
    navigator.clipboard.writeText(acc);
    setCopiedBank(true);
    toast.success("Account number copied");
    setTimeout(() => setCopiedBank(false), 2000);
  };

  const handlePlaceOrder = async (e: FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim() || !street.trim() || !city.trim()) {
      toast.error("Please fill in all delivery details");
      return;
    }

    if (items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    setSubmittingOrder(true);
    try {
      const orderPayload = {
        items: items.map((i) => ({
          productId: i.productId,
          productName: i.productName,
          variantLabel: i.variantLabel,
          sku: i.sku,
          imageUrl: i.imageUrl,
          quantity: i.quantity,
          unitPriceMinor: i.unitPriceMinor,
          lineTotalMinor: i.unitPriceMinor * i.quantity,
        })),
        subtotalMinor,
        deliveryFeeMinor: shippingFeeMinor,
        discountMinor,
        totalMinor: finalTotalMinor,
        currency,
        status: "pending" as const,
        paymentStatus: "unpaid" as const,
        paymentMethod,
        deliveryAddress: {
          fullName: fullName.trim(),
          phone: phone.trim(),
          street: street.trim(),
          city: city.trim(),
          state: stateName.trim() || "State",
        },
        channel: "storefront" as const,
      };

      const res = await fetch("/api/data/publicCommerce/createOrder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteSlug,
          orderData: orderPayload,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create order");
      }

      const order = await res.json();

      // Build structured WhatsApp message
      const itemsList = items
        .map(
          (i) =>
            `• *${i.productName}* (${i.variantLabel}) x${i.quantity} — ${formatMoney(i.unitPriceMinor * i.quantity, currency)}`,
        )
        .join("\n");

      const waText = encodeURIComponent(
        `🛍️ *NEW ORDER: ${order.orderNumber}*\n` +
          `Store: *${storeName}*\n\n` +
          `👤 *Customer:* ${fullName.trim()}\n` +
          `📞 *Phone:* ${phone.trim()}\n` +
          `📍 *Delivery:* ${street.trim()}, ${city.trim()}, ${stateName.trim()}\n\n` +
          `🛒 *ITEMS:*\n${itemsList}\n\n` +
          `📦 *Delivery Fee:* ${formatMoney(shippingFeeMinor, currency)} (${selectedShippingZone?.name || "Standard"})\n` +
          (discountMinor > 0 ? `🏷️ *Discount (${appliedPromo?.code}):* -${formatMoney(discountMinor, currency)}\n` : "") +
          `💰 *TOTAL:* *${formatMoney(finalTotalMinor, currency)}*\n` +
          `💳 *Payment Method:* ${paymentMethod.replace(/_/g, " ").toUpperCase()}\n\n` +
          `🔗 Track: ${window.location.origin}/${siteSlug}/orders/${order.orderNumber}`,
      );

      // Clean target WhatsApp phone
      const targetPhone = (whatsappPhone || "").replace(/\D/g, "");
      const waUrl = targetPhone
        ? `https://wa.me/${targetPhone}?text=${waText}`
        : `https://wa.me/?text=${waText}`;

      // Open WhatsApp chat in background/tab
      window.open(waUrl, "_blank");

      // Clear cart
      clearCart();
      setCheckoutOpen(false);
      setIsCartOpen(false);

      toast.success("Order placed successfully!");
      router.push(`/${siteSlug}/orders/${order.orderNumber}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to place order");
    } finally {
      setSubmittingOrder(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* ── Top Announcement Bar ────────────────────────────────────────── */}
      <div className="bg-primary/10 border-b border-primary/20 px-4 py-1.5 text-center text-xs font-medium text-primary flex items-center justify-center gap-2">
        <Store className="size-3.5" />
        <span>Official Store of {storeName}</span>
        <span className="hidden sm:inline">· Direct WhatsApp Checkout Available</span>
      </div>

      {/* ── Main Navigation Header ───────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          {/* Brand */}
          <Link
            href={`/${siteSlug}`}
            className="flex items-center gap-2.5 font-bold tracking-tight hover:opacity-90 transition-opacity"
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={storeName}
                className="size-8 rounded-lg object-cover border"
              />
            ) : (
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-semibold text-sm">
                {storeName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <span className="text-base sm:text-lg">{storeName}</span>
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <Link
              href={`/${siteSlug}/shop`}
              className="hover:text-foreground transition-colors"
            >
              All Products
            </Link>
            <Link
              href={`/${siteSlug}/orders`}
              className="hover:text-foreground transition-colors flex items-center gap-1"
            >
              <Package className="size-3.5" /> Track Order
            </Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCartOpen(true)}
              className="relative gap-2 text-xs font-semibold"
            >
              <ShoppingBag className="size-4" />
              <span className="hidden sm:inline">Cart</span>
              {itemCount > 0 && (
                <Badge
                  variant="default"
                  className="size-5 rounded-full p-0 flex items-center justify-center text-2xs font-bold leading-none"
                >
                  {itemCount}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* ── Page Content ──────────────────────────────────────────────────── */}
      <main className="flex-1">{children}</main>

      {/* ── Storefront Footer ─────────────────────────────────────────────── */}
      <footer className="border-t bg-muted/30 py-8 text-center text-xs text-muted-foreground">
        <div className="mx-auto max-w-6xl px-4 space-y-2">
          <p className="font-medium text-foreground">{storeName}</p>
          <div className="flex justify-center gap-4 text-xs">
            <Link href={`/${siteSlug}/shop`} className="hover:underline">
              Shop
            </Link>
            <span>·</span>
            <Link href={`/${siteSlug}/orders`} className="hover:underline">
              Track Order
            </Link>
          </div>
          <p className="text-2xs text-muted-foreground/60 pt-2">
            Powered by AI Receptionist Ecommerce Engine
          </p>
        </div>
      </footer>

      {/* ── Slide-Out Cart Drawer ────────────────────────────────────────── */}
      <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
        <SheetContent side="right" className="flex w-full flex-col sm:max-w-md p-0">
          <SheetHeader className="border-b px-6 py-4">
            <SheetTitle className="flex items-center justify-between text-base font-semibold">
              <span className="flex items-center gap-2">
                <ShoppingBag className="size-4 text-primary" /> Shopping Cart
              </span>
              <span className="text-xs font-normal text-muted-foreground">
                {itemCount} {itemCount === 1 ? "item" : "items"}
              </span>
            </SheetTitle>
          </SheetHeader>

          {items.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3">
                <ShoppingBag className="size-7" />
              </div>
              <p className="text-sm font-semibold">Your cart is empty</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Looks like you haven't added any products yet.
              </p>
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  setIsCartOpen(false);
                  router.push(`/${siteSlug}/shop`);
                }}
                className="mt-4 text-xs"
              >
                Browse Products
              </Button>
            </div>
          ) : (
            <>
              {/* Items List */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 divide-y divide-border/60">
                {items.map((item) => (
                  <div
                    key={`${item.productId}-${item.variantLabel}`}
                    className="flex gap-3 pt-3 first:pt-0"
                  >
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.productName}
                        className="size-16 rounded-md object-cover border shrink-0"
                      />
                    ) : (
                      <div className="flex size-16 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <Package className="size-6" />
                      </div>
                    )}

                    <div className="flex flex-1 flex-col justify-between min-w-0">
                      <div>
                        <p className="text-sm font-medium leading-tight truncate">
                          {item.productName}
                        </p>
                        <p className="text-2xs text-muted-foreground mt-0.5">
                          {item.variantLabel}
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center rounded-md border">
                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(
                                item.productId,
                                item.variantLabel,
                                item.quantity - 1,
                              )
                            }
                            className="px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground"
                          >
                            <Minus className="size-3" />
                          </button>
                          <span className="px-2 text-xs font-semibold">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(
                                item.productId,
                                item.variantLabel,
                                item.quantity + 1,
                              )
                            }
                            className="px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground"
                          >
                            <Plus className="size-3" />
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold">
                            {formatMoney(
                              item.unitPriceMinor * item.quantity,
                              currency,
                            )}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              removeItem(item.productId, item.variantLabel)
                            }
                            className="text-muted-foreground hover:text-destructive transition-colors p-1"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Shipping Zone Selector */}
              {activeZones.length > 0 && (
                <div className="border-t bg-muted/20 px-6 py-3 space-y-1.5">
                  <Label className="text-xs font-medium flex items-center gap-1.5">
                    <Truck className="size-3.5 text-primary" /> Delivery Area
                  </Label>
                  <select
                    value={selectedShippingZone?._id ?? ""}
                    onChange={(e) => {
                      const zone = activeZones.find(
                        (z: any) => z._id === e.target.value,
                      );
                      setSelectedShippingZone(zone ?? null);
                    }}
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs"
                  >
                    <option value="">Select your delivery location…</option>
                    {activeZones.map((z: any) => (
                      <option key={z._id} value={z._id}>
                        {z.name} — {formatMoney(z.rateMinor, currency)} (
                        {z.estimatedDeliveryDays})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Promo Code Input in Cart Drawer */}
              <div className="border-t bg-muted/10 px-6 py-3 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Tag className="size-3.5 text-primary" /> Promo / Discount Code
                </div>
                {appliedPromo ? (
                  <div className="flex items-center justify-between rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-emerald-600">{appliedPromo.code}</span>
                      <span className="text-2xs text-emerald-700">(-{formatMoney(appliedPromo.discountMinor, currency)})</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemovePromo}
                      className="text-muted-foreground hover:text-destructive"
                      title="Remove code"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Enter promo code"
                      value={promoCodeInput}
                      onChange={(e) => setPromoCodeInput(e.target.value)}
                      className="h-8 text-xs font-mono uppercase bg-background"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleApplyPromo}
                      disabled={validatingPromo || !promoCodeInput.trim()}
                      className="h-8 text-xs"
                    >
                      {validatingPromo ? <Loader2 className="size-3 animate-spin" /> : "Apply"}
                    </Button>
                  </div>
                )}
              </div>

              {/* Order Summary & Checkout Trigger */}
              <SheetFooter className="border-t bg-background px-6 py-4 space-y-3">
                <div className="w-full space-y-1.5 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>{formatMoney(subtotalMinor, currency)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Delivery</span>
                    <span>
                      {selectedShippingZone
                        ? formatMoney(shippingFeeMinor, currency)
                        : "Calculated at checkout"}
                    </span>
                  </div>
                  {discountMinor > 0 && (
                    <div className="flex justify-between text-emerald-600 font-medium">
                      <span>Discount ({appliedPromo?.code})</span>
                      <span>-{formatMoney(discountMinor, currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1 text-sm font-bold text-foreground">
                    <span>Total</span>
                    <span>{formatMoney(finalTotalMinor, currency)}</span>
                  </div>
                </div>

                <Button
                  onClick={() => setCheckoutOpen(true)}
                  className="w-full gap-2 text-xs font-semibold"
                  size="default"
                >
                  Proceed to Checkout <ArrowRight className="size-4" />
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Checkout Modal ───────────────────────────────────────────────── */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <form onSubmit={handlePlaceOrder} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <ShoppingBag className="size-5 text-primary" /> Checkout
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Enter your delivery address and choose how you would like to complete payment.
              </DialogDescription>
            </DialogHeader>

            {/* Delivery Details */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                1. Delivery Information
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Full Name</Label>
                  <Input
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Tunde Balogun"
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">WhatsApp Phone Number</Label>
                  <Input
                    required
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 08012345678"
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Street Address</Label>
                <Input
                  required
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="e.g. 15 Admiralty Way, Lekki Phase 1"
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">City</Label>
                  <Input
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Lagos"
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">State</Label>
                  <Input
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    placeholder="e.g. Lagos State"
                    className="text-xs"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Payment Options */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                2. Payment Method
              </h4>

              <div className="grid gap-2">
                {/* Bank Transfer */}
                <label
                  className={cn(
                    "flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-all",
                    paymentMethod === "whatsapp_bank_transfer"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50",
                  )}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === "whatsapp_bank_transfer"}
                    onChange={() => setPaymentMethod("whatsapp_bank_transfer")}
                    className="mt-0.5"
                  />
                  <div className="flex-1 space-y-1">
                    <p className="text-xs font-semibold flex items-center justify-between">
                      <span>Direct Bank Transfer</span>
                      <Badge variant="outline" className="text-2xs font-normal">
                        Recommended
                      </Badge>
                    </p>
                    <p className="text-2xs text-muted-foreground">
                      Transfer directly to the store account. Instant confirmation on WhatsApp.
                    </p>

                    {paymentMethod === "whatsapp_bank_transfer" && bankDetails && (
                      <div className="mt-2.5 rounded-md border bg-background p-2.5 space-y-1.5 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Bank:</span>
                          <span className="font-semibold">{bankDetails.bankName}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Account Number:</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-foreground">
                              {bankDetails.accountNumber}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyAccountNumber(bankDetails.accountNumber)}
                              className="text-primary hover:opacity-80 p-0.5"
                              title="Copy account number"
                            >
                              {copiedBank ? (
                                <Check className="size-3.5 text-green-600" />
                              ) : (
                                <Copy className="size-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Account Name:</span>
                          <span className="font-medium">{bankDetails.accountName}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </label>

                {/* WhatsApp Chat & Pay */}
                <label
                  className={cn(
                    "flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-all",
                    paymentMethod === "whatsapp_paystack"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50",
                  )}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === "whatsapp_paystack"}
                    onChange={() => setPaymentMethod("whatsapp_paystack")}
                    className="mt-0.5"
                  />
                  <div className="flex-1 space-y-0.5">
                    <p className="text-xs font-semibold">Pay Online / WhatsApp Agent</p>
                    <p className="text-2xs text-muted-foreground">
                      Receive an automated Paystack payment link directly on WhatsApp.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Total Review */}
            <div className="rounded-lg bg-muted/40 p-3 space-y-1 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal:</span>
                <span>{formatMoney(subtotalMinor, currency)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Delivery:</span>
                <span>{formatMoney(shippingFeeMinor, currency)}</span>
              </div>
              {discountMinor > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Discount ({appliedPromo?.code}):</span>
                  <span>-{formatMoney(discountMinor, currency)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-1 border-t text-sm font-bold">
                <span className="text-foreground">Total to pay:</span>
                <span className="text-base text-primary">
                  {formatMoney(finalTotalMinor, currency)}
                </span>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCheckoutOpen(false)}
                className="text-xs"
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={submittingOrder}
                className="gap-2 text-xs font-semibold"
                size="sm"
              >
                {submittingOrder ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" /> Placing Order…
                  </>
                ) : (
                  <>
                    Complete Order <ExternalLink className="size-3.5" />
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
