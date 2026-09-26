import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { initializePaystackTransaction } from "@/lib/paystack";
import type { BillingCycle } from "@/lib/db/types";

export async function POST(request: Request) {
  const session = await getSession();

  if (!session || !session.user || !session.organization) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (session.role !== "admin" && !session.permissions.includes("org:operations_hub:manage")) {
    return NextResponse.json(
      { error: "Only workspace administrators can change subscription plans." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    planId?: unknown;
    billingCycle?: unknown;
  };
  const planId = body.planId;
  const billingCycle: BillingCycle =
    body.billingCycle === "yearly" ? "yearly" : "monthly";

  if (planId !== "free_org" && planId !== "engage" && planId !== "voice") {
    return NextResponse.json(
      { error: "Invalid plan. Choose Core, Engage, or Voice." },
      { status: 400 },
    );
  }

  const origin = request.headers.get("origin") || request.headers.get("referer") || "";
  const callbackUrl = `${origin}/api/billing/verify?orgSlug=${session.organization.slug}`;

  try {
    const transaction = await initializePaystackTransaction({
      email: session.user.email,
      planId,
      orgId: session.organization.id,
      callbackUrl,
      billingCycle,
    });

    return NextResponse.json(transaction);
  } catch (error) {
    console.error("Paystack initialization error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Paystack checkout failed." },
      { status: 500 },
    );
  }
}
