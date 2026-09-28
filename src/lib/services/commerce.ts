import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db/mongodb";
import type { DbProduct, DbCollection, DbOrder, DbShippingZone } from "@/lib/db/types";
import { getEffectiveProductLimit } from "@/lib/services/commerce-quota";
import { getOrganizationByIdOrSlug } from "@/lib/services/organizations";

// ─── Helpers ────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function toId(id: string | ObjectId): ObjectId {
  return typeof id === "string" ? new ObjectId(id) : id;
}

// ─── PRODUCTS ────────────────────────────────────────────────────────────────

export async function listProducts(
  orgId: string,
  options: { includeInactive?: boolean; collectionId?: string; limit?: number } = {},
) {
  const db = await getDb();
  const query: Record<string, any> = { organizationId: orgId };
  if (!options.includeInactive) query.active = true;
  if (options.collectionId) query.collectionIds = options.collectionId;

  const products = await db
    .collection<DbProduct>("products")
    .find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit ?? 200)
    .toArray();

  return products.map((p) => ({ ...p, _id: String(p._id) }));
}

export async function getProductById(orgId: string, productId: string) {
  const db = await getDb();
  const product = await db.collection<DbProduct>("products").findOne({
    _id: toId(productId),
    organizationId: orgId,
  });
  if (!product) return null;
  return { ...product, _id: String(product._id) };
}

export async function countProducts(orgId: string) {
  const db = await getDb();
  return db.collection<DbProduct>("products").countDocuments({ organizationId: orgId });
}

export async function createProduct(
  orgId: string,
  data: Omit<DbProduct, "_id" | "organizationId" | "createdAt" | "updatedAt">,
) {
  const org = await getOrganizationByIdOrSlug(orgId);
  if (!org) throw new Error("Organization not found");
  const { limit } = await getEffectiveProductLimit(org as any);
  if (limit !== -1) {
    const current = await countProducts(orgId);
    if (current >= limit) {
      throw new Error(
        `Product limit reached (${current}/${limit}). Upgrade your plan to add more products.`,
      );
    }
  }

  const db = await getDb();
  const now = Date.now();
  const doc: DbProduct = {
    ...data,
    organizationId: orgId,
    slug: data.slug || slugify(data.name),
    createdAt: now,
    updatedAt: now,
  };

  const result = await db.collection<DbProduct>("products").insertOne(doc as any);
  return { ...doc, _id: String(result.insertedId) };
}

export async function updateProduct(
  orgId: string,
  productId: string,
  data: Partial<DbProduct>,
) {
  const db = await getDb();
  const now = Date.now();
  const { _id, organizationId, createdAt, ...updateData } = data as any;

  if (updateData.name && !updateData.slug) {
    updateData.slug = slugify(updateData.name);
  }

  await db.collection<DbProduct>("products").updateOne(
    { _id: toId(productId), organizationId: orgId },
    { $set: { ...updateData, updatedAt: now } },
  );

  return getProductById(orgId, productId);
}

export async function deleteProduct(orgId: string, productId: string) {
  const db = await getDb();
  const result = await db
    .collection<DbProduct>("products")
    .deleteOne({ _id: toId(productId), organizationId: orgId });
  return result.deletedCount > 0;
}

// ─── COLLECTIONS ─────────────────────────────────────────────────────────────

export async function listCollections(orgId: string, includeInactive = false) {
  const db = await getDb();
  const query: Record<string, any> = { organizationId: orgId };
  if (!includeInactive) query.active = true;

  const collections = await db
    .collection<DbCollection>("collections")
    .find(query)
    .sort({ sortOrder: 1, createdAt: -1 })
    .toArray();

  return collections.map((c) => ({ ...c, _id: String(c._id) }));
}

export async function createCollection(
  orgId: string,
  data: Omit<DbCollection, "_id" | "organizationId" | "createdAt" | "updatedAt">,
) {
  const db = await getDb();
  const now = Date.now();
  const count = await db
    .collection<DbCollection>("collections")
    .countDocuments({ organizationId: orgId });

  const doc: DbCollection = {
    ...data,
    organizationId: orgId,
    slug: data.slug || slugify(data.name),
    sortOrder: data.sortOrder ?? count,
    createdAt: now,
    updatedAt: now,
  };

  const result = await db.collection<DbCollection>("collections").insertOne(doc as any);
  return { ...doc, _id: String(result.insertedId) };
}

export async function updateCollection(
  orgId: string,
  collectionId: string,
  data: Partial<DbCollection>,
) {
  const db = await getDb();
  const now = Date.now();
  const { _id, organizationId, createdAt, ...updateData } = data as any;

  await db.collection<DbCollection>("collections").updateOne(
    { _id: toId(collectionId), organizationId: orgId },
    { $set: { ...updateData, updatedAt: now } },
  );

  const updated = await db.collection<DbCollection>("collections").findOne({
    _id: toId(collectionId),
    organizationId: orgId,
  });
  return updated ? { ...updated, _id: String(updated._id) } : null;
}

