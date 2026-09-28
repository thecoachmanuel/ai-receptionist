import { OfferingsScreen } from "@/components/dashboard/offerings-screen";
import { BusinessModelGuard } from "@/components/dashboard/business-model-guard";

export default function OfferingsPage() {
  return (
    <BusinessModelGuard segment="offerings">
      <OfferingsScreen />
    </BusinessModelGuard>
  );
}
