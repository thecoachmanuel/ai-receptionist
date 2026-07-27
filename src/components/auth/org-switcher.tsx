"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function OrganizationSwitcher({
  hidePersonal,
  afterCreateOrganizationUrl,
  afterSelectOrganizationUrl,
  appearance,
}: {
  hidePersonal?: boolean;
  afterCreateOrganizationUrl?: string;
  afterSelectOrganizationUrl?: string;
  appearance?: any;
}) {
  const { organization, userOrganizations, switchOrganization, createOrganization } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleSelect = async (orgIdOrSlug: string) => {
    if (orgIdOrSlug === organization?.id || orgIdOrSlug === organization?.slug) return;
    await switchOrganization(orgIdOrSlug);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;
    setIsCreating(true);
    try {
      const { slug } = await createOrganization(newOrgName.trim());
      setCreateOpen(false);
      setNewOrgName("");
      await switchOrganization(slug);
    } catch (err) {
      console.error("Failed to create organization", err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between border-0 bg-transparent px-1 py-1 text-left font-normal shadow-none hover:bg-black/5"
          >
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-xs font-medium text-foreground">
                {organization?.name || "Select workspace"}
              </span>
              <span className="truncate text-[10px] text-muted-foreground capitalize">
                {organization?.role || "Active workspace"}
              </span>
            </div>
            <ChevronsUpDown className="ml-2 size-3.5 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="start">
          <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Workspaces
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {userOrganizations.map((org) => {
            const isSelected = org.id === organization?.id || org.slug === organization?.slug;
            return (
              <DropdownMenuItem
                key={org.id}
                onClick={() => handleSelect(org.slug)}
                className="flex items-center justify-between cursor-pointer"
              >
                <div className="flex flex-col min-w-0">
                  <span className="truncate text-xs font-medium">{org.name}</span>
                  <span className="truncate text-[10px] text-muted-foreground capitalize">{org.role}</span>
                </div>
                {isSelected && <Check className="size-4 text-primary" />}
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setCreateOpen(true)} className="cursor-pointer text-primary">
            <Plus className="mr-2 size-4" />
            <span className="text-xs font-medium">Create organization</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle>Create organization</DialogTitle>
              <DialogDescription>
                Add a new workspace for your business, team, or client.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="org-name">Organization name</Label>
                <Input
                  id="org-name"
                  placeholder="e.g. Acme Services"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? "Creating..." : "Create organization"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function OrganizationList({
  hidePersonal,
  afterCreateOrganizationUrl,
  afterSelectOrganizationUrl,
  appearance,
}: any) {
  const { userOrganizations, switchOrganization, createOrganization } = useAuth();
  const [newOrgName, setNewOrgName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;
    setIsCreating(true);
    try {
      const { slug } = await createOrganization(newOrgName.trim());
      setNewOrgName("");
      await switchOrganization(slug);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {userOrganizations.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Your organizations
          </p>
          <div className="grid gap-2">
            {userOrganizations.map((org) => (
              <Button
                key={org.id}
                variant="outline"
                className="justify-between h-12 px-4 bg-white"
                onClick={() => switchOrganization(org.slug)}
              >
                <div className="text-left">
                  <p className="font-medium text-sm">{org.name}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{org.role}</p>
                </div>
                <Check className="size-4 opacity-50" />
              </Button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleCreate} className="space-y-4 rounded-xl border bg-white p-5">
        <p className="font-heading text-lg font-semibold">Create a new organization</p>
        <div className="space-y-2">
          <Label htmlFor="list-org-name">Organization name</Label>
          <Input
            id="list-org-name"
            placeholder="e.g. Oneboard Barbershop"
            value={newOrgName}
            onChange={(e) => setNewOrgName(e.target.value)}
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={isCreating}>
          {isCreating ? "Creating workspace..." : "Create organization"}
        </Button>
      </form>
    </div>
  );
}
