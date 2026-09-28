"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@/lib/api-client/use-data";
import { FolderTree, Pencil, Plus, Trash2 } from "lucide-react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { dashboardApi, type Collection } from "@/components/dashboard/data";
import {
  EmptyState,
  LoadingPanel,
  ScreenHeader,
  SubmitButton,
} from "@/components/dashboard/screen-kit";
import { useWorkspace } from "@/components/dashboard/workspace-context";

// ─── Collection dialog ────────────────────────────────────────────────────────

function CollectionDialog({ collection }: { collection?: Collection }) {
  const createCollection = useMutation(dashboardApi.commerce.createCollection);
  const updateCollection = useMutation(dashboardApi.commerce.updateCollection);

  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [active, setActive] = useState(collection?.active ?? true);

  const isEdit = !!collection;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = {
      name: String(form.get("name") ?? "").trim(),
      description: String(form.get("description") ?? "").trim(),
      imageUrl: String(form.get("imageUrl") ?? "").trim() || undefined,
      active,
      sortOrder: collection?.sortOrder ?? 99,
    };

    if (!payload.name) return toast.error("Collection name is required");

    setPending(true);
    try {
      if (isEdit) {
        await updateCollection({ collectionId: collection._id, ...payload });
        toast.success("Collection updated");
      } else {
        await createCollection(payload);
        toast.success("Collection created");
      }
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save collection");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="icon" className="size-8">
            <Pencil className="size-3.5" />
          </Button>
        ) : (
          <Button size="sm" className="gap-1.5 text-sm">
            <Plus className="size-4" /> Add collection
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {isEdit ? "Edit collection" : "New collection"}
          </DialogTitle>
          <DialogDescription className="text-sm">
            Collections group products into categories on your storefront (e.g. "Summer
            Dresses", "Hair Tools").
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label className="text-sm" htmlFor="col-name">
              Name *
            </Label>
            <Input
              id="col-name"
              name="name"
              defaultValue={collection?.name}
              placeholder="e.g. New Arrivals"
              required
              className="text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-sm" htmlFor="col-desc">
              Description
            </Label>
            <Textarea
              id="col-desc"
              name="description"
              defaultValue={collection?.description}
              placeholder="Short description shown on the collection page…"
              rows={2}
              className="text-sm resize-none"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-sm" htmlFor="col-image">
              Cover image URL
            </Label>
            <Input
              id="col-image"
              name="imageUrl"
              defaultValue={collection?.imageUrl}
              placeholder="https://example.com/cover.jpg"
              className="text-sm"
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Active</p>
              <p className="text-xs text-muted-foreground">
                Visible on your storefront when enabled
              </p>
            </div>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              className="text-sm"
            >
              Cancel
            </Button>
            <SubmitButton pending={pending} className="text-sm">
              {isEdit ? "Save changes" : "Create collection"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Collection row ───────────────────────────────────────────────────────────

function CollectionRow({ collection }: { collection: Collection }) {
  const deleteCollection = useMutation(dashboardApi.commerce.deleteCollection);

  async function handleDelete() {
    if (
      !confirm(
        `Delete "${collection.name}"? Products in this collection will not be deleted, just unlinked.`,
      )
    )
      return;
    try {
      await deleteCollection({ collectionId: collection._id });
      toast.success("Collection deleted");
    } catch {
      toast.error("Failed to delete collection");
    }
  }

  return (
    <div className="flex items-center gap-4 py-3">
      {/* Cover thumbnail */}
      <div className="size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
        {collection.imageUrl ? (
          <img
            src={collection.imageUrl}
            alt={collection.name}
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <FolderTree className="size-5 text-muted-foreground/50" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-none truncate">{collection.name}</p>
        {collection.description && (
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
            {collection.description}
          </p>
        )}
      </div>

      {/* Badge */}
      <Badge
        variant={collection.active ? "default" : "secondary"}
        className="text-2xs shrink-0"
      >
        {collection.active ? "Active" : "Hidden"}
      </Badge>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <CollectionDialog collection={collection} />
        <Button
          variant="ghost"
          size="icon"
          className="size-8 hover:bg-destructive/10 hover:text-destructive"
          onClick={handleDelete}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export function CollectionsScreen() {
  const { organization } = useWorkspace();
  const isServicesOnly = (organization as any)?.businessModel === "services";

  const collections = useQuery<Collection[]>(
    dashboardApi.commerce.listCollections,
    organization?._id ? { includeInactive: true } : "skip",
  );

  const list = Array.isArray(collections) ? collections : [];
  const isLoading = collections === undefined;

  return (
    <div className="space-y-6">
      <ScreenHeader
        eyebrow="Commerce"
        title="Collections"
        description="Group your products into collections and categories that appear on your storefront."
        action={<CollectionDialog />}
      />

      {isServicesOnly && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-amber-700 dark:text-amber-300 flex items-center justify-between">
          <p>
            Your business model is currently set to <strong>Services Suite</strong>. Product collections and storefront grouping are inactive unless you switch to <strong>Commerce Suite</strong> or <strong>Hybrid Suite</strong> in Settings.
          </p>
          <Button variant="outline" size="sm" asChild className="h-7 text-xs shrink-0 ml-4">
            <Link href="/dashboard/settings">Switch Suite</Link>
          </Button>
        </div>
      )}

      {isLoading ? (
        <LoadingPanel />
      ) : list.length === 0 ? (
        <EmptyState
          icon={FolderTree}
          title="No collections yet"
          description="Create your first collection to organise products into categories like 'New Arrivals' or 'Best Sellers'."
          action={<CollectionDialog />}
        />
      ) : (
        <Card>
          <CardContent className="divide-y p-0 px-4">
            {list.map((col) => (
              <CollectionRow key={col._id} collection={col} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
