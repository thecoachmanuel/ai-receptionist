"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@/lib/api-client/use-data";
import {
  AlertTriangle,
  Box,
  ChevronDown,
  ChevronUp,
  ImagePlus,
  Package,
  Pencil,
  Plus,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  dashboardApi,
  type Collection,
  type Product,
  type ProductVariant,
} from "@/components/dashboard/data";
import {
  EmptyState,
  formatMoney,
  LoadingPanel,
  ScreenHeader,
  SubmitButton,
} from "@/components/dashboard/screen-kit";
import { useWorkspace } from "@/components/dashboard/workspace-context";
import { cn } from "@/lib/utils";

// ─── Quota bar ───────────────────────────────────────────────────────────────

function QuotaBar({
  used,
  limit,
  currency,
}: {
  used: number;
  limit: number;
  currency: string;
}) {
  if (limit === -1)
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <TrendingUp className="size-3.5 text-success" />
        <span>
          <strong className="text-foreground">{used}</strong> products — Unlimited plan
        </span>
      </div>
    );

  const pct = Math.min((used / limit) * 100, 100);
  const isWarning = pct >= 80;
  const isFull = pct >= 100;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          <strong className={cn("text-foreground", isFull && "text-destructive")}>
            {used}
          </strong>{" "}
          / {limit} products used
        </span>
        {isWarning && !isFull && (
          <Badge variant="outline" className="gap-1 text-2xs text-warning border-warning/40">
            <AlertTriangle className="size-3" /> Near limit
          </Badge>
        )}
        {isFull && (
          <Badge variant="destructive" className="gap-1 text-2xs">
            Limit reached
          </Badge>
        )}
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            isFull ? "bg-destructive" : isWarning ? "bg-warning" : "bg-primary",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Variant editor ───────────────────────────────────────────────────────────

