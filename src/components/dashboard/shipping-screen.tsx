"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@/lib/api-client/use-data";
import {
  Clock,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  Truck,
} from "lucide-react";
import { toast } from "sonner";

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
import {
  dashboardApi,
  type ShippingZone,
} from "@/components/dashboard/data";
import {
  EmptyState,
  formatMoney,
  LoadingPanel,
  ScreenHeader,
  SubmitButton,
} from "@/components/dashboard/screen-kit";
import { useWorkspace } from "@/components/dashboard/workspace-context";

// ─── Add / Edit Zone Dialog ───────────────────────────────────────────────────

function ZoneDialog({
  zone,
  trigger,
}: {
  zone?: ShippingZone;
  trigger?: React.ReactNode;
}) {
  const { organization } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(zone?.name ?? "");
  const [rateMajor, setRateMajor] = useState(
    zone ? (zone.rateMinor / 100).toString() : "",
  );
  const [estimatedDeliveryDays, setEstimatedDeliveryDays] = useState(
    zone?.estimatedDeliveryDays ?? "2-3 business days",
  );
  const [active, setActive] = useState(zone?.active ?? true);
  const [submitting, setSubmitting] = useState(false);

  const currency = organization?.currency ?? "NGN";
  const createZone = useMutation(dashboardApi.commerce.createShippingZone);
  const updateZone = useMutation(dashboardApi.commerce.updateShippingZone);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Zone name is required");
      return;
    }

    const rateMinor = Math.round((parseFloat(rateMajor) || 0) * 100);

    setSubmitting(true);
    try {
      if (zone) {
        await updateZone({
          zoneId: zone._id,
          name: name.trim(),
          rateMinor,
          estimatedDeliveryDays: estimatedDeliveryDays.trim(),
          active,
        });
        toast.success("Shipping zone updated");
      } else {
        await createZone({
          name: name.trim(),
          rateMinor,
          estimatedDeliveryDays: estimatedDeliveryDays.trim(),
          active,
        });
        toast.success("Shipping zone created");
      }
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save shipping zone");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" className="gap-1.5 text-xs">
            <Plus className="size-4" /> Add Shipping Zone
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              {zone ? "Edit Shipping Zone" : "New Shipping Zone"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Define the delivery region, standard rate, and expected arrival timeframe.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Zone Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Lagos (Island & Mainland), Nationwide Express"
                required
                className="text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Shipping Rate ({currency})</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={rateMajor}
                  onChange={(e) => setRateMajor(e.target.value)}
                  placeholder="2500"
                  required
                  className="text-sm"
                />
                <p className="text-2xs text-muted-foreground">Enter 0 for free delivery</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Estimated Delivery</Label>
                <Input
                  value={estimatedDeliveryDays}
                  onChange={(e) => setEstimatedDeliveryDays(e.target.value)}
                  placeholder="e.g. 1-2 business days"
                  className="text-sm"
                />
                <p className="text-2xs text-muted-foreground">Shown to customers at checkout</p>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-xs font-medium">Zone Active</p>
                <p className="text-2xs text-muted-foreground">
                  Available for customers to choose at checkout
                </p>
              </div>
              <Switch checked={active} onCheckedChange={setActive} />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <SubmitButton
              pending={submitting}
              className="text-xs"
            >
              {zone ? "Save Changes" : "Create Zone"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Shipping Screen ─────────────────────────────────────────────────────

export function ShippingScreen() {
  const { organization } = useWorkspace();
  const isServicesOnly = (organization as any)?.businessModel === "services";
  const currency = organization?.currency ?? "NGN";

  const zones = useQuery<ShippingZone[]>(
    dashboardApi.commerce.listShippingZones,
    organization?._id ? {} : "skip",
  );

  const updateZone = useMutation(dashboardApi.commerce.updateShippingZone);

  const zoneList = Array.isArray(zones) ? zones : [];
  const isLoading = zones === undefined;

  const handleToggle = async (zone: ShippingZone) => {
    try {
      await updateZone({ zoneId: zone._id, active: !zone.active });
      toast.success(zone.active ? "Zone disabled" : "Zone enabled");
    } catch {
      toast.error("Failed to update status");
    }
  };

  return (
    <div className="space-y-6">
      <ScreenHeader
        eyebrow="Fulfillment"
        title="Shipping & Delivery"
        description="Set up delivery zones, rates, and shipping timelines that customers select during storefront checkout."
        action={<ZoneDialog />}
      />

      {isServicesOnly && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-amber-700 dark:text-amber-300 flex items-center justify-between">
          <p>
            Your business model is currently set to <strong>Services Suite</strong>. Shipping zones and delivery rates are inactive unless you switch to <strong>Commerce Suite</strong> or <strong>Hybrid Suite</strong> in Settings.
          </p>
          <Button variant="outline" size="sm" asChild className="h-7 text-xs shrink-0 ml-4">
            <Link href="/dashboard/settings">Switch Suite</Link>
          </Button>
        </div>
      )}

      {/* Info Tip */}
      <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4 text-xs text-muted-foreground">
        <Truck className="size-5 shrink-0 text-primary" />
        <div className="space-y-0.5">
          <p className="font-medium text-foreground">How shipping works at checkout</p>
          <p>
            When a customer provides their delivery address, available shipping rates are automatically
            calculated and added to the order subtotal. You can define local pickup, regional rates, or flat nationwide fees.
          </p>
        </div>
      </div>

      {isLoading ? (
        <LoadingPanel rows={4} />
      ) : zoneList.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No shipping zones yet"
          description="Create your first shipping zone so customers know delivery rates and timeframes at checkout."
          action={<ZoneDialog />}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {zoneList.map((zone) => (
            <Card key={zone._id} className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold leading-tight">{zone.name}</p>
                    <Badge
                      variant={zone.active ? "default" : "secondary"}
                      className="text-2xs"
                    >
                      {zone.active ? "Active" : "Disabled"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="size-3.5" />
                    <span>{zone.estimatedDeliveryDays || "Standard delivery"}</span>
                  </div>
                </div>

                <ZoneDialog
                  zone={zone}
                  trigger={
                    <Button variant="ghost" size="icon" className="size-8">
                      <Pencil className="size-3.5 text-muted-foreground" />
                    </Button>
                  }
                />
              </CardHeader>

              <CardContent className="space-y-3 pt-0">
                <div className="flex items-baseline justify-between border-t pt-3">
                  <span className="text-xs text-muted-foreground">Delivery Fee</span>
                  <span className="text-base font-bold text-foreground">
                    {zone.rateMinor === 0 ? (
                      <span className="text-green-600">FREE</span>
                    ) : (
                      formatMoney(zone.rateMinor, currency)
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between border-t pt-2.5">
                  <span className="text-2xs text-muted-foreground">Toggle availability</span>
                  <Switch
                    checked={zone.active}
                    onCheckedChange={() => handleToggle(zone)}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