export async function deleteCollection(orgId: string, collectionId: string) {
  const db = await getDb();
  const result = await db
    .collection<DbCollection>("collections")
    .deleteOne({ _id: toId(collectionId), organizationId: orgId });
  return result.deletedCount > 0;
}

// ─── ORDERS ──────────────────────────────────────────────────────────────────

function generateOrderNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `ORD-${ts}${rand}`;
}

export async function listOrders(
  orgId: string,
  options: {
    status?: DbOrder["status"];
    paymentStatus?: DbOrder["paymentStatus"];
    limit?: number;
    skip?: number;
  } = {},
) {
  const db = await getDb();
  const query: Record<string, any> = { organizationId: orgId };
  if (options.status) query.status = options.status;
  if (options.paymentStatus) query.paymentStatus = options.paymentStatus;

  const orders = await db
    .collection<DbOrder>("orders")
    .find(query)
    .sort({ createdAt: -1 })
    .skip(options.skip ?? 0)
    .limit(options.limit ?? 100)
    .toArray();

  return orders.map((o) => ({ ...o, _id: String(o._id) }));
}

export async function getOrderById(orgId: string, orderId: string) {
  const db = await getDb();
  const order = await db.collection<DbOrder>("orders").findOne({
    _id: toId(orderId),
    organizationId: orgId,
  });
  if (!order) return null;
  return { ...order, _id: String(order._id) };
}

export async function createOrder(
  orgId: string,
  data: Omit<DbOrder, "_id" | "organizationId" | "orderNumber" | "createdAt" | "updatedAt">,
) {
  const db = await getDb();
  const now = Date.now();
  const doc: DbOrder = {
    ...data,
    organizationId: orgId,
    orderNumber: generateOrderNumber(),
    createdAt: now,
    updatedAt: now,
  };

  const result = await db.collection<DbOrder>("orders").insertOne(doc as any);
  return { ...doc, _id: String(result.insertedId) };
}

export async function updateOrderStatus(
  orgId: string,
  orderId: string,
  status: DbOrder["status"],
  paymentStatus?: DbOrder["paymentStatus"],
  extra?: Partial<Pick<DbOrder, "courierName" | "trackingNumber" | "proofImageUrl">>,
) {
  const db = await getDb();
  const set: Record<string, any> = { status, updatedAt: Date.now() };
  if (paymentStatus) set.paymentStatus = paymentStatus;
  if (extra) Object.assign(set, extra);

  await db.collection<DbOrder>("orders").updateOne(
    { _id: toId(orderId), organizationId: orgId },
    { $set: set },
  );

  return getOrderById(orgId, orderId);
}

export async function getOrderStats(orgId: string) {
  const db = await getDb();
  const pipeline = [
    { $match: { organizationId: orgId } },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        revenue: { $sum: "$totalMinor" },
      },
    },
  ];
  const results = await db.collection<DbOrder>("orders").aggregate(pipeline).toArray();

  const stats: Record<string, { count: number; revenue: number }> = {};
  for (const r of results) {
    stats[r._id as string] = { count: r.count, revenue: r.revenue };
  }

  const totalRevenue = results.reduce((acc, r) => acc + r.revenue, 0);
  const totalOrders = results.reduce((acc, r) => acc + r.count, 0);

  return { byStatus: stats, totalRevenue, totalOrders };
}

// ─── SHIPPING ZONES ───────────────────────────────────────────────────────────

export async function listShippingZones(orgId: string) {
  const db = await getDb();
  const zones = await db
    .collection<DbShippingZone>("shippingZones")
    .find({ organizationId: orgId, active: true })
    .sort({ createdAt: -1 })
    .toArray();
  return zones.map((z) => ({ ...z, _id: String(z._id) }));
}

export async function createShippingZone(
  orgId: string,
  data: Omit<DbShippingZone, "_id" | "organizationId" | "createdAt">,
) {
  const db = await getDb();
  const doc: DbShippingZone = {
    ...data,
    organizationId: orgId,
    createdAt: Date.now(),
  };
  const result = await db.collection<DbShippingZone>("shippingZones").insertOne(doc as any);
  return { ...doc, _id: String(result.insertedId) };
}

export async function updateShippingZone(
  orgId: string,
  zoneId: string,
  data: Partial<DbShippingZone>,
) {
  const db = await getDb();
  await db.collection<DbShippingZone>("shippingZones").updateOne(
    { _id: toId(zoneId), organizationId: orgId },
    { $set: data },
  );
  const updated = await db.collection<DbShippingZone>("shippingZones").findOne({
    _id: toId(zoneId),
    organizationId: orgId,
  });
  return updated ? { ...updated, _id: String(updated._id) } : null;
}