function VariantEditor({
  variants,
  onChange,
  currency,
}: {
  variants: ProductVariant[];
  onChange: (v: ProductVariant[]) => void;
  currency: string;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  function addVariant() {
    const id = generateId();
    const updated = [
      ...variants,
      {
        id,
        label: "Default",
        sku: "",
        priceMinor: 0,
        stock: 0,
        lowStockThreshold: 3,
      },
    ];
    onChange(updated);
    setExpanded(id);
  }

  function removeVariant(id: string) {
    onChange(variants.filter((v) => v.id !== id));
  }

  function updateVariant(id: string, patch: Partial<ProductVariant>) {
    onChange(variants.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm">Variants (sizes, colours, etc.)</Label>
        <Button type="button" variant="outline" size="sm" onClick={addVariant} className="h-7 gap-1 text-xs">
          <Plus className="size-3" /> Add variant
        </Button>
      </div>

      {variants.length === 0 && (
        <p className="text-xs text-muted-foreground rounded-lg border border-dashed p-3 text-center">
          No variants yet. Add at least one variant with a price.
        </p>
      )}

      {variants.map((v) => (
        <div key={v.id} className="rounded-lg border bg-muted/30">
          <button
            type="button"
            onClick={() => setExpanded(expanded === v.id ? null : v.id)}
            className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium"
          >
            <span className="truncate">
              {v.label || "Unnamed"}{" "}
              {v.priceMinor > 0 && (
                <span className="ml-2 text-xs text-muted-foreground font-normal">
                  {formatMoney(v.priceMinor, currency)}
                </span>
              )}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Stock: {v.stock}</span>
              {expanded === v.id ? (
                <ChevronUp className="size-3.5 text-muted-foreground" />
              ) : (
                <ChevronDown className="size-3.5 text-muted-foreground" />
              )}
            </div>
          </button>

          {expanded === v.id && (
            <div className="border-t px-3 pb-3 pt-2 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Label *</Label>
                  <Input
                    value={v.label}
                    onChange={(e) => updateVariant(v.id, { label: e.target.value })}
                    placeholder="e.g. Size M / Blue"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">SKU</Label>
                  <Input
                    value={v.sku}
                    onChange={(e) => updateVariant(v.id, { sku: e.target.value })}
                    placeholder="e.g. PROD-001-M"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Price *</Label>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={v.priceMinor / 100}
                    onChange={(e) =>
                      updateVariant(v.id, {
                        priceMinor: Math.round(Number(e.target.value) * 100),
                      })
                    }
                    placeholder="0.00"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Compare-at price</Label>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={(v.comparePriceMinor ?? 0) / 100}
                    onChange={(e) =>
                      updateVariant(v.id, {
                        comparePriceMinor: Math.round(Number(e.target.value) * 100),
                      })
                    }
                    placeholder="Original / strike-through"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Stock quantity</Label>
                  <Input
                    type="number"
                    min={0}
                    value={v.stock}
                    onChange={(e) => updateVariant(v.id, { stock: Number(e.target.value) })}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Low-stock alert at</Label>
                  <Input
                    type="number"
                    min={1}
                    value={v.lowStockThreshold}
                    onChange={(e) =>
                      updateVariant(v.id, { lowStockThreshold: Number(e.target.value) })
                    }
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeVariant(v.id)}
                className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
              >
                <Trash2 className="size-3" /> Remove variant
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Product dialog ───────────────────────────────────────────────────────────

const CATEGORIES = [
  "Fashion & Apparel",
  "Beauty & Skincare",
  "Health & Wellness",
  "Electronics",
  "Home & Living",
  "Food & Drinks",
  "Sports & Fitness",
  "Books & Media",
  "Baby & Kids",
  "Accessories",
  "Art & Crafts",
  "Other",
];

function ProductDialog({
  product,
  collections,
}: {
  product?: Product;
  collections: Collection[];
}) {
  const { organization } = useWorkspace();
  const createProduct = useMutation(dashboardApi.commerce.createProduct);
  const updateProduct = useMutation(dashboardApi.commerce.updateProduct);

  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [active, setActive] = useState(product?.active ?? true);
  const [featured, setFeatured] = useState(product?.featured ?? false);
  const [category, setCategory] = useState(product?.category ?? "Other");
  const [collectionIds, setCollectionIds] = useState<string[]>(product?.collectionIds ?? []);
  const [variants, setVariants] = useState<ProductVariant[]>(
    product?.variants ?? [
      { id: generateId(), label: "Default", sku: "", priceMinor: 0, stock: 0, lowStockThreshold: 3 },
    ],
  );
  const [imageUrls, setImageUrls] = useState<string[]>(product?.images ?? []);
  const [imageInput, setImageInput] = useState("");

  const currency = organization?.currency ?? "NGN";

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (variants.length === 0) {
      toast.error("Add at least one variant with a price.");
      return;
    }
    const form = new FormData(e.currentTarget);
    const payload = {
      name: String(form.get("name") ?? "").trim(),
      description: String(form.get("description") ?? "").trim(),
      category,
      collectionIds,
      tags: String(form.get("tags") ?? "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      images: imageUrls,
      variants,
      currency,
      active,
      featured,
    };
    if (!payload.name) return toast.error("Product name is required");

    setPending(true);
    try {
      if (product) {
        await updateProduct({ productId: product._id, ...payload });
        toast.success("Product updated");
      } else {
        await createProduct(payload);
        toast.success("Product created");
      }
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save product");
    } finally {
      setPending(false);
    }
  }

  function addImage() {
    const url = imageInput.trim();
    if (!url) return;
    setImageUrls((prev) => [...prev, url]);
    setImageInput("");
  }

  const isEdit = !!product;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="icon" className="size-8">
            <Pencil className="size-3.5" />
          </Button>
        ) : (
          <Button size="sm" className="gap-1.5 text-sm">
            <Plus className="size-4" /> Add product
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {isEdit ? "Edit product" : "Add new product"}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {isEdit
              ? "Update product details, variants, and inventory."
              : "Add a product to your store. You can add variants for different sizes or colours."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <Label className="text-sm" htmlFor="prod-name">
                Product name *
              </Label>
              <Input
                id="prod-name"
                name="name"
                defaultValue={product?.name}
                placeholder="e.g. Ankara Print Midi Dress"
                required
                className="text-sm"
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-sm" htmlFor="prod-desc">
                Description
              </Label>
              <Textarea
                id="prod-desc"
                name="description"
                defaultValue={product?.description}
                placeholder="Describe your product—fabric, features, care instructions…"
                rows={3}
                className="text-sm resize-none"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Category</Label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-sm" htmlFor="prod-tags">
                Tags (comma separated)
              </Label>
              <Input
                id="prod-tags"
                name="tags"
                defaultValue={product?.tags?.join(", ")}
                placeholder="summer, linen, dress"
                className="text-sm"
              />
            </div>
          </div>

          {/* Collections */}
          {collections.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-sm">Collections</Label>
              <div className="flex flex-wrap gap-2">
                {collections.map((col) => {
                  const active = collectionIds.includes(col._id);
                  return (
                    <button
                      key={col._id}
                      type="button"
                      onClick={() =>
                        setCollectionIds((prev) =>
                          active ? prev.filter((id) => id !== col._id) : [...prev, col._id],
                        )
                      }
                      className={cn(
                        "rounded-full px-3 py-1 text-xs border transition-colors",
                        active
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-foreground",
                      )}
                    >
                      {col.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Images */}
          <div className="space-y-2">
            <Label className="text-sm">Product images (URLs)</Label>
            <div className="flex gap-2">
              <Input
                value={imageInput}
                onChange={(e) => setImageInput(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addImage();
                  }
                }}
              />
              <Button type="button" variant="outline" size="sm" onClick={addImage} className="shrink-0 gap-1 text-xs">
                <ImagePlus className="size-3.5" /> Add
              </Button>
            </div>
            {imageUrls.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {imageUrls.map((url, i) => (
                  <div key={i} className="group relative size-16 overflow-hidden rounded-md border">
                    <img src={url} alt="" className="size-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setImageUrls((prev) => prev.filter((_, idx) => idx !== i))}
                      className="absolute inset-0 hidden items-center justify-center bg-black/50 text-white group-hover:flex"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Variants */}
          <VariantEditor variants={variants} onChange={setVariants} currency={currency} />

          {/* Toggles */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Active / visible</p>
              <p className="text-xs text-muted-foreground">
                Visible on your storefront when enabled
              </p>
            </div>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Featured product</p>
              <p className="text-xs text-muted-foreground">
                Highlighted on your homepage and collection pages
              </p>
            </div>
            <Switch checked={featured} onCheckedChange={setFeatured} />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="text-sm">
              Cancel
            </Button>
            <SubmitButton pending={pending} className="text-sm">
              {isEdit ? "Save changes" : "Add product"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Product card ─────────────────────────────────────────────────────────────

function ProductCard({ product, collections }: { product: Product; collections: Collection[] }) {
  const { organization } = useWorkspace();
  const currency = organization?.currency ?? "NGN";
  const deleteProduct = useMutation(dashboardApi.commerce.deleteProduct);

  const minPrice = Math.min(...product.variants.map((v) => v.priceMinor));
  const maxPrice = Math.max(...product.variants.map((v) => v.priceMinor));
  const totalStock = product.variants.reduce((a, v) => a + v.stock, 0);
  const isLowStock = product.variants.some(
    (v) => v.stock > 0 && v.stock <= v.lowStockThreshold,
  );
  const isOutOfStock = totalStock === 0;

  const collectionNames = collections
    .filter((c) => product.collectionIds.includes(c._id))
    .map((c) => c.name);

  async function handleDelete() {
    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    try {
      await deleteProduct({ productId: product._id });
      toast.success("Product deleted");
    } catch {
      toast.error("Failed to delete product");
    }
  }

  return (
    <Card className="group flex flex-col overflow-hidden transition-shadow hover:shadow-md">
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        {product.images[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="size-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <Box className="size-10 text-muted-foreground/40" />
          </div>
        )}
        {/* Badges */}
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {product.featured && (
            <Badge className="text-2xs bg-primary/90 backdrop-blur">Featured</Badge>
          )}
          {isOutOfStock ? (
            <Badge variant="destructive" className="text-2xs">Out of stock</Badge>
          ) : isLowStock ? (
            <Badge className="text-2xs bg-warning text-warning-foreground">Low stock</Badge>
          ) : null}
          {!product.active && (
            <Badge variant="secondary" className="text-2xs">Draft</Badge>
          )}
        </div>
        {/* Actions */}
        <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <ProductDialog product={product} collections={collections} />
          <Button
            variant="ghost"
            size="icon"
            className="size-8 bg-background/80 backdrop-blur hover:bg-destructive hover:text-destructive-foreground"
            onClick={handleDelete}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      <CardContent className="flex flex-1 flex-col gap-1.5 p-3">
        <p className="text-sm font-semibold leading-tight line-clamp-2">{product.name}</p>
        {collectionNames.length > 0 && (
          <p className="text-xs text-muted-foreground">{collectionNames.join(", ")}</p>
        )}
        <div className="mt-auto flex items-center justify-between pt-2">
          <div>
            <p className="text-base font-bold text-primary">
              {formatMoney(minPrice, currency)}
              {minPrice !== maxPrice && ` – ${formatMoney(maxPrice, currency)}`}
            </p>
            {product.variants.length > 1 && (
              <p className="text-xs text-muted-foreground">
                {product.variants.length} variants
              </p>
            )}
          </div>
          <div className="text-right">
            <p className={cn("text-sm font-medium", isOutOfStock && "text-destructive")}>
              {totalStock}
            </p>
            <p className="text-xs text-muted-foreground">in stock</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export function ProductsScreen() {
  const { organization } = useWorkspace();
  const [filterCategory, setFilterCategory] = useState("All");

  const orgId = organization?._id;
  const quota = (organization as any)?.customProductLimit ?? -1;

  const products = useQuery<Product[]>(
    dashboardApi.commerce.listProducts,
    orgId ? { includeInactive: true } : "skip",
  );

  const collections = useQuery<Collection[]>(
    dashboardApi.commerce.listCollections,
    orgId ? { includeInactive: false } : "skip",
  );

  const productList = Array.isArray(products) ? products : [];
  const collectionList = Array.isArray(collections) ? collections : [];

  const categories = ["All", ...Array.from(new Set(productList.map((p) => p.category)))];
  const filtered =
    filterCategory === "All"
      ? productList
      : productList.filter((p) => p.category === filterCategory);

  const isLoading = products === undefined;

  return (
    <div className="space-y-6">
      <ScreenHeader
        eyebrow="Commerce"
        title="Products"
        description="Manage your product catalog. Add variants, track inventory, and control storefront visibility."
        action={
          <ProductDialog
            collections={collectionList}
          />
        }
      />

      {/* Quota bar */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <QuotaBar used={productList.length} limit={quota} currency={organization?.currency ?? "NGN"} />
        </CardContent>
      </Card>

      {/* Category filter */}
      {categories.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={cn(
                "rounded-full px-3 py-1 text-xs border transition-colors",
                filterCategory === cat
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-foreground",
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <LoadingPanel />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No products yet"
          description="Add your first product to start selling. You can manage variants, stock levels, and images."
          action={<ProductDialog collections={collectionList} />}
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((product) => (
            <ProductCard key={product._id} product={product} collections={collectionList} />
          ))}
        </div>
      )}
    </div>
  );
}
