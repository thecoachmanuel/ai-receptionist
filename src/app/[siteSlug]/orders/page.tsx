"use client";

import { useState, type FormEvent, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Package, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function OrderLookupPage({
  params,
}: {
  params: Promise<{ siteSlug: string }>;
}) {
  const { siteSlug } = use(params);
  const router = useRouter();
  const [orderNumber, setOrderNumber] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const clean = orderNumber.trim().toUpperCase();
    if (!clean) {
      toast.error("Please enter an order number");
      return;
    }
    setLoading(true);
    router.push(`/${siteSlug}/orders/${clean}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <Link
          href={`/${siteSlug}/shop`}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Back to Store
        </Link>

        <Card>
          <CardHeader className="text-center space-y-1">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-2">
              <Package className="size-6" />
            </div>
            <CardTitle className="text-lg font-bold">Track Your Order</CardTitle>
            <CardDescription className="text-xs">
              Enter your order number to see real-time updates and delivery status.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Order Number</Label>
                <div className="relative">
                  <Input
                    required
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    placeholder="e.g. ORD-1727493"
                    className="font-mono text-sm uppercase pl-9"
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                </div>
                <p className="text-2xs text-muted-foreground">
                  Found in your WhatsApp order confirmation message
                </p>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full gap-2 text-xs font-semibold"
                size="default"
              >
                Track Order <ArrowRight className="size-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
