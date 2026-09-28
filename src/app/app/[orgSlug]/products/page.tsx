import { ProductsScreen } from "@/components/dashboard/products-screen";
import { BusinessModelGuard } from "@/components/dashboard/business-model-guard";

export default function ProductsPage() {
  return (
    <BusinessModelGuard segment="products">
      <ProductsScreen />
    </BusinessModelGuard>
  );
}
