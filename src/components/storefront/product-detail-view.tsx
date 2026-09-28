"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronRight,
  MessageCircle,
  MessageSquareQuote,
  Minus,
  Package,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Truck,
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
import { useCart } from "@/components/storefront/cart-context";
import { cn } from "@/lib/utils";

function formatMoney(minor: number, currency = "NGN"): string {
  const major = minor / 100;
  if (currency === "NGN") {
    return `₦${major.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }
  return `${currency} ${major.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface ProductVariant {
  id: string;
  label: string;
  sku: string;
  priceMinor: number;
  comparePriceMinor?: number;
  stock: number;
  lowStockThreshold: number;
}

interface ProductDetail {
  _id: string;
  name: string;
  slug: string;
  description: string;
  images: string[];
  category: string;
  collectionIds: string[];
  variants: ProductVariant[];
  currency: string;
  active: boolean;
  featured: boolean;
}

export function ProductDetailView({
  siteSlug,
  storeName,
  product,
  relatedProducts = [],
  currency = "NGN",
  whatsappPhone,
}: {
  siteSlug: string;
  storeName: string;
  product: ProductDetail;
  relatedProducts?: ProductDetail[];
  currency?: string;
  whatsappPhone?: string;
}) {
  const { addItem, openCart } = useCart();
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);

  // Reviews State
  const [reviews, setReviews] = useState<any[]>([]);
  const [averageRating, setAverageRating] = useState(5.0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newName, setNewName] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newComment, setNewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, [siteSlug, product._id]);

  const fetchReviews = async () => {
    try {
      const res = await fetch("/api/data/publicCommerce/getProductReviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteSlug, productId: product._id }),
      });
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews || []);
        if (typeof data.averageRating === "number") setAverageRating(data.averageRating);
        if (typeof data.totalReviews === "number") setTotalReviews(data.totalReviews);
      }
    } catch (_) {}
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setSubmittingReview(true);
    try {
      const res = await fetch("/api/data/publicCommerce/submitReview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteSlug,
          productId: product._id,
          customerName: newName.trim() || "Verified Shopper",
          rating: newRating,
          title: newTitle.trim(),
          comment: newComment.trim(),
        }),
      });
      if (!res.ok) throw new Error("Failed to post review");
      toast.success("Thank you! Your review has been submitted.");
      setReviewModalOpen(false);
      setNewTitle("");
      setNewComment("");
      fetchReviews();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit review");
    } finally {
      setSubmittingReview(false);
    }
  };

  const variants = product.variants || [];
  const activeVariant = variants[selectedVariantIndex] || variants[0];
  const priceMinor = activeVariant?.priceMinor ?? 0;
  const comparePrice = activeVariant?.comparePriceMinor;
  const stock = activeVariant?.stock ?? 0;
  const isOutOfStock = stock <= 0;
  const isLowStock = stock > 0 && stock <= (activeVariant?.lowStockThreshold ?? 5);

  const images = product.images?.length > 0 ? product.images : [];
  const currentImage = images[selectedImageIndex] || images[0];

  const handleAddToCart = () => {
    if (!activeVariant || isOutOfStock) return;
    addItem(
      {
        productId: product._id,
        productName: product.name,
        variantLabel: activeVariant.label || "Standard",
        sku: activeVariant.sku || "",
        imageUrl: images[0] || "",
        unitPriceMinor: priceMinor,
      },
      quantity,
    );
    toast.success(`Added ${quantity}x ${product.name} to cart`);
  };

  const handleBuyNow = () => {
    if (!activeVariant || isOutOfStock) return;
    addItem(
      {
        productId: product._id,
        productName: product.name,
        variantLabel: activeVariant.label || "Standard",
        sku: activeVariant.sku || "",
        imageUrl: images[0] || "",
        unitPriceMinor: priceMinor,
      },
      quantity,
    );
    openCart();
  };

  const handleWhatsAppInquiry = () => {
    const text = encodeURIComponent(
      `Hi ${storeName}, I'm interested in *${product.name}* (${activeVariant?.label || "Standard"} - ${formatMoney(priceMinor, currency)}). Is it currently available?`,
    );
    const cleanPhone = (whatsappPhone || "").replace(/\D/g, "");
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${text}`
      : `https://wa.me/?text=${text}`;
    window.open(url, "_blank");
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10 space-y-12">
      {/* ── Breadcrumb ─────────────────────────────────────────────────── */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href={`/${siteSlug}`} className="hover:text-foreground">
          Home
        </Link>
        <ChevronRight className="size-3.5" />
        <Link href={`/${siteSlug}/shop`} className="hover:text-foreground">
          Shop
        </Link>
        {product.category && (
          <>
            <ChevronRight className="size-3.5" />
            <span className="truncate max-w-[150px]">{product.category}</span>
          </>
        )}
        <ChevronRight className="size-3.5" />
        <span className="text-foreground font-medium truncate max-w-[200px]">
          {product.name}
        </span>
      </nav>

      {/* ── Main Product Grid ───────────────────────────────────────────── */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Left: Images */}
        <div className="space-y-3">
          <div className="relative aspect-square overflow-hidden rounded-2xl border bg-muted">
            {currentImage ? (
              <img
                src={currentImage}
                alt={product.name}
                className="size-full object-cover"
              />
            ) : (
              <div className="flex size-full items-center justify-center text-muted-foreground">
                <Package className="size-16" />
              </div>
            )}

            {product.featured && (
              <Badge className="absolute left-3 top-3 bg-amber-500 text-white text-xs border-0">
                Featured
              </Badge>
            )}
          </div>

          {images.length > 1 && (
            <div className="flex gap-2.5 overflow-x-auto pb-1">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedImageIndex(idx)}
                  className={cn(
                    "relative size-16 shrink-0 overflow-hidden rounded-lg border transition-all",
                    selectedImageIndex === idx
                      ? "ring-2 ring-primary ring-offset-2"
                      : "opacity-70 hover:opacity-100",
                  )}
                >
                  <img src={img} alt="" className="size-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Info & Actions */}
        <div className="flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div>
              {product.category && (
                <p className="text-2xs font-semibold uppercase tracking-wider text-primary">
                  {product.category}
                </p>
              )}
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-1">
                {product.name}
              </h1>
              <div className="flex items-center gap-2 mt-1.5">
                <div className="flex items-center text-amber-500">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={cn(
                        "size-3.5",
                        star <= Math.round(averageRating)
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground/30"
                      )}
                    />
                  ))}
                </div>
                <span className="text-xs font-semibold text-foreground">{averageRating.toFixed(1)}</span>
                <span className="text-2xs text-muted-foreground">
                  ({totalReviews} {totalReviews === 1 ? "review" : "reviews"})
                </span>
              </div>
            </div>

            {/* Price block */}
            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-bold text-foreground">
                {formatMoney(priceMinor, currency)}
              </span>
              {comparePrice && comparePrice > priceMinor && (
                <>
                  <span className="text-sm text-muted-foreground line-through">
                    {formatMoney(comparePrice, currency)}
                  </span>
                  <Badge variant="outline" className="text-2xs text-destructive border-destructive font-medium">
                    Save {Math.round(((comparePrice - priceMinor) / comparePrice) * 100)}%
                  </Badge>
                </>
              )}
            </div>

            {/* Stock indicator */}
            <div>
              {isOutOfStock ? (
                <Badge variant="outline" className="text-xs text-destructive border-destructive">
                  Currently Out of Stock
                </Badge>
              ) : isLowStock ? (
                <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 bg-amber-50">
                  Only {stock} left in stock — order soon!
                </Badge>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs text-green-600 font-medium">
                  <Check className="size-3.5" /> In Stock & Ready for Dispatch
                </span>
              )}
            </div>

            <Separator />

            {/* Variant Selector */}
            {variants.length > 1 && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Select Option</Label>
                <div className="flex flex-wrap gap-2">
                  {variants.map((v, i) => (
                    <button
                      key={v.id || i}
                      type="button"
                      onClick={() => {
                        setSelectedVariantIndex(i);
                        setQuantity(1);
                      }}
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                        selectedVariantIndex === i
                          ? "border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary"
                          : "border-border hover:bg-muted text-foreground",
                      )}
                    >
                      {v.label} · {formatMoney(v.priceMinor, currency)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity Stepper */}
            {!isOutOfStock && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Quantity</Label>
                <div className="flex items-center gap-3">
                  <div className="flex items-center rounded-lg border bg-background">
                    <button
                      type="button"
                      disabled={quantity <= 1}
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="px-3 py-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                      <Minus className="size-3.5" />
                    </button>
                    <span className="px-3 text-xs font-bold">{quantity}</span>
                    <button
                      type="button"
                      disabled={quantity >= stock}
                      onClick={() => setQuantity((q) => Math.min(stock, q + 1))}
                      className="px-3 py-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                  <span className="text-2xs text-muted-foreground">
                    Subtotal: {formatMoney(priceMinor * quantity, currency)}
                  </span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-2">
              <div className="grid grid-cols-2 gap-2.5">
                <Button
                  size="default"
                  variant="outline"
                  disabled={isOutOfStock}
                  onClick={handleAddToCart}
                  className="gap-2 text-xs font-semibold"
                >
                  <ShoppingBag className="size-4" /> Add to Cart
                </Button>

                <Button
                  size="default"
                  variant="default"
                  disabled={isOutOfStock}
                  onClick={handleBuyNow}
                  className="gap-2 text-xs font-semibold"
                >
                  Buy Now
                </Button>
              </div>

              {/* WhatsApp direct inquiry */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleWhatsAppInquiry}
                className="w-full gap-2 text-xs text-muted-foreground hover:text-green-600"
              >
                <MessageCircle className="size-4 text-green-600" />
                Have questions? Chat on WhatsApp
              </Button>
            </div>

            {/* Value Props */}
            <div className="rounded-xl border bg-muted/20 p-4 space-y-2.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Truck className="size-4 text-primary shrink-0" />
                <span>Fast nationwide delivery with tracking</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary shrink-0" />
                <span>Direct WhatsApp confirmation & customer support</span>
              </div>
            </div>
          </div>

          {/* Description */}
          {product.description && (
            <div className="border-t pt-4 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Product Details
              </h3>
              <p className="text-xs leading-relaxed text-muted-foreground whitespace-pre-line">
                {product.description}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Customer Reviews & Ratings ──────────────────────────────────── */}
      <div className="space-y-6 border-t pt-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-foreground">Verified Customer Reviews</h2>
            <p className="text-xs text-muted-foreground">
              Real feedback from shoppers who purchased this item.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setReviewModalOpen(true)}
            className="text-xs gap-1.5"
          >
            <MessageSquareQuote className="size-3.5" /> Write a Review
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Review Summary Score */}
          <div className="rounded-xl border border-border/60 bg-muted/20 p-5 flex flex-col items-center justify-center text-center space-y-2">
            <div className="text-3xl font-extrabold text-foreground">{averageRating.toFixed(1)}</div>
            <div className="flex items-center text-amber-400">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={cn(
                    "size-4",
                    s <= Math.round(averageRating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
                  )}
                />
              ))}
            </div>
            <p className="text-2xs text-muted-foreground">
              Based on {totalReviews} {totalReviews === 1 ? "review" : "reviews"}
            </p>
          </div>

          {/* Reviews list */}
          <div className="md:col-span-2 space-y-3">
            {reviews.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/70 p-6 text-center text-muted-foreground space-y-2">
                <p className="text-xs">No reviews yet. Be the first to review this product!</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setReviewModalOpen(true)}
                  className="text-xs text-primary"
                >
                  Leave a Review
                </Button>
              </div>
            ) : (
              reviews.map((r: any) => (
                <div key={r._id} className="rounded-xl border border-border/60 p-4 space-y-2 bg-card">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">{r.customerName}</span>
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-1.5 py-0.2 text-2xs font-medium text-emerald-700">
                        <Check className="size-2.5 mr-0.5" /> Verified Buyer
                      </span>
                    </div>
                    <div className="flex items-center text-amber-400">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={cn(
                            "size-3",
                            s <= r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
                          )}
                        />
                      ))}
                    </div>
                  </div>
                  {r.title && <p className="text-xs font-semibold text-foreground">{r.title}</p>}
                  <p className="text-xs text-muted-foreground leading-relaxed">{r.comment}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Related Products ────────────────────────────────────────────── */}
      {relatedProducts.length > 0 && (
        <div className="space-y-4 border-t pt-8">
          <h2 className="text-base font-bold text-foreground">You may also like</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {relatedProducts.slice(0, 4).map((rp) => (
              <Link
                key={rp._id}
                href={`/${siteSlug}/products/${rp.slug}`}
                className="group overflow-hidden rounded-xl border bg-card transition-all hover:shadow-md"
              >
                <div className="aspect-square bg-muted overflow-hidden">
                  {rp.images?.[0] ? (
                    <img
                      src={rp.images[0]}
                      alt={rp.name}
                      className="size-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-muted-foreground">
                      <Package className="size-6" />
                    </div>
                  )}
                </div>
                <div className="p-3 space-y-1">
                  <p className="text-xs font-semibold leading-tight line-clamp-1 group-hover:text-primary transition-colors">
                    {rp.name}
                  </p>
                  <p className="text-xs font-bold text-foreground">
                    {formatMoney(rp.variants?.[0]?.priceMinor ?? 0, currency)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Write Review Dialog */}
      <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSubmitReview} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Write a Customer Review</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Share your experience with <span className="font-semibold text-foreground">{product.name}</span>.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              {/* Rating Stars */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Your Rating</Label>
                <div className="flex items-center gap-1.5 pt-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setNewRating(s)}
                      className="p-1 hover:scale-110 transition-transform"
                    >
                      <Star
                        className={cn(
                          "size-5",
                          s <= newRating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
                        )}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Customer Name */}
              <div className="space-y-1">
                <Label className="text-xs">Your Name</Label>
                <Input
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Chioma Okafor"
                  className="text-xs"
                />
              </div>

              {/* Review Title */}
              <div className="space-y-1">
                <Label className="text-xs">Headline / Title</Label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Excellent fit and top quality fabric!"
                  className="text-xs"
                />
              </div>

              {/* Review Comment */}
              <div className="space-y-1">
                <Label className="text-xs">Your Review</Label>
                <textarea
                  required
                  rows={3}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Tell other shoppers what you liked about this item..."
                  className="w-full rounded-md border border-input bg-background p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setReviewModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submittingReview || !newComment.trim()}
                className="text-xs"
              >
                {submittingReview ? "Submitting…" : "Post Review"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

