"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  FolderTree,
  MessageCircle,
  Package,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Truck,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCart } from "@/components/storefront/cart-context";
import { cn } from "@/lib/utils";

function formatMoney(minor: number, currency = "NGN"): string {
  const major = minor / 100;
  if (currency === "NGN") {
    return `₦${major.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }
  return `${currency} ${major.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface StorefrontHomeProps {
  siteSlug: string;
  storeName: string;
  headline?: string;
  subheadline?: string;
  heroImageUrl?: string;
  products: any[];
  collections: any[];
  currency?: string;
  whatsappPhone?: string;
}

export function StorefrontHome({
  siteSlug,
  storeName,
  headline,
  subheadline,
  heroImageUrl,
  products = [],
  collections = [],
  currency = "NGN",
  whatsappPhone,
}: StorefrontHomeProps) {
  const { addItem } = useCart();
  const featuredProducts = products.filter((p) => p.active && p.featured).slice(0, 8);
  const displayProducts = featuredProducts.length > 0 ? featuredProducts : products.slice(0, 8);

  const handleQuickAdd = (p: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const v = p.variants?.[0];
    if (!v || v.stock <= 0) {
      toast.error("Item is out of stock");
      return;
    }
    addItem({
      productId: p._id,
      productName: p.name,
      variantLabel: v.label || "Standard",
      sku: v.sku || "",
      imageUrl: p.images?.[0] || "",
      unitPriceMinor: v.priceMinor,
    });
    toast.success(`Added ${p.name} to cart`);
  };

  return (
    <div className="space-y-16 pb-16">
      {/* ── Hero Section ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/10 via-primary/5 to-background py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 text-center space-y-6">
          <Badge className="bg-primary/15 text-primary text-xs font-semibold px-3 py-1 border-primary/20">
            Official Online Store
          </Badge>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground max-w-3xl mx-auto">
            {headline || `Welcome to ${storeName}`}
          </h1>

          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {subheadline ||
              "Discover our latest collections, exclusive products, and experience seamless WhatsApp checkout with instant order confirmation."}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button asChild size="default" className="gap-2 text-xs font-semibold">
              <Link href={`/${siteSlug}/shop`}>
                <ShoppingBag className="size-4" /> Browse Catalog
              </Link>
            </Button>

            {whatsappPhone && (
              <Button
                asChild
                variant="outline"
                size="default"
                className="gap-2 text-xs font-semibold text-green-600 hover:text-green-700 hover:bg-green-50"
              >
                <a
                  href={`https://wa.me/${whatsappPhone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle className="size-4" /> Chat on WhatsApp
                </a>
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* ── Value Props Strip ─────────────────────────────────────────── */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-1 gap-4 rounded-2xl border bg-card p-6 sm:grid-cols-3">
          <div className="flex items-center gap-3.5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <MessageCircle className="size-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">WhatsApp Checkout</p>
              <p className="text-2xs text-muted-foreground">Direct order confirmation & status updates</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Truck className="size-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">Reliable Delivery</p>
              <p className="text-2xs text-muted-foreground">Nationwide doorstep shipping with tracking</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">Verified Merchant</p>
              <p className="text-2xs text-muted-foreground">Bank transfer & card payment protection</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Featured Collections ───────────────────────────────────────── */}
      {collections.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 sm:px-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Shop by Collection
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Explore curated product categories
              </p>
            </div>
            <Link
              href={`/${siteSlug}/shop`}
              className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="size-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {collections.map((col) => {
              const productCount = products.filter((p) =>
                p.collectionIds?.includes(col._id),
              ).length;

              return (
                <Link
                  key={col._id}
                  href={`/${siteSlug}/shop`}
                  className="group relative overflow-hidden rounded-xl border bg-card p-5 transition-all hover:border-primary/50 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      <FolderTree className="size-5" />
                    </div>
                    <Badge variant="secondary" className="text-2xs">
                      {productCount} items
                    </Badge>
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                    {col.name}
                  </h3>
                  {col.description && (
                    <p className="text-2xs text-muted-foreground mt-0.5 line-clamp-1">
                      {col.description}
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Featured / Trending Products ─────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Featured Products
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Handpicked items for your wardrobe and everyday essentials
            </p>
          </div>
          <Link
            href={`/${siteSlug}/shop`}
            className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
          >
            All products <ArrowRight className="size-3.5" />
          </Link>
        </div>

        {displayProducts.length === 0 ? (
          <div className="rounded-xl border border-dashed p-10 text-center text-xs text-muted-foreground">
            No products listed yet. Check back soon!
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {displayProducts.map((p) => {
              const variant = p.variants?.[0];
              const priceMinor = variant?.priceMinor ?? 0;
              const comparePrice = variant?.comparePriceMinor;
              const isOutOfStock = (variant?.stock ?? 0) <= 0;

              return (
                <Link
                  key={p._id}
                  href={`/${siteSlug}/products/${p.slug}`}
                  className="group flex flex-col overflow-hidden rounded-xl border bg-card transition-all hover:shadow-md"
                >
                  <div className="relative aspect-square w-full overflow-hidden bg-muted">
                    {p.images?.[0] ? (
                      <img
                        src={p.images[0]}
                        alt={p.name}
                        className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center text-muted-foreground">
                        <Package className="size-8" />
                      </div>
                    )}
                    {p.featured && (
                      <Badge className="absolute left-2 top-2 bg-amber-500 text-white text-2xs px-1.5 py-0 border-0">
                        Featured
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col justify-between p-3.5 space-y-2">
                    <div>
                      {p.category && (
                        <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {p.category}
                        </p>
                      )}
                      <h3 className="text-xs font-semibold leading-tight line-clamp-1 text-foreground group-hover:text-primary transition-colors">
                        {p.name}
                      </h3>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xs font-bold text-foreground">
                          {formatMoney(priceMinor, currency)}
                        </span>
                        {comparePrice && comparePrice > priceMinor && (
                          <span className="text-2xs text-muted-foreground line-through">
                            {formatMoney(comparePrice, currency)}
                          </span>
                        )}
                      </div>

                      {!isOutOfStock && (
                        <Button
                          size="icon"
                          variant="secondary"
                          className="size-7 shrink-0 rounded-full"
                          onClick={(e) => handleQuickAdd(p, e)}
                          title="Add to cart"
                        >
                          <Plus className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
