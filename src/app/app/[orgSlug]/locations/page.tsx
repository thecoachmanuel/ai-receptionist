import { LocationsScreen } from "@/components/dashboard/locations-screen";
import { BusinessModelGuard } from "@/components/dashboard/business-model-guard";

export default function LocationsPage() {
  return (
    <BusinessModelGuard segment="locations">
      <LocationsScreen />
    </BusinessModelGuard>
  );
}
