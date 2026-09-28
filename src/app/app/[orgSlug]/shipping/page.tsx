import { ShippingScreen } from "@/components/dashboard/shipping-screen";
import { BusinessModelGuard } from "@/components/dashboard/business-model-guard";

export default function ShippingPage() {
  return (
    <BusinessModelGuard segment="shipping">
      <ShippingScreen />
    </BusinessModelGuard>
  );
}
