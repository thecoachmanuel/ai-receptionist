import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getStorefrontData } from "@/lib/services/commerce";
import { CartProvider } from "@/components/storefront/cart-context";
import { StorefrontShell } from "@/components/storefront/storefront-shell";
import { ShopCatalogView } from "@/components/storefront/shop-catalog-view";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ siteSlug: string }>;
}): Promise<Metadata> {
  const { siteSlug } = await params;
  const data = await getStorefrontData(siteSlug);
  if (!data) return { title: "Store not found" };

  return {
    title: `Shop · ${data.organization.name}`,
    description: `Browse all products and shop online from ${data.organization.name}. Direct WhatsApp checkout available.`,
  };
}

export default async function ShopPage({
  params,
}: {
  params: Promise<{ siteSlug: string }>;
}) {
  const { siteSlug } = await params;
  const data = await getStorefrontData(siteSlug);

  if (!data) {
    notFound();
  }

  const { organization, siteConfig, products, collections, shippingZones, bankDetails } =
    data;

  // If organization is strictly services-only and has no products, redirect to primary site
  if (organization.businessModel === "services" && products.length === 0) {
    redirect(`/${siteSlug}`);
  }

  return (
    <CartProvider siteSlug={siteSlug}>
      <StorefrontShell
        siteSlug={siteSlug}
        storeName={organization.name}
        logoUrl={siteConfig?.logoUrl}
        currency={organization.currency}
        shippingZones={shippingZones as any}
        bankDetails={bankDetails}
        businessModel={organization.businessModel as any}
        whatsappPhone={organization.whatsappInstance?.phone || siteConfig?.contact?.whatsapp}
      >
        <ShopCatalogView
          siteSlug={siteSlug}
          products={products as any}
          collections={collections as any}
          currency={organization.currency}
        />
      </StorefrontShell>
    </CartProvider>
  );
}
