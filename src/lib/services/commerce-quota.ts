import { getDb } from "@/lib/db/mongodb";
import type { DbOrganization } from "@/lib/db/types";
import { getSystemSettings } from "@/lib/services/system-settings";
import { ObjectId } from "mongodb";

export type FeatureKey =
  | "whatsappCheckout"
  | "whatsappAlerts"
  | "bankTransfer"
  | "aiShoppingAssistant"
  | "customerReviews"
  | "abandonedCartRecovery"
  | "storefrontActive"
  | "promoCodes";

const DEFAULT_PLAN_FEATURE_MATRIX: Record<string, Record<FeatureKey, boolean>> = {
  free_org: {
    whatsappCheckout: true,        // Included in Base Plan!
    whatsappAlerts: true,          // Included in Base Plan!
    bankTransfer: true,
    aiShoppingAssistant: false,
    customerReviews: false,
    abandonedCartRecovery: false,
    storefrontActive: true,
    promoCodes: false,
  },
  engage: {
    whatsappCheckout: true,
    whatsappAlerts: true,
    bankTransfer: true,
    aiShoppingAssistant: false,
    customerReviews: false,
    abandonedCartRecovery: false,
    storefrontActive: true,
    promoCodes: true,
  },
  voice: {
    whatsappCheckout: true,
    whatsappAlerts: true,
    bankTransfer: true,
    aiShoppingAssistant: true,
    customerReviews: true,
    abandonedCartRecovery: true,
    storefrontActive: true,
    promoCodes: true,
  },
};

/**
 * Checks if a specific feature is active for an organization.
 * Precedence:
 * 1. Explicit per-store override set by Super Admin (e.g. kill-switch)
 * 2. Organization plan tier defaults
 */
export function isFeatureActive(
  org: DbOrganization,
  featureKey: FeatureKey
): boolean {
  // 1. Explicit Super Admin override on this store
  if (org.featureOverrides && typeof org.featureOverrides[featureKey] === "boolean") {
    return org.featureOverrides[featureKey]!;
  }

  // 2. Plan tier default
  const plan = org.plan || "free_org";
  const matrix = DEFAULT_PLAN_FEATURE_MATRIX[plan] || DEFAULT_PLAN_FEATURE_MATRIX.free_org;
  return matrix[featureKey] ?? false;
}

/**
 * Determines the effective product limit for an organization.
 * Returns -1 for unlimited, or a positive integer limit.
 */
export async function getEffectiveProductLimit(org: DbOrganization): Promise<{
  limit: number;
  isCustomOverride: boolean;
  source: "per_store_override" | "plan_tier_default";
}> {
  // 1. Explicit Super Admin custom limit override
  if (typeof org.customProductLimit === "number") {
    return {
      limit: org.customProductLimit,
      isCustomOverride: true,
      source: "per_store_override",
    };
  }

  // 2. Global plan tier limits from system settings
  const settings = await getSystemSettings();
  const limits = settings.ecommercePlanLimits || {
    base: 15,
    starter: 50,
    pro: 250,
    scale: -1,
  };

  const plan = org.plan || "free_org";
  let limit = limits.base;
  if (plan === "engage") limit = limits.starter;
  else if (plan === "voice") limit = limits.pro;

  return {
    limit,
    isCustomOverride: false,
    source: "plan_tier_default",
  };
}

/**
 * Validates whether an organization can add more products.
 */
export async function checkCanAddProduct(orgId: string): Promise<{
  allowed: boolean;
  currentCount: number;
  limit: number;
}> {
  const db = await getDb();
  const orgFilter = {
    $or: [
      ...(orgId.length === 24 ? [{ _id: new ObjectId(orgId) }] : []),
      { clerkOrgId: orgId },
      { slug: orgId },
    ],
  };

  const org = await db.collection<DbOrganization>("organizations").findOne(orgFilter);
  if (!org) {
    return { allowed: false, currentCount: 0, limit: 0 };
  }

  const { limit } = await getEffectiveProductLimit(org);

  // If unlimited (-1), immediately allow
  if (limit === -1) {
    const currentCount = await db.collection("products").countDocuments({
      organizationId: orgId,
      active: true,
    });
    return { allowed: true, currentCount, limit: -1 };
  }

  const currentCount = await db.collection("products").countDocuments({
    organizationId: orgId,
    active: true,
  });

  return {
    allowed: currentCount < limit,
    currentCount,
    limit,
  };
}
