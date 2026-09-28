"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  MapPin,
  MessageCircle,
  Package,
  ShieldAlert,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

function formatMoney(minor: number, currency = "NGN"): string {
  const major = minor / 100;
  if (currency === "NGN") {
    return `₦${major.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }
  return `${currency} ${major.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface OrderData {
  _id: string;
  orderNumber: string;
  items: Array<{
    productId: string;
    productName: string;
    variantLabel: string;
    sku: string;
    imageUrl: string;
    quantity: number;
    unitPriceMinor: number;
    lineTotalMinor: number;
  }>;
  subtotalMinor: number;
  deliveryFeeMinor: number;
  discountMinor: number;
  totalMinor: number;
  currency: string;
  status: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";
  paymentStatus: "unpaid" | "paid" | "refunded";
  paymentMethod: string;
  deliveryAddress: {
    fullName: string;
    phone: string;
    street: string;
    city: string;
    state: string;
  };
  courierName?: string;
  trackingNumber?: string;
  createdAt: number;
}

const ORDER_STEPS = [
  { key: "pending", label: "Order Placed", desc: "We have received your order" },
  { key: "confirmed", label: "Payment Confirmed", desc: "Payment received & verified" },
  { key: "processing", label: "Processing & Packing", desc: "Your items are being packed" },
  { key: "shipped", label: "Dispatched", desc: "Courier on the way" },
  { key: "delivered", label: "Delivered", desc: "Package delivered to you" },
] as const;

export function OrderTrackingView({
  siteSlug,
  storeName,
  order,
  bankDetails,
  whatsappPhone,
}: {
  siteSlug: string;
  storeName: string;
  order: OrderData;
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  } | null;
  whatsappPhone?: string;
}) {
  const statusIndexMap: Record<string, number> = {
    pending: 0,
    confirmed: 1,
    processing: 2,
    shipped: 3,
    delivered: 4,
    cancelled: -1,
  };

  const currentStep = statusIndexMap[order.status] ?? 0;
  const isCancelled = order.status === "cancelled";

  const handleWhatsAppHelp = () => {
    const text = encodeURIComponent(
      `Hi ${storeName}, I have a question regarding my order *${order.orderNumber}*.`,
    );
    const cleanPhone = (whatsappPhone || "").replace(/\D/g, "");
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${text}`
      : `https://wa.me/?text=${text}`;
    window.open(url, "_blank");
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-8">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href={`/${siteSlug}/shop`}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="size-3.5" /> Continue Shopping
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Order {order.orderNumber}
            </h1>
            <Badge
              variant={
                order.paymentStatus === "paid"
                  ? "default"
                  : order.status === "cancelled"
                    ? "destructive"
                    : "secondary"
              }
              className="text-2xs uppercase"
            >
              {order.paymentStatus === "paid" ? "Paid" : "Payment Pending"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Placed on {new Date(order.createdAt).toLocaleDateString("en-GB", { dateStyle: "long" })}
          </p>
        </div>

        <Button
          onClick={handleWhatsAppHelp}
          variant="outline"
          size="sm"
          className="gap-2 text-xs text-green-600 hover:text-green-700 hover:bg-green-50 shrink-0"
        >
          <MessageCircle className="size-4" /> Need Help? Chat on WhatsApp
        </Button>
      </div>

      {/* ── Status Timeline ──────────────────────────────────────────────── */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/30 pb-4">
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <span>Tracking Status</span>
            {isCancelled && (
              <Badge variant="destructive" className="text-2xs">
                Cancelled
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {isCancelled ? (
            <div className="flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-xs text-destructive">
              <ShieldAlert className="size-5 shrink-0" />
              <div>
                <p className="font-semibold">This order has been cancelled</p>
                <p className="text-muted-foreground mt-0.5">
                  If you have already made payment or have questions, please reach out to customer support on WhatsApp.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              {ORDER_STEPS.map((step, idx) => {
                const isPassed = currentStep >= idx;
                const isCurrent = currentStep === idx;

                return (
                  <div
                    key={step.key}
                    className="flex flex-col items-center sm:items-start text-center sm:text-left space-y-1.5"
                  >
                    <div
                      className={cn(
                        "flex size-8 items-center justify-center rounded-full text-xs font-bold transition-all",
                        isPassed
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground",
                        isCurrent && "ring-4 ring-primary/20",
                      )}
                    >
                      {isPassed ? <CheckCircle2 className="size-4" /> : idx + 1}
                    </div>
                    <p
                      className={cn(
                        "text-xs font-semibold leading-tight",
                        isPassed ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {step.label}
                    </p>
                    <p className="text-2xs text-muted-foreground">{step.desc}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Courier & Tracking Banner if Shipped */}
          {(order.courierName || order.trackingNumber) && (
            <div className="mt-6 flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3.5 text-xs">
              <Truck className="size-5 text-primary shrink-0" />
              <div className="space-y-0.5">
                <p className="font-semibold text-foreground">Package Dispatched</p>
                <p className="text-muted-foreground">
                  {order.courierName && <span>Courier: <strong>{order.courierName}</strong></span>}
                  {order.courierName && order.trackingNumber && <span> · </span>}
                  {order.trackingNumber && (
                    <span>Tracking Number: <strong className="font-mono">{order.trackingNumber}</strong></span>
                  )}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Order Breakdown ──────────────────────────────────────────────── */}
      <div className="grid gap-6 sm:grid-cols-3">
        {/* Items List */}
        <Card className="sm:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Items in Order</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 divide-y divide-border/60">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex gap-3 pt-3 first:pt-0">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.productName}
                    className="size-14 rounded-md object-cover border shrink-0"
                  />
                ) : (
                  <div className="flex size-14 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <Package className="size-5" />
                  </div>
                )}
                <div className="flex flex-1 items-center justify-between min-w-0">
                  <div>
                    <p className="text-xs font-semibold leading-tight truncate">
                      {item.productName}
                    </p>
                    <p className="text-2xs text-muted-foreground mt-0.5">
                      {item.variantLabel} · Qty: {item.quantity}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-foreground">
                    {formatMoney(item.lineTotalMinor, order.currency)}
                  </span>
                </div>
              </div>
            ))}

            <div className="pt-4 space-y-1.5 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatMoney(order.subtotalMinor, order.currency)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Delivery</span>
                <span>{formatMoney(order.deliveryFeeMinor, order.currency)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t text-sm font-bold text-foreground">
                <span>Total</span>
                <span>{formatMoney(order.totalMinor, order.currency)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer & Delivery Details */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <MapPin className="size-4 text-primary" /> Delivery Address
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">{order.deliveryAddress.fullName}</p>
              <p>{order.deliveryAddress.phone}</p>
              <p>{order.deliveryAddress.street}</p>
              <p>
                {order.deliveryAddress.city}, {order.deliveryAddress.state}
              </p>
            </CardContent>
          </Card>

          {/* Payment Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Method:</span>
                <span className="font-medium capitalize">
                  {order.paymentMethod.replace(/_/g, " ")}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Status:</span>
                <Badge
                  variant={order.paymentStatus === "paid" ? "default" : "outline"}
                  className="text-2xs"
                >
                  {order.paymentStatus}
                </Badge>
              </div>

              {/* Bank Details Reminder if Unpaid Bank Transfer */}
              {order.paymentStatus === "unpaid" && bankDetails && (
                <div className="mt-3 rounded-md border bg-muted/40 p-2.5 space-y-1 text-2xs">
                  <p className="font-semibold text-foreground">Bank Payment Details</p>
                  <p>Bank: {bankDetails.bankName}</p>
                  <p className="font-mono font-bold text-foreground">
                    Acc: {bankDetails.accountNumber}
                  </p>
                  <p>Name: {bankDetails.accountName}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
