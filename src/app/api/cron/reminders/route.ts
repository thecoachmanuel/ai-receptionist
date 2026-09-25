import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/mongodb";
import type { DbBooking } from "@/lib/db/types";
import { sendAutomatedWhatsAppNotification } from "@/lib/services/whatsapp";

/**
 * Automated Cron endpoint for dispatching upcoming booking reminders
 * via Free WhatsApp without paid Meta APIs.
 *
 * Can be triggered periodically (e.g. hourly or every 15 minutes).
 */
export async function GET(request: Request) {
  try {
    const db = await getDb();
    const now = Date.now();

    // Look for appointments happening in the next 24 hours
    const windowStart = now;
    const windowEnd = now + 24 * 60 * 60 * 1000;

    const upcomingBookings = await db
      .collection<DbBooking>("bookings")
      .find({
        status: "confirmed",
        startAt: { $gte: windowStart, $lte: windowEnd },
        "customerSnapshot.phone": { $exists: true, $ne: "" },
        "whatsappStatus.reminderSentAt": { $exists: false },
      })
      .limit(50)
      .toArray();

    const results: Array<{ bookingId: string; success: boolean; message: string }> = [];

    for (const booking of upcomingBookings) {
      try {
        const res = await sendAutomatedWhatsAppNotification({
          orgId: booking.organizationId,
          bookingId: booking._id!.toString(),
          type: "reminder",
        });
        results.push({
          bookingId: booking._id!.toString(),
          success: res.success,
          message: res.message,
        });
      } catch (err) {
        results.push({
          bookingId: booking._id!.toString(),
          success: false,
          message: err instanceof Error ? err.message : "Failed to dispatch reminder",
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      details: results,
      timestamp: now,
    });
  } catch (error) {
    console.error("Cron reminders error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 },
    );
  }
}

export const POST = GET;
