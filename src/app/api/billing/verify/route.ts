import { NextResponse } from "next/server";
import { updateOrgPlanFromPaystack, verifyPaystackTransaction } from "@/lib/paystack";
import { sendSaasSubscriptionRenewedAlert } from "@/lib/services/saas-whatsapp";
import type { BillingCycle } from "@/lib/db/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const reference = searchParams.get("reference") || searchParams.get("trxref");
  const orgSlug = searchParams.get("orgSlug");

  if (!reference) {
    return NextResponse.redirect(new URL("/app", request.url));
  }

  try {
    const data = await verifyPaystackTransaction(reference);

    if (data.status === "success" && data.metadata?.orgId && data.metadata?.planId) {
      const billingCycle: BillingCycle =
        data.metadata.billingCycle === "yearly" ? "yearly" : "monthly";

      await updateOrgPlanFromPaystack(
        data.metadata.orgId,
        data.metadata.planId,
        {
          reference: data.reference,
          amount: data.amount,
          currency: data.currency,
          paidAt: data.paid_at,
          customerCode: data.customer.customer_code,
          authorizationCode: data.authorization?.authorization_code,
          cardBrand: data.authorization?.brand,
          cardLast4: data.authorization?.last4,
          reusable: data.authorization?.reusable,
        },
        billingCycle,
      );

      const planName =
        data.metadata.planId === "voice"
          ? "Voice Agent"
          : data.metadata.planId === "engage"
            ? "Engage"
            : "Core Receptionist";
      const durationDays = billingCycle === "yearly" ? 365 : 30;
      const expiryDateStr = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toLocaleDateString("en-NG", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });

      void sendSaasSubscriptionRenewedAlert({
        orgId: data.metadata.orgId,
        planName,
        expiryDateStr,
      }).catch((err) => console.error("Verify renewal WhatsApp notification error:", err));

      const targetSlug = orgSlug || data.metadata.orgId;
      return NextResponse.redirect(
        new URL(`/app/${targetSlug}/billing?success=true`, request.url),
      );
    }
  } catch (error) {
    console.error("Paystack verification error", error);
  }

  return NextResponse.redirect(new URL("/app", request.url));
}
