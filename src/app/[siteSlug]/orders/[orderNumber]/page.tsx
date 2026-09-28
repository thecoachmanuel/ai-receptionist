import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getStorefrontData, getOrderByNumber } from "@/lib/services/commerce";
import { CartProvider } from "@/components/storefront/cart-context";
import { StorefrontShell } from "@/components/storefront/storefront-shell";
import { OrderTrackingView } from "@/components/storefront/order-tracking-view";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ siteSlug: string; orderNumber: string }>;
}): Promise<Metadata> {
  const { orderNumber } = await params;
  return {
    title: `Order ${orderNumber} Status`,
    robots: { index: false, follow: false },
  };
}

export default async function OrderTrackingPage({
  params,
}: {
  params: Promise<{ siteSlug: string; orderNumber: string }>;
}) {
  const { siteSlug, orderNumber } = await params;
  const [data, order] = await Promise.all([
    getStorefrontData(siteSlug),
    getOrderByNumber(orderNumber, siteSlug),
  ]);

  if (!data || !order) {
    notFound();
  }

  const { organization, siteConfig, shippingZones, bankDetails } = data;

  return (
    <CartProvider siteSlug={siteSlug}>
      <StorefrontShell
        siteSlug={siteSlug}
        storeName={organization.name}
        logoUrl={siteConfig?.logoUrl}
        currency={organization.currency}
        shippingZones={shippingZones as any}
        bankDetails={bankDetails}
        whatsappPhone={
          organization.whatsappInstance?.phone || siteConfig?.contact?.whatsapp
        }
      >
        <OrderTrackingView
          siteSlug={siteSlug}
          storeName={organization.name}
          order={order as any}
          bankDetails={bankDetails}
          whatsappPhone={
            organization.whatsappInstance?.phone || siteConfig?.contact?.whatsapp
          }
        />
      </StorefrontShell>
    </CartProvider>
  );
}
