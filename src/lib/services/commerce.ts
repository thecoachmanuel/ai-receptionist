import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db/mongodb";
import type { DbProduct, DbCollection, DbOrder, DbShippingZone, DbPromoCode, DbProductReview } from "@/lib/db/types";
import { getEffectiveProductLimit, isFeatureActive } from "@/lib/services/commerce-quota";
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

export async function deleteShippingZone(orgId: string, zoneId: string) {
  const db = await getDb();
  const res = await db.collection<DbShippingZone>("shippingZones").deleteOne({
    _id: toId(zoneId),
    organizationId: orgId,
  });
  return res.deletedCount > 0;
}

// ─── PUBLIC STOREFRONT HELPERS ────────────────────────────────────────────────

export async function getStorefrontData(siteSlug: string) {
  const { getPublishedBySlug } = await import("@/lib/services/publicSite");
  const published = await getPublishedBySlug(siteSlug);
  if (!published) return null;

  const org = published.organization;
  const orgId = String(org._id || org.clerkOrgId);

  const [products, collections, shippingZones] = await Promise.all([
    listProducts(orgId, { includeInactive: false, limit: 100 }),
    listCollections(orgId, false),
    listShippingZones(orgId),
  ]);

  const siteConfig = (published.site as any)?.published || (published.site as any)?.draft;
  const deposit = siteConfig?.booking?.deposit;
  const bankDetails =
    deposit?.bankName && deposit?.accountNumber
      ? {
          bankName: deposit.bankName,
          accountNumber: deposit.accountNumber,
          accountName: deposit.accountName || org.name,
          instructions: deposit.instructions,
        }
      : null;

  return {
    organization: {
      _id: orgId,
      name: org.name,
      slug: org.slug || siteSlug,
      currency: org.currency || "NGN",
      businessModel: (org as any).businessModel || "ecommerce",
      featureOverrides: (org as any).featureOverrides || {},
      whatsappInstance: (org as any).whatsappInstance,
    },
    siteConfig,
    products,
    collections,
    shippingZones,
    bankDetails,
  };
}

export async function getOrderByNumber(orderNumber: string, orgIdOrSlug?: string) {
  const db = await getDb();
  const query: Record<string, any> = { orderNumber: orderNumber.trim().toUpperCase() };
  if (orgIdOrSlug) {
    const org = await getOrganizationByIdOrSlug(orgIdOrSlug);
    if (org) {
      query.organizationId = String(org._id || org.clerkOrgId);
    }
  }

  const order = await db.collection<DbOrder>("orders").findOne(query);
  if (!order) return null;
  return { ...order, _id: String(order._id) };
}

export async function createStorefrontOrder(
  siteSlug: string,
  orderData: Omit<DbOrder, "_id" | "organizationId" | "orderNumber" | "createdAt" | "updatedAt">,
) {
  const { getPublishedBySlug } = await import("@/lib/services/publicSite");
  const published = await getPublishedBySlug(siteSlug);
  if (!published) throw new Error("Storefront not found");

  const org = published.organization;
  const orgId = String(org._id || org.clerkOrgId);

  const order = await createOrder(orgId, orderData);
  return { order, organization: org };
}

// ─── PROMO CODES ─────────────────────────────────────────────────────────────

export async function listPromoCodes(orgId: string) {
  const db = await getDb();
  const codes = await db
    .collection<DbPromoCode>("promoCodes")
    .find({ organizationId: orgId })
    .sort({ createdAt: -1 })
    .toArray();
  return codes.map((c) => ({ ...c, _id: String(c._id) }));
}

