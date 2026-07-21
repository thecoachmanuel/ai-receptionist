import { NextResponse } from "next/server";
import { updateOrgPlanFromPaystack, verifyPaystackSignature } from "@/lib/paystack";

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
        customer: { customer_code?: string };
        metadata?: { orgId?: string; planId?: "free_org" | "engage" | "voice" };
      };
    };

    if (event.event === "charge.success") {
      const { metadata, reference, amount, currency, paid_at, customer } = event.data;

      if (metadata?.orgId && metadata?.planId) {
        await updateOrgPlanFromPaystack(metadata.orgId, metadata.planId, {
          reference,
          amount,
          currency,
          paidAt: paid_at,
          customerCode: customer.customer_code,
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Paystack webhook error", error);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}
