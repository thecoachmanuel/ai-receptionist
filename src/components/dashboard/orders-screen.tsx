"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@/lib/api-client/use-data";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Loader2,
  MessageCircle,
  Package,
  ShoppingBag,
  Truck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  dashboardApi,
  type Order,
  type OrderStatus,
} from "@/components/dashboard/data";
import {
  EmptyState,
  formatMoney,
  LoadingPanel,
  ScreenHeader,
} from "@/components/dashboard/screen-kit";
import { useWorkspace } from "@/components/dashboard/workspace-context";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; color: string; icon: React.ElementType; nextStatus?: OrderStatus; nextLabel?: string }
> = {
  pending: {
    label: "Pending",
    color: "bg-muted text-muted-foreground",
    icon: ClipboardList,
    nextStatus: "confirmed",
    nextLabel: "Confirm Order",
  },
  confirmed: {
    label: "Confirmed",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    icon: CheckCircle2,
    nextStatus: "processing",
    nextLabel: "Start Processing",
  },
  processing: {
    label: "Processing",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    icon: Package,
    nextStatus: "shipped",
    nextLabel: "Mark as Shipped",
  },
  shipped: {
    label: "Shipped",
    color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    icon: Truck,
    nextStatus: "delivered",
    nextLabel: "Mark Delivered",
  },
  delivered: {
    label: "Delivered",
    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    icon: XCircle,
  },
};

const PAYMENT_STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  unpaid: { label: "Unpaid", variant: "destructive" },
  paid: { label: "Paid", variant: "default" },
  refunded: { label: "Refunded", variant: "secondary" },
};

function formatDate(ts: number) {
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ts));
}

// ─── Order detail sheet ───────────────────────────────────────────────────────

