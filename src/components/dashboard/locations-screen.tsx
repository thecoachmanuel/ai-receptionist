"use client";

import { useState, type FormEvent } from "react";
import { Building2, MapPin, Plus, Phone, Mail, Check, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery } from "@/lib/api-client/use-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { dashboardApi } from "@/components/dashboard/data";
import { LoadingPanel, ScreenHeader, SubmitButton } from "@/components/dashboard/screen-kit";
import { useWorkspace } from "@/components/dashboard/workspace-context";

export function LocationsScreen() {
  const { organization } = useWorkspace();
  const locations = useQuery<any[]>(
    dashboardApi.locations.list,
    organization ? { includeInactive: true } : "skip",
  );
  const createLocation = useMutation(dashboardApi.locations.create);
  const updateLocation = useMutation(dashboardApi.locations.update);
  const deleteLocation = useMutation(dashboardApi.locations.delete);

  const [open, setOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const form = e.currentTarget;
    const formData = new FormData(form);

    const payload = {
      name: formData.get("name") as string,
      address: formData.get("address") as string,
      city: formData.get("city") as string,
      phone: (formData.get("phone") as string) || undefined,
      email: (formData.get("email") as string) || undefined,
      isPrimary: formData.get("isPrimary") === "on",
    };

    try {
      if (editingLocation) {
        await updateLocation({
          locationId: editingLocation._id,
          ...payload,
        });
        toast.success("Branch location updated successfully!");
      } else {
        await createLocation(payload);
        toast.success("New branch location added successfully!");
      }
      setOpen(false);
      setEditingLocation(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save location.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (locationId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete branch "${name}"?`)) return;
    try {
      await deleteLocation({ locationId });
      toast.success("Location deleted successfully.");
    } catch (err) {
      toast.error("Failed to delete location.");
    }
  };

  return (
    <>
      <ScreenHeader
        eyebrow="Multi-branch operations"
        title="Business Locations"
        description="Manage your physical branches, addresses, contact details, and branch-specific AI Receptionist routing."
        action={
          <Dialog
            open={open}
            onOpenChange={(v) => {
              setOpen(v);
              if (!v) setEditingLocation(null);
            }}
          >
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="size-4" />
                Add Branch Location
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingLocation ? "Edit Branch Location" : "Add Branch Location"}
                </DialogTitle>
                <DialogDescription>
                  Locations appear on your public site and allow the AI Receptionist to route callers to specific branches.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Branch Name</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={editingLocation?.name ?? ""}
                    placeholder="e.g. Lekki Flagship Store or Downtown Clinic"
                    required
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="address">Street Address</Label>
                    <Input
                      id="address"
                      name="address"
                      defaultValue={editingLocation?.address ?? ""}
                      placeholder="e.g. 14 Admiralty Way"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="city">City / Region</Label>
                    <Input
                      id="city"
                      name="city"
                      defaultValue={editingLocation?.city ?? ""}
                      placeholder="e.g. Lekki, Lagos"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Phone (Optional)</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      defaultValue={editingLocation?.phone ?? ""}
                      placeholder="+234..."
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="email">Email (Optional)</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      defaultValue={editingLocation?.email ?? ""}
                      placeholder="lekki@business.com"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="isPrimary"
                    name="isPrimary"
                    defaultChecked={editingLocation?.isPrimary}
                    className="size-4 rounded border-gray-300 text-primary"
                  />
                  <Label htmlFor="isPrimary" className="text-xs cursor-pointer font-normal">
                    Set as Primary Main Branch
                  </Label>
                </div>

                <DialogFooter className="pt-3">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <SubmitButton pending={saving}>
                    {editingLocation ? "Save Changes" : "Create Branch"}
                  </SubmitButton>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {!locations ? (
        <LoadingPanel rows={4} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {locations.map((loc) => (
            <Card key={loc._id} className="relative flex flex-col justify-between hover:border-black/20 transition shadow-xs">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary shrink-0">
                      <Building2 className="size-4" />
                    </div>
                    <div>
                      <CardTitle className="font-heading text-base font-semibold">{loc.name}</CardTitle>
                      {loc.isPrimary && (
                        <Badge className="mt-0.5 bg-primary text-primary-foreground text-[10px]">
                          Main Branch
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-0 text-xs text-muted-foreground">
                <div className="flex items-start gap-2">
                  <MapPin className="size-3.5 shrink-0 mt-0.5 text-foreground/70" />
                  <span>{loc.address}, {loc.city}</span>
                </div>
                {loc.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="size-3.5 shrink-0 text-foreground/70" />
                    <span className="font-mono text-[11px]">{loc.phone}</span>
                  </div>
                )}
                {loc.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="size-3.5 shrink-0 text-foreground/70" />
                    <span>{loc.email}</span>
                  </div>
                )}

                <div className="border-t pt-3 flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => {
                      setEditingLocation(loc);
                      setOpen(true);
                    }}
                    className="h-7 text-xs gap-1"
                  >
                    <Edit className="size-3" /> Edit
                  </Button>
                  {!loc.isPrimary && (
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => handleDelete(loc._id, loc.name)}
                      className="h-7 text-xs text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
