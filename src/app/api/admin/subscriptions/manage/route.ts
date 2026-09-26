import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { updateOrgSubscriptionManually } from "@/lib/paystack";
import type { PlanType } from "@/lib/db/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.isSuperAdmin) {
      return NextResponse.json(
        { error: "Unauthorized. Super-admin access required." },
        { status: 403 },
      );
    }

    const body = await request.json();
    const {
      orgId,
      plan,
      planStatus,
      durationMonths,
      customExpiresAt,
      channel,
      amount,
      manualNotes,
    } = body;

    if (!orgId || typeof orgId !== "string") {
      return NextResponse.json({ error: "Organization ID is required." }, { status: 400 });
    }

    if (plan !== "free_org" && plan !== "engage" && plan !== "voice") {
      return NextResponse.json({ error: "Invalid plan type specified." }, { status: 400 });
    }

    const validStatuses = ["active", "trialing", "canceled", "past_due", "expired", "unpaid"];
    if (planStatus && !validStatuses.includes(planStatus)) {
      return NextResponse.json({ error: "Invalid plan status." }, { status: 400 });
    }

    const result = await updateOrgSubscriptionManually({
      orgId,
      plan: plan as PlanType,
      planStatus: planStatus || "active",
      durationMonths: typeof durationMonths === "number" ? durationMonths : undefined,
      customExpiresAt: typeof customExpiresAt === "number" ? customExpiresAt : undefined,
      channel: channel || "bank_transfer",
      amount: typeof amount === "number" ? amount : undefined,
      manualNotes: typeof manualNotes === "string" ? manualNotes.trim() : undefined,
      adminEmail: session.user.email,
    });

    return NextResponse.json({
      message: "Organization subscription updated successfully.",
      ...result,
    });
  } catch (error) {
    console.error("Admin manage subscription error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update subscription." },
      { status: 500 },
    );
  }
}
