import { OrdersScreen } from "@/components/dashboard/orders-screen";
import { BusinessModelGuard } from "@/components/dashboard/business-model-guard";

export default function OrdersPage() {
  return (
    <BusinessModelGuard segment="orders">
      <OrdersScreen />
    </BusinessModelGuard>
  );
}
