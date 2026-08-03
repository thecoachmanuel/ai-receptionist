import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db/mongodb";
import type { DbBooking, DbCalendarIntegration } from "@/lib/db/types";

export async function listCalendarIntegrations(orgId: string, teamMemberId?: string) {
  const db = await getDb();
  const filter: any = { organizationId: orgId, provider: "google" };
  if (teamMemberId) filter.teamMemberId = teamMemberId;

  const docs = await db.collection<DbCalendarIntegration>("calendarIntegrations").find(filter).toArray();
  return docs.map((d) => ({ ...d, _id: d._id!.toString() }));
}

export async function saveGoogleCalendarIntegration(
  orgId: string,
  teamMemberId: string,
  data: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    calendarId?: string;
  },
) {
  const db = await getDb();
  const now = Date.now();
  const filter = { organizationId: orgId, teamMemberId, provider: "google" as const };

  const update: DbCalendarIntegration = {
    organizationId: orgId,
    teamMemberId,
    provider: "google",
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    expiresAt: data.expiresAt,
    calendarId: data.calendarId || "primary",
    syncEnabled: true,
    createdAt: now,
    updatedAt: now,
  };

  await db.collection<DbCalendarIntegration>("calendarIntegrations").updateOne(
    filter,
    { $set: update },
    { upsert: true },
  );

  return true;
}

export async function removeGoogleCalendarIntegration(orgId: string, teamMemberId: string) {
  const db = await getDb();
  const res = await db.collection<DbCalendarIntegration>("calendarIntegrations").deleteOne({
    organizationId: orgId,
    teamMemberId,
    provider: "google",
  });
  return res.deletedCount > 0;
}

/**
 * Fetch external busy slots from connected Google Calendar for a team member
 */
export async function fetchBusySlotsFromExternalCalendars(
  orgId: string,
  teamMemberId: string,
  startAt: number,
  endAt: number,
): Promise<Array<{ startAt: number; endAt: number }>> {
  const integrations = await listCalendarIntegrations(orgId, teamMemberId);
  if (!integrations.length) return [];

  const busySlots: Array<{ startAt: number; endAt: number }> = [];

  for (const integration of integrations) {
    if (!integration.syncEnabled) continue;
    try {
      if (process.env.GOOGLE_CLIENT_ID && integration.accessToken) {
        const res = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${integration.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            timeMin: new Date(startAt).toISOString(),
            timeMax: new Date(endAt).toISOString(),
            items: [{ id: integration.calendarId || "primary" }],
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const busyList = data.calendars?.[integration.calendarId || "primary"]?.busy || [];
          for (const b of busyList) {
            busySlots.push({
              startAt: new Date(b.start).getTime(),
              endAt: new Date(b.end).getTime(),
            });
          }
        }
      }
    } catch (err) {
      console.error("Error syncing Google Calendar busy slots:", err);
    }
  }

  return busySlots;
}

/**
 * Push a newly created or updated booking to connected Google Calendar
 */
export async function syncBookingToExternalCalendar(booking: DbBooking) {
  if (!booking.teamMemberId || !booking.organizationId) return;

  const integrations = await listCalendarIntegrations(booking.organizationId, booking.teamMemberId);
  if (!integrations.length) return;

  const eventPayload = {
    summary: `${booking.offeringSnapshot.name} - ${booking.customerSnapshot.name}`,
    description: `Booked via Oneboard AI Receptionist.\nCustomer: ${booking.customerSnapshot.name} (${booking.customerSnapshot.email || "No email"})\nConfirmation Code: ${booking.confirmationCode}`,
    start: { dateTime: new Date(booking.startAt).toISOString() },
    end: { dateTime: new Date(booking.endAt).toISOString() },
  };

  for (const integration of integrations) {
    if (!integration.syncEnabled) continue;
    try {
      if (integration.accessToken) {
        await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(integration.calendarId || "primary")}/events`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${integration.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(eventPayload),
        });
      }
    } catch (err) {
      console.error("Failed to push booking to Google Calendar:", err);
    }
  }
}
