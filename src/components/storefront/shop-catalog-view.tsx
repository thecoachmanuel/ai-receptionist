"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Filter,
  Package,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCart } from "@/components/storefront/cart-context";
import { cn } from "@/lib/utils";

function formatMoney(minor: number, currency = "NGN"): string {
  const major = minor / 100;
  if (currency === "NGN") {
    return `₦${major.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }
  return `${currency} ${major.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface ProductItem {
  _id: string;
  name: string;
  slug: string;
  description: string;
  images: string[];
  category: string;
  collectionIds: string[];
  variants: Array<{
    id: string;
    label: string;
    sku: string;
    priceMinor: number;
    comparePriceMinor?: number;
    stock: number;
    lowStockThreshold: number;
  }>;
  currency: string;
  active: boolean;
  featured: boolean;
}

interface CollectionItem {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
}

export function ShopCatalogView({
  siteSlug,
  products,
  collections,
  currency = "NGN",
}: {
  siteSlug: string;
  products: ProductItem[];
  collections: CollectionItem[];
  currency?: string;
}) {
  const { addItem } = useCart();
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"featured" | "price-asc" | "price-desc">("featured");

  // Filtered & sorted products
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        if (!p.active) return false;
        if (
          selectedCollectionId !== "all" &&
          !p.collectionIds?.includes(selectedCollectionId)
        ) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = p.name.toLowerCase().includes(q);
          const matchCat = p.category?.toLowerCase().includes(q);
          const matchDesc = p.description?.toLowerCase().includes(q);
          if (!matchName && !matchCat && !matchDesc) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const aPrice = a.variants?.[0]?.priceMinor ?? 0;
        const bPrice = b.variants?.[0]?.priceMinor ?? 0;
        if (sortBy === "price-asc") return aPrice - bPrice;
        if (sortBy === "price-desc") return bPrice - aPrice;
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return 0;
      });
  }, [products, selectedCollectionId, searchQuery, sortBy]);

  const handleQuickAdd = (p: ProductItem, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const variant = p.variants?.[0];
    if (!variant) return;

    if (variant.stock <= 0) {
      toast.error("This product is currently out of stock");
      return;
    }

    addItem({
      productId: p._id,
      productName: p.name,
      variantLabel: variant.label || "Standard",
      sku: variant.sku || "",
      imageUrl: p.images?.[0] || "",
      unitPriceMinor: variant.priceMinor,
    });

    toast.success(`Added ${p.name} to cart`);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-8">
      {/* ── Search & Filter Controls ───────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products by name or category…"
            className="pl-9 text-xs h-9"
          />
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <span className="text-2xs text-muted-foreground">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="rounded-md border border-input bg-background px-2.5 py-1 text-xs"
          >
            <option value="featured">Featured first</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
          </select>
        </div>
      </div>

      {/* ── Collection Pills ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setSelectedCollectionId("all")}
          className={cn(
            "rounded-full px-3.5 py-1 text-xs font-medium transition-all",
            selectedCollectionId === "all"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
          )}
        >
          All Items ({products.length})
        </button>

        {collections.map((col) => {
          const count = products.filter((p) =>
            p.collectionIds?.includes(col._id),
          ).length;
          return (
            <button
              key={col._id}
              type="button"
              onClick={() => setSelectedCollectionId(col._id)}
              className={cn(
                "rounded-full px-3.5 py-1 text-xs font-medium transition-all",
                selectedCollectionId === col._id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
              )}
            >
              {col.name} ({count})
            </button>
          );
        })}
      </div>

      {/* ── Products Grid ───────────────────────────────────────────────── */}
      {filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center">
          <Package className="size-12 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-semibold">No products found</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {searchQuery
              ? `No items matching "${searchQuery}". Try a different keyword.`
              : "No products available in this category yet."}
          </p>
          {searchQuery && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchQuery("")}
              className="mt-4 text-xs"
            >
              Clear search
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filteredProducts.map((p) => {
            const defaultVariant = p.variants?.[0];
            const priceMinor = defaultVariant?.priceMinor ?? 0;
            const comparePrice = defaultVariant?.comparePriceMinor;
            const isOutOfStock = (defaultVariant?.stock ?? 0) <= 0;
            const hasMultipleVariants = (p.variants?.length ?? 0) > 1;

            return (
              <Link
                key={p._id}
                href={`/${siteSlug}/products/${p.slug}`}
                className="group flex flex-col overflow-hidden rounded-xl border bg-card transition-all hover:shadow-md"
              >
                {/* Thumbnail */}
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

                  {/* Badges */}
                  <div className="absolute left-2 top-2 flex flex-col gap-1">
                    {p.featured && (
                      <Badge className="bg-amber-500 text-white text-2xs px-1.5 py-0 font-medium border-0">
                        Featured
                      </Badge>
                    )}
                    {comparePrice && comparePrice > priceMinor && (
                      <Badge className="bg-destructive text-destructive-foreground text-2xs px-1.5 py-0 font-medium border-0">
                        Sale
                      </Badge>
                    )}
                  </div>

                  {isOutOfStock && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-xs">
                      <Badge variant="outline" className="text-2xs font-semibold text-destructive border-destructive">
                        Sold Out
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex flex-1 flex-col justify-between p-3.5 space-y-2">
                  <div>
                    {p.category && (
                      <p className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">
                        {p.category}
                      </p>
                    )}
                    <h3 className="text-xs font-semibold leading-tight line-clamp-2 text-foreground group-hover:text-primary transition-colors">
                      {p.name}
                    </h3>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div>
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
                      {hasMultipleVariants && (
                        <p className="text-2xs text-muted-foreground">
                          {p.variants.length} options
                        </p>
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
    </div>
  );
}
