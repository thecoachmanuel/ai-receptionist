import { getDb } from "@/lib/db/mongodb";
import type { DbOrganization, PlanType } from "@/lib/db/types";
import { ObjectId } from "mongodb";

export type OneboardFeature =
  | "operations_hub"
  | "custom_public_page"
  | "web_agent"
  | "browser_voice"
  | "advanced_analytics";

export type SwitchboardFeature = OneboardFeature;

export const PLAN_FEATURES: Record<PlanType, OneboardFeature[]> = {
  free_org: ["operations_hub", "custom_public_page"],
  engage: ["operations_hub", "custom_public_page", "web_agent"],
  voice: [
    "operations_hub",
    "custom_public_page",
    "web_agent",
    "browser_voice",
    "advanced_analytics",
  ],
};

export const PLAN_NAMES: Record<PlanType, string> = {
  free_org: "Core",
  engage: "Engage",
  voice: "Voice",
};

export async function organizationHasFeature(
  orgIdOrClerkId: string,
  feature: OneboardFeature,
): Promise<boolean> {
  try {
    const db = await getDb();
    let org: DbOrganization | null = null;

    if (ObjectId.isValid(orgIdOrClerkId)) {
      org = (await db
        .collection<DbOrganization>("organizations")
        .findOne({ _id: new ObjectId(orgIdOrClerkId) })) as DbOrganization | null;
    }

    if (!org) {
      org = (await db
        .collection<DbOrganization>("organizations")
        .findOne({ clerkOrgId: orgIdOrClerkId })) as DbOrganization | null;
    }

    if (!org) return false;

    const plan: PlanType = org.plan || "free_org";
    const features = PLAN_FEATURES[plan] || PLAN_FEATURES.free_org;
    return features.includes(feature);
  } catch (error) {
    console.error("Error checking organization feature entitlement", {
      orgIdOrClerkId,
      feature,
      error,
    });
    return false;
  }
}
