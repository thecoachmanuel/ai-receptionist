import { NextResponse } from "next/server";
import { updateOrgPlanFromPaystack, verifyPaystackSignature } from "@/lib/paystack";
import { sendSaasSubscriptionRenewedAlert } from "@/lib/services/saas-whatsapp";
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
        channel?: string;
        subscription_code?: string;
        plan?: { plan_code?: string };
        customer: { email?: string; customer_code?: string };
        metadata?: {
          orgId?: string;
          planId?: "free_org" | "engage" | "voice";
          billingCycle?: BillingCycle;
          planCode?: string;
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
      const { metadata, reference, amount, currency, paid_at, customer, authorization, channel } =
        event.data;

      let targetOrgId = metadata?.orgId;
      let targetPlanId = metadata?.planId;
      let billingCycle: BillingCycle = metadata?.billingCycle === "yearly" ? "yearly" : "monthly";

      // If orgId wasn't in metadata (common in automatic Paystack plan renewals),
      // look up the org by subscription code, customer code, or customer email
      if (!targetOrgId && (event.data.subscription_code || customer?.email || customer?.customer_code)) {
        const { getDb } = await import("@/lib/db/mongodb");
        const db = await getDb();
        const queryOr: Record<string, unknown>[] = [];
        if (event.data.subscription_code) queryOr.push({ "paystack.subscriptionCode": event.data.subscription_code });
        if (customer?.customer_code) queryOr.push({ "paystack.customerCode": customer.customer_code });
        if (customer?.email) queryOr.push({ "paystack.customerEmail": customer.email });

        if (queryOr.length > 0) {
          const foundOrg = await db.collection("organizations").findOne({ $or: queryOr });
          if (foundOrg) {
            targetOrgId = foundOrg._id.toString();
            targetPlanId = (foundOrg.plan as any) || "free_org";
            billingCycle = foundOrg.billingCycle || "monthly";
          }
        }
      }

      if (targetOrgId && targetPlanId) {
        await updateOrgPlanFromPaystack(
          targetOrgId,
          targetPlanId,
          {
            reference,
            amount,
            currency,
            paidAt: paid_at,
            customerCode: customer?.customer_code,
            customerEmail: customer?.email,
            paymentMethod: channel || (authorization?.authorization_code ? "card" : "bank_transfer"),
            planCode: event.data.plan?.plan_code || metadata?.planCode,
            subscriptionCode: event.data.subscription_code,
            // Store authorization code for future auto-charges
            authorizationCode: authorization?.authorization_code,
            cardBrand: authorization?.brand,
            cardLast4: authorization?.last4,
            reusable: authorization?.reusable,
          },
          billingCycle,
        );

        const planName =
          targetPlanId === "voice"
            ? "Voice Agent"
            : targetPlanId === "engage"
              ? "Engage"
              : "Core Receptionist";
        const durationDays = billingCycle === "yearly" ? 365 : 30;
        const expiryDateStr = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toLocaleDateString("en-NG", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });

        void sendSaasSubscriptionRenewedAlert({
          orgId: targetOrgId,
          planName,
          expiryDateStr,
        }).catch((err) => console.error("Webhook renewal WhatsApp notification error:", err));
      }
    } else if (event.event === "invoice.update" && (event.data as any)?.status === "success") {
      const invData = event.data as any;
      const subCode = invData.subscription?.subscription_code || invData.subscription_code;
      const customerEmail = invData.customer?.email;

      if (subCode || customerEmail) {
        const { getDb } = await import("@/lib/db/mongodb");
        const db = await getDb();
        const queryOr: Record<string, unknown>[] = [];
        if (subCode) queryOr.push({ "paystack.subscriptionCode": subCode });
        if (customerEmail) queryOr.push({ "paystack.customerEmail": customerEmail });

        const org = await db.collection("organizations").findOne({ $or: queryOr });
        if (org) {
          const billingCycle: BillingCycle = org.billingCycle || "monthly";
          const durationDays = billingCycle === "yearly" ? 365 : 30;
          const newExpiry = Date.now() + durationDays * 24 * 60 * 60 * 1000;

          await db.collection("organizations").updateOne(
            { _id: org._id },
            {
              $set: {
                planStatus: "active",
                subscriptionExpiresAt: newExpiry,
                "paystack.lastPaymentDate": Date.now(),
                "paystack.nextBillingDate": newExpiry,
                updatedAt: Date.now(),
              },
            },
          );
        }
      }
    } else if (
      event.event === "subscription.disable" ||
      event.event === "invoice.payment_failed"
    ) {
      const orgId = event.data?.metadata?.orgId;
      const subCode = (event.data as any)?.subscription_code;
      const customerEmail = event.data?.customer?.email;

      const { getDb } = await import("@/lib/db/mongodb");
      const { ObjectId } = await import("mongodb");
      const db = await getDb();

      let filter: Record<string, unknown> | null = null;
      if (orgId) {
        filter = ObjectId.isValid(orgId) ? { _id: new ObjectId(orgId) } : { clerkOrgId: orgId };
      } else if (subCode) {
        filter = { "paystack.subscriptionCode": subCode };
      } else if (customerEmail) {
        filter = { "paystack.customerEmail": customerEmail };
      }

      if (filter) {
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