function OrderSheet({ order, currency }: { order: Order; currency: string }) {
  const updateStatus = useMutation(dashboardApi.commerce.updateOrderStatus);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [courierName, setCourierName] = useState(order.courierName ?? "");
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber ?? "");

  const statusConfig = STATUS_CONFIG[order.status];
  const StatusIcon = statusConfig.icon;
  const paymentConfig = PAYMENT_STATUS_CONFIG[order.paymentStatus];

  async function advanceStatus() {
    const next = statusConfig.nextStatus;
    if (!next) return;
    setPending(true);
    try {
      await updateStatus({
        orderId: order._id,
        status: next,
        ...(next === "shipped" && {
          extra: { courierName: courierName || undefined, trackingNumber: trackingNumber || undefined },
        }),
        ...(next === "confirmed" && { paymentStatus: "paid" }),
      });
      toast.success(`Order ${statusConfig.nextLabel?.toLowerCase()} successfully`);
    } catch {
      toast.error("Failed to update order status");
    } finally {
      setPending(false);
    }
  }

  async function cancelOrder() {
    if (!confirm("Cancel this order? This cannot be undone.")) return;
    setPending(true);
    try {
      await updateStatus({ orderId: order._id, status: "cancelled" });
      toast.success("Order cancelled");
    } catch {
      toast.error("Failed to cancel order");
    } finally {
      setPending(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="flex w-full items-center gap-3 rounded-lg border bg-card p-4 text-left transition-shadow hover:shadow-sm">
          {/* Status indicator */}
          <div
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-full",
              statusConfig.color,
            )}
          >
            <StatusIcon className="size-4" />
          </div>

          {/* Order info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold">{order.orderNumber}</p>
              <Badge
                variant={paymentConfig.variant}
                className="text-2xs"
              >
                {paymentConfig.label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {order.deliveryAddress.fullName} · {order.items.length} item
              {order.items.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Total & date */}
          <div className="text-right shrink-0">
            <p className="text-sm font-bold text-primary">
              {formatMoney(order.totalMinor, currency)}
            </p>
            <p className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
          </div>
        </button>
      </SheetTrigger>

      <SheetContent className="w-full max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-xl">{order.orderNumber}</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          {/* Status pipeline */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {ORDER_STATUSES.filter((s) => s !== "cancelled").map((s, i, arr) => {
              const active = s === order.status;
              const done =
                ORDER_STATUSES.indexOf(s) < ORDER_STATUSES.indexOf(order.status) &&
                order.status !== "cancelled";
              return (
                <div key={s} className="flex items-center gap-1 shrink-0">
                  <div
                    className={cn(
                      "rounded-full px-2 py-0.5 text-2xs font-medium whitespace-nowrap",
                      active
                        ? STATUS_CONFIG[s].color
                        : done
                        ? "bg-success/15 text-success"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {STATUS_CONFIG[s].label}
                  </div>
                  {i < arr.length - 1 && (
                    <ArrowRight className="size-3 text-muted-foreground shrink-0" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Customer */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Customer
            </p>
            <div className="rounded-lg border p-3 space-y-0.5">
              <p className="text-sm font-medium">{order.deliveryAddress.fullName}</p>
              <p className="text-xs text-muted-foreground">{order.deliveryAddress.phone}</p>
              <p className="text-xs text-muted-foreground">
                {order.deliveryAddress.street}, {order.deliveryAddress.city},{" "}
                {order.deliveryAddress.state}
              </p>
            </div>
          </div>

          {/* Items */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Items
            </p>
            <div className="rounded-lg border divide-y overflow-hidden">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.productName}
                      className="size-10 rounded-md object-cover"
                    />
                  ) : (
                    <div className="flex size-10 items-center justify-center rounded-md bg-muted">
                      <ShoppingBag className="size-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-none truncate">{item.productName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.variantLabel} · Qty {item.quantity}
                    </p>
                  </div>
                  <p className="text-sm font-semibold shrink-0">
                    {formatMoney(item.lineTotalMinor, currency)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="rounded-lg border p-3 space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatMoney(order.subtotalMinor, currency)}</span>
            </div>
            {order.deliveryFeeMinor > 0 && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Delivery</span>
                <span>{formatMoney(order.deliveryFeeMinor, currency)}</span>
              </div>
            )}
            {order.discountMinor > 0 && (
              <div className="flex justify-between text-xs text-success">
                <span>Discount</span>
                <span>−{formatMoney(order.discountMinor, currency)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-1.5 text-sm font-bold">
              <span>Total</span>
              <span className="text-primary">{formatMoney(order.totalMinor, currency)}</span>
            </div>
          </div>

          {/* Shipping fields for the shipped step */}
          {order.status === "processing" && (
            <div className="space-y-3 rounded-lg border p-3">
              <p className="text-xs font-semibold text-muted-foreground">
                Shipping details (optional)
              </p>
              <div className="space-y-1">
                <Label className="text-xs">Courier name</Label>
                <Input
                  value={courierName}
                  onChange={(e) => setCourierName(e.target.value)}
                  placeholder="e.g. GIG, DHL, Kwik"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tracking number</Label>
                <Input
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="e.g. GIG1234567"
                  className="h-8 text-sm"
                />
              </div>
            </div>
          )}

          {/* WhatsApp link */}
          <a
            href={`https://wa.me/${order.deliveryAddress.phone.replace(/\D/g, "")}`}
            target="_blank"
            rel="noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-green-500/40 bg-green-500/5 py-2 text-sm font-medium text-green-700 transition-colors hover:bg-green-500/10 dark:text-green-400"
          >
            <MessageCircle className="size-4" />
            Message customer on WhatsApp
          </a>

          {/* Actions */}
          <div className="flex gap-2">
            {statusConfig.nextStatus && (
              <Button
                className="flex-1 gap-2 text-sm"
                onClick={advanceStatus}
                disabled={pending}
              >
                {pending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ArrowRight className="size-4" />
                )}
                {statusConfig.nextLabel}
              </Button>
            )}
            {order.status !== "delivered" && order.status !== "cancelled" && (
              <Button
                variant="outline"
                className="text-sm text-destructive hover:bg-destructive/10"
                onClick={cancelOrder}
                disabled={pending}
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 pt-4 pb-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Icon className="size-5 text-primary" />
        </div>
        <div>
          <p className="text-xl font-bold leading-none">{value}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
          {sub && <p className="text-2xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export function OrdersScreen() {
  const { organization } = useWorkspace();
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");

  const orders = useQuery<Order[]>(
    dashboardApi.commerce.listOrders,
    organization?._id ? { limit: 100 } : "skip",
  );

  const stats = useQuery<{
    byStatus: Record<string, { count: number; revenue: number }>;
    totalRevenue: number;
    totalOrders: number;
  }>(dashboardApi.commerce.getOrderStats, organization?._id ? {} : "skip");

  const currency = organization?.currency ?? "NGN";
  const orderList = Array.isArray(orders) ? orders : [];
  const isLoading = orders === undefined;

  const filtered =
    statusFilter === "all" ? orderList : orderList.filter((o) => o.status === statusFilter);

  const pendingCount = orderList.filter(
    (o) => o.status === "pending" || o.status === "confirmed",
  ).length;

  const isServicesOnly = (organization as any)?.businessModel === "services";

  return (
    <div className="space-y-6">
      <ScreenHeader
        eyebrow="Commerce"
        title="Orders"
        description="Manage customer orders across the fulfillment pipeline. Update status and notify customers via WhatsApp."
      />

      {isServicesOnly && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-amber-700 dark:text-amber-300 flex items-center justify-between">
          <p>
            Your business model is currently set to <strong>Services Suite</strong>. Order fulfillment and commerce tracking are inactive unless you switch to <strong>Commerce Suite</strong> or <strong>Hybrid Suite</strong> in Settings.
          </p>
          <Button variant="outline" size="sm" asChild className="h-7 text-xs shrink-0 ml-4">
            <Link href="/dashboard/settings">Switch Suite</Link>
          </Button>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          icon={ClipboardList}
          label="Total orders"
          value={stats?.totalOrders ?? "—"}
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
        <StatCard
          icon={CheckCircle2}
          label="Total revenue"
          value={stats ? formatMoney(stats.totalRevenue, currency) : "—"}
          sub="Paid orders"
        />
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2">
        {(["all", ...ORDER_STATUSES] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s as any)}
            className={cn(
              "rounded-full px-3 py-1 text-xs border capitalize transition-colors",
              statusFilter === s
                ? "bg-primary text-primary-foreground border-primary"
                : "border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-foreground",
            )}
          >
            {s === "all" ? "All orders" : STATUS_CONFIG[s].label}
            {s !== "all" && (
              <span className="ml-1.5 opacity-60">
                {orderList.filter((o) => o.status === s).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Order list */}
      {isLoading ? (
        <LoadingPanel />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title={statusFilter === "all" ? "No orders yet" : `No ${statusFilter} orders`}
          description={
            statusFilter === "all"
              ? "Orders from your storefront and WhatsApp channel will appear here."
              : `There are currently no orders with '${statusFilter}' status.`
          }
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((order) => (
            <OrderSheet key={order._id} order={order} currency={currency} />
          ))}
        </div>
      )}
    </div>
  );
}