export async function createPromoCode(
  orgId: string,
  data: Omit<DbPromoCode, "_id" | "organizationId" | "usedCount" | "createdAt" | "updatedAt">,
) {
  const db = await getDb();
  const now = Date.now();
  const doc: DbPromoCode = {
    ...data,
    code: data.code.trim().toUpperCase(),
    organizationId: orgId,
    usedCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  const result = await db.collection<DbPromoCode>("promoCodes").insertOne(doc as any);
  return { ...doc, _id: String(result.insertedId) };
}

export async function deletePromoCode(orgId: string, promoId: string) {
  const db = await getDb();
  const res = await db.collection<DbPromoCode>("promoCodes").deleteOne({
    _id: toId(promoId),
    organizationId: orgId,
  });
  return res.deletedCount > 0;
}

export async function validatePromoCode(
  siteSlug: string,
  code: string,
  subtotalMinor: number,
): Promise<{ valid: boolean; discountMinor: number; error?: string; promoCode?: string }> {
  const { getPublishedBySlug } = await import("@/lib/services/publicSite");
  const published = await getPublishedBySlug(siteSlug);
  if (!published) return { valid: false, discountMinor: 0, error: "Store not found" };

  const org = published.organization;
  const orgId = String(org._id || org.clerkOrgId);

  // Check feature permission
  if (!isFeatureActive(org as any, "promoCodes")) {
    return { valid: false, discountMinor: 0, error: "Promo codes are not active on this store." };
  }

  const cleanCode = code.trim().toUpperCase();
  const db = await getDb();
  const promo = await db.collection<DbPromoCode>("promoCodes").findOne({
    organizationId: orgId,
    code: cleanCode,
    active: true,
  });

  if (!promo) {
    return { valid: false, discountMinor: 0, error: "Invalid promo code" };
  }

  if (promo.expiresAt && promo.expiresAt < Date.now()) {
    return { valid: false, discountMinor: 0, error: "This promo code has expired" };
  }

  if (promo.maxUses && promo.usedCount >= promo.maxUses) {
    return { valid: false, discountMinor: 0, error: "Promo code usage limit reached" };
  }

  if (promo.minSpendMinor && subtotalMinor < promo.minSpendMinor) {
    const minMajor = promo.minSpendMinor / 100;
    return {
      valid: false,
      discountMinor: 0,
      error: `Minimum order amount of ₦${minMajor.toLocaleString()} required for this code`,
    };
  }

  let discountMinor = 0;
  if (promo.discountType === "percentage") {
    discountMinor = Math.round((subtotalMinor * promo.discountValue) / 100);
  } else {
    discountMinor = Math.min(subtotalMinor, promo.discountValue);
  }

  return {
    valid: true,
    discountMinor,
    promoCode: promo.code,
  };
}

// ─── REVIEWS & RATINGS ───────────────────────────────────────────────────────

export async function listProductReviews(siteSlug: string, productId: string) {
  const { getPublishedBySlug } = await import("@/lib/services/publicSite");
  const published = await getPublishedBySlug(siteSlug);
  if (!published) return { reviews: [], averageRating: 5, totalReviews: 0 };

  const org = published.organization;
  const orgId = String(org._id || org.clerkOrgId);

  const db = await getDb();
  const reviews = await db
    .collection<DbProductReview>("productReviews")
    .find({ organizationId: orgId, productId, active: true })
    .sort({ createdAt: -1 })
    .toArray();

  const totalReviews = reviews.length;
  const averageRating =
    totalReviews > 0
      ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1))
      : 5;

  return {
    reviews: reviews.map((r) => ({ ...r, _id: String(r._id) })),
    averageRating,
    totalReviews,
  };
}

export async function createProductReview(
  siteSlug: string,
  data: {
    productId: string;
    customerName: string;
    rating: number;
    title?: string;
    comment: string;
  },
) {
  const { getPublishedBySlug } = await import("@/lib/services/publicSite");
  const published = await getPublishedBySlug(siteSlug);
  if (!published) throw new Error("Store not found");

  const org = published.organization;
  const orgId = String(org._id || org.clerkOrgId);

  if (!isFeatureActive(org as any, "customerReviews")) {
    throw new Error("Customer reviews are currently disabled on this store");
  }

  const db = await getDb();
  const doc: DbProductReview = {
    organizationId: orgId,
    productId: data.productId,
    customerName: data.customerName.trim() || "Verified Shopper",
    rating: Math.min(5, Math.max(1, Math.round(data.rating))),
    title: data.title?.trim(),
    comment: data.comment.trim(),
    verifiedPurchase: true,
    active: true,
    createdAt: Date.now(),
  };

  const result = await db.collection<DbProductReview>("productReviews").insertOne(doc as any);
  return { ...doc, _id: String(result.insertedId) };
}


