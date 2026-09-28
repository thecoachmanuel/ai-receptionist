"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@/lib/api-client/use-data";
import {
  ExternalLink,
  MessageCircle,
  Phone,
  Search,
  ShoppingBag,
  UsersRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  dashboardApi,
  type Order,
} from "@/components/dashboard/data";
import {
  EmptyState,
  formatMoney,
  LoadingPanel,
  ScreenHeader,
} from "@/components/dashboard/screen-kit";
import { useWorkspace } from "@/components/dashboard/workspace-context";

interface CustomerAggregated {
  name: string;
  phone: string;
  address: string;
  orderCount: number;
  totalSpendMinor: number;
  lastOrderDate: number;
}

export function CustomersScreen() {
  const { organization } = useWorkspace();
  const [search, setSearch] = useState("");
  const currency = organization?.currency ?? "NGN";

  const orders = useQuery<Order[]>(
    dashboardApi.commerce.listOrders,
    organization?._id ? { limit: 200 } : "skip",
  );

  const orderList = Array.isArray(orders) ? orders : [];
  const isLoading = orders === undefined;

  // Aggregate customers from orders
  const customers = useMemo(() => {
    const map = new Map<string, CustomerAggregated>();

    for (const o of orderList) {
      const phone = o.deliveryAddress?.phone?.trim();
      const name = o.deliveryAddress?.fullName?.trim() || "Customer";
      const key = phone || name;

      const existing = map.get(key);
      const isPaid = o.paymentStatus === "paid";
      const spend = isPaid ? o.totalMinor : 0;

      if (existing) {
        existing.orderCount += 1;
        existing.totalSpendMinor += spend;
        if (o.createdAt > existing.lastOrderDate) {
          existing.lastOrderDate = o.createdAt;
          existing.address = `${o.deliveryAddress?.city || ""}, ${o.deliveryAddress?.state || ""}`.trim();
        }
      } else {
        map.set(key, {
          name,
          phone: phone || "",
          address: `${o.deliveryAddress?.city || ""}, ${o.deliveryAddress?.state || ""}`.trim(),
          orderCount: 1,
          totalSpendMinor: spend,
          lastOrderDate: o.createdAt,
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => b.lastOrderDate - a.lastOrderDate);
  }, [orderList]);

  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q),
    );
  }, [customers, search]);

  return (
    <div className="space-y-6">
      <ScreenHeader
        eyebrow="Relationships"
        title="Customers"
        description="View customer profiles, total spend, order history, and reach out directly via WhatsApp."
      />

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, phone, or location…"
          className="pl-9 text-xs h-9"
        />
      </div>

      {isLoading ? (
        <LoadingPanel rows={5} />
      ) : customers.length === 0 ? (
        <EmptyState
          icon={UsersRound}
          title="No customers yet"
          description="Customers who place orders on your storefront will automatically appear here with their contact details and order history."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c, i) => {
            const cleanPhone = c.phone.replace(/\D/g, "");
            const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}` : null;

            return (
              <Card key={i} className="relative overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                        {c.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate leading-tight">
                          {c.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {c.phone || "No phone"}
                        </p>
                      </div>
                    </div>

                    <Badge variant="secondary" className="text-2xs shrink-0">
                      {c.orderCount} {c.orderCount === 1 ? "order" : "orders"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 border-t pt-2.5 text-xs">
                    <div>
                      <p className="text-2xs text-muted-foreground">Total Spend</p>
                      <p className="font-bold text-foreground">
                        {formatMoney(c.totalSpendMinor, currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-2xs text-muted-foreground">Last Order</p>
                      <p className="font-medium text-foreground">
                        {new Date(c.lastOrderDate).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                    </div>
                  </div>

                  {c.address && (
                    <p className="text-2xs text-muted-foreground truncate border-t pt-2">
                      📍 {c.address}
                    </p>
                  )}

                  {waUrl && (
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="w-full gap-2 text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
                    >
                      <a href={waUrl} target="_blank" rel="noreferrer">
                        <MessageCircle className="size-3.5" /> Chat on WhatsApp
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
