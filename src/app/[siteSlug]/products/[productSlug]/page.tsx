import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getStorefrontData } from "@/lib/services/commerce";
import { CartProvider } from "@/components/storefront/cart-context";
import { StorefrontShell } from "@/components/storefront/storefront-shell";
import { ProductDetailView } from "@/components/storefront/product-detail-view";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ siteSlug: string; productSlug: string }>;
}): Promise<Metadata> {
  const { siteSlug, productSlug } = await params;
  const data = await getStorefrontData(siteSlug);
  if (!data) return { title: "Product not found" };

  const product = data.products.find(
    (p: any) => p.slug === productSlug || p._id === productSlug,
  );
  if (!product) return { title: "Product not found" };

  return {
    title: `${product.name} · ${data.organization.name}`,
    description:
      product.description?.slice(0, 160) ||
      `Buy ${product.name} online from ${data.organization.name}.`,
    openGraph: {
      title: product.name,
      images: product.images?.[0] ? [product.images[0]] : undefined,
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ siteSlug: string; productSlug: string }>;
}) {
  const { siteSlug, productSlug } = await params;
  const data = await getStorefrontData(siteSlug);

  if (!data) {
    notFound();
  }

  const { organization, siteConfig, products, shippingZones, bankDetails } = data;

  const product = products.find(
    (p: any) => p.slug === productSlug || p._id === productSlug,
  );

  if (!product) {
    notFound();
  }

  const relatedProducts = products
    .filter((p: any) => p._id !== product._id)
    .slice(0, 4);

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
        <ProductDetailView
          siteSlug={siteSlug}
          storeName={organization.name}
          product={product as any}
          relatedProducts={relatedProducts as any}
          currency={organization.currency}
          whatsappPhone={
            organization.whatsappInstance?.phone || siteConfig?.contact?.whatsapp
          }
        />
      </StorefrontShell>
    </CartProvider>
  );
}
