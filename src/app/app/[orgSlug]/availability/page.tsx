import { AvailabilityScreen } from "@/components/dashboard/availability-screen";
import { BusinessModelGuard } from "@/components/dashboard/business-model-guard";

export default function AvailabilityPage() {
  return (
    <BusinessModelGuard segment="availability">
      <AvailabilityScreen />
    </BusinessModelGuard>
  );
}
