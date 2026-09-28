"use client";

import { useQuery } from "@/lib/api-client/use-data";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Package,
  ShoppingBag,
  TrendingUp,
  Truck,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  dashboardApi,
  type Order,
  type Product,
} from "@/components/dashboard/data";
import { formatMoney, LoadingPanel } from "@/components/dashboard/screen-kit";
import { useWorkspace } from "@/components/dashboard/workspace-context";
import { cn } from "@/lib/utils";

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <Card className={cn(highlight && "border-primary/40 bg-primary/5")}>
      <CardContent className="flex items-center gap-3 pt-5 pb-5">
        <div
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-full",
            highlight ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="size-5" />
        </div>
        <div>
          <p className={cn("text-2xl font-bold leading-none", highlight && "text-primary")}>
            {value}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
          {sub && <p className="text-2xs text-muted-foreground/70">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Order status badge ───────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  confirmed: "bg-blue-100 text-blue-700",
  processing: "bg-amber-100 text-amber-700",
  shipped: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

// ─── Main screen ──────────────────────────────────────────────────────────────
export function CommerceOverviewScreen() {
  const { organization } = useWorkspace();
  const orgSlug = organization?.slug;
  const currency = organization?.currency ?? "NGN";

  const orders = useQuery<Order[]>(
    dashboardApi.commerce.listOrders,
    organization?._id ? { limit: 50 } : "skip",
  );

  const stats = useQuery<{
    byStatus: Record<string, { count: number; revenue: number }>;
    totalRevenue: number;
    totalOrders: number;
  }>(dashboardApi.commerce.getOrderStats, organization?._id ? {} : "skip");

  const products = useQuery<Product[]>(
    dashboardApi.commerce.listProducts,
    organization?._id ? { includeInactive: true } : "skip",
  );

  const orderList = Array.isArray(orders) ? orders : [];
  const productList = Array.isArray(products) ? products : [];
  const recentOrders = orderList.slice(0, 6);

  // Low-stock products
  const lowStockProducts = productList.filter((p) =>
    p.variants.some((v) => v.stock > 0 && v.stock <= v.lowStockThreshold),
  );
  const outOfStockProducts = productList.filter((p) =>
    p.variants.every((v) => v.stock === 0),
  );

  const pendingCount = orderList.filter(
    (o) => o.status === "pending" || o.status === "confirmed",
  ).length;

  const isLoading = orders === undefined || stats === undefined;

  if (isLoading) return <LoadingPanel rows={6} />;

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex flex-col gap-1 border-b border-black/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-2xs font-semibold tracking-[0.2em] text-primary uppercase">Commerce</p>
          <h1 className="mt-1 font-heading text-3xl font-semibold tracking-tight">
            Store Overview
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Real-time snapshot of your store's performance.
          </p>
        </div>
        {orgSlug && (
          <a
            href={`/${orgSlug}/shop`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
          >
            <ShoppingBag className="size-3.5" /> View storefront
            <ArrowRight className="size-3" />
          </a>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          icon={TrendingUp}
          label="Total revenue"
          value={formatMoney(stats?.totalRevenue ?? 0, currency)}
          sub="All paid orders"
          highlight
        />
        <StatCard
          icon={ShoppingBag}
          label="Total orders"
          value={stats?.totalOrders ?? 0}
        />
        <StatCard
          icon={Package}
          label="Pending action"
          value={pendingCount}
          sub="Awaiting confirmation"
        />
        <StatCard
          icon={Truck}
          label="In transit"
          value={stats?.byStatus?.shipped?.count ?? 0}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent orders */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Recent Orders</h2>
            {orgSlug && (
              <Link href={`/app/${orgSlug}/orders`} className="text-xs text-primary hover:underline">
                View all →
              </Link>
            )}
          </div>

          {recentOrders.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <ShoppingBag className="size-8 text-muted-foreground/40" />
                <p className="text-sm font-medium">No orders yet</p>
                <p className="text-xs text-muted-foreground">
                  Orders from your storefront will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {recentOrders.map((order) => (
                    <div key={order._id} className="flex items-center gap-3 px-4 py-3">
                      <div
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                          STATUS_COLORS[order.status],
                        )}
                      >
                        {order.items.length}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">{order.orderNumber}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {order.deliveryAddress.fullName}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold">
                          {formatMoney(order.totalMinor, currency)}
                        </p>
                        <span
                          className={cn(
                            "inline-block rounded-full px-2 py-0.5 text-2xs font-medium capitalize",
                            STATUS_COLORS[order.status],
                          )}
                        >
                          {order.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Inventory alerts */}
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Inventory Alerts</h2>
          {lowStockProducts.length === 0 && outOfStockProducts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
                <CheckCircle2 className="size-7 text-success" />
                <p className="text-sm font-medium">All stock healthy</p>
                <p className="text-xs text-muted-foreground">
                  No low-stock or out-of-stock items.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {outOfStockProducts.slice(0, 4).map((p) => (
                <div
                  key={p._id}
                  className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3"
                >
                  {p.images[0] ? (
                    <img
                      src={p.images[0]}
                      alt={p.name}
                      className="size-9 rounded-md object-cover"
                    />
                  ) : (
                    <div className="flex size-9 items-center justify-center rounded-md bg-muted">
                      <Package className="size-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{p.name}</p>
                    <p className="text-2xs text-destructive">Out of stock</p>
                  </div>
                </div>
              ))}
              {lowStockProducts.slice(0, 4).map((p) => (
                <div
                  key={p._id}
                  className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/5 p-3"
                >
                  {p.images[0] ? (
                    <img
                      src={p.images[0]}
                      alt={p.name}
                      className="size-9 rounded-md object-cover"
                    />
                  ) : (
                    <div className="flex size-9 items-center justify-center rounded-md bg-muted">
                      <AlertTriangle className="size-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{p.name}</p>
                    <p className="text-2xs text-warning-foreground">Low stock</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
