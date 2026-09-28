import { CollectionsScreen } from "@/components/dashboard/collections-screen";
import { BusinessModelGuard } from "@/components/dashboard/business-model-guard";

export default function CollectionsPage() {
  return (
    <BusinessModelGuard segment="collections">
      <CollectionsScreen />
    </BusinessModelGuard>
  );
}
