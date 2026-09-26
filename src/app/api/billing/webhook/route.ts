import { NextResponse } from "next/server";
import { updateOrgPlanFromPaystack, verifyPaystackSignature } from "@/lib/paystack";
import type { BillingCycle } from "@/lib/db/types";

export async function POST(request: Request) {
  const signature = request.headers.get("x-paystack-signature");
  const rawBody = await request.text();

  if (!verifyPaystackSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid Paystack signature." }, { status: 400 });
  }

  try {
    const event = JSON.parse(rawBody) as {
      event: string;
      data: {
        reference: string;
        amount: number;
        currency: string;
        paid_at?: string;
        customer: { email?: string; customer_code?: string };
        metadata?: {
          orgId?: string;
          planId?: "free_org" | "engage" | "voice";
          billingCycle?: BillingCycle;
        };
        authorization?: {
          authorization_code?: string;
          reusable?: boolean;
          card_type?: string;
          last4?: string;
          brand?: string;
        };
      };
    };

    if (event.event === "charge.success") {
      const { metadata, reference, amount, currency, paid_at, customer, authorization } =
        event.data;

      if (metadata?.orgId && metadata?.planId) {
        const billingCycle: BillingCycle = metadata.billingCycle === "yearly" ? "yearly" : "monthly";

        await updateOrgPlanFromPaystack(
          metadata.orgId,
          metadata.planId,
          {
            reference,
            amount,
            currency,
            paidAt: paid_at,
            customerCode: customer?.customer_code,
            customerEmail: customer?.email,
            // Store authorization code for future auto-charges
            authorizationCode: authorization?.authorization_code,
            cardBrand: authorization?.brand,
            cardLast4: authorization?.last4,
            reusable: authorization?.reusable,
          },
          billingCycle,
        );
      }
    } else if (
      event.event === "subscription.disable" ||
      event.event === "invoice.payment_failed"
    ) {
      const orgId = event.data?.metadata?.orgId;
      if (orgId) {
        const { getDb } = await import("@/lib/db/mongodb");
        const { ObjectId } = await import("mongodb");
        const db = await getDb();
        const filter = ObjectId.isValid(orgId)
          ? { _id: new ObjectId(orgId) }
          : { clerkOrgId: orgId };
        await db.collection("organizations").updateOne(filter, {
          $set: {
            planStatus:
              event.event === "subscription.disable" ? "canceled" : "past_due",
            updatedAt: Date.now(),
          },
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Paystack webhook error", error);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}
