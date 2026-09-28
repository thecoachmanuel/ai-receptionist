import { BookingsScreen } from "@/components/dashboard/bookings-screen";
import { BusinessModelGuard } from "@/components/dashboard/business-model-guard";

export default function BookingsPage() {
  return (
    <BusinessModelGuard segment="bookings">
      <BookingsScreen />
    </BusinessModelGuard>
  );
}
