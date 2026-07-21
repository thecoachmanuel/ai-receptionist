import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db/mongodb";
import type { DbBooking, DbContact, DbConversation, DbOffering, DbOrganization, DbTeamMember } from "@/lib/db/types";

export async function getOverview(orgId: string) {
  const db = await getDb();
  const orgFilter = ObjectId.isValid(orgId)
    ? { organizationId: orgId }
    : { organizationId: orgId };

  const organization = await db
    .collection<DbOrganization>("organizations")
    .findOne(ObjectId.isValid(orgId) ? { _id: new ObjectId(orgId) } : { clerkOrgId: orgId });

  if (!organization) throw new Error("Organization not found");

  const effectiveOrgId = organization._id!.toString();

  const now = Date.now();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startOfDayMs = startOfDay.getTime();
  const endOfDayMs = startOfDayMs + 86_400_000;
  const sevenDaysLaterMs = now + 7 * 86_400_000;
  const thirtyDaysAgoMs = now - 30 * 86_400_000;

  const [
    bookingsToday,
    completedToday,
    upcomingBookings,
    totalContacts,
    conversationsThirtyDays,
    recentConversations,
    activeOfferings,
    activeTeamMembers,
  ] = await Promise.all([
    db.collection<DbBooking>("bookings").countDocuments({
      organizationId: effectiveOrgId,
      startAt: { $gte: startOfDayMs, $lt: endOfDayMs },
    }),
    db.collection<DbBooking>("bookings").countDocuments({
      organizationId: effectiveOrgId,
      status: "completed",
      startAt: { $gte: startOfDayMs, $lt: endOfDayMs },
    }),
    db
      .collection<DbBooking>("bookings")
      .find({
        organizationId: effectiveOrgId,
        startAt: { $gte: now },
        status: { $nin: ["canceled"] },
      })
      .sort({ startAt: 1 })
      .limit(10)
      .toArray(),
    db.collection<DbContact>("contacts").countDocuments({ organizationId: effectiveOrgId }),
    db.collection<DbConversation>("conversations").countDocuments({
      organizationId: effectiveOrgId,
      startedAt: { $gte: thirtyDaysAgoMs },
    }),
    db
      .collection<DbConversation>("conversations")
      .find({ organizationId: effectiveOrgId })
      .sort({ startedAt: -1 })
      .limit(5)
      .toArray(),
    db.collection<DbOffering>("offerings").countDocuments({ organizationId: effectiveOrgId, active: true }),
    db.collection<DbTeamMember>("teamMembers").countDocuments({ organizationId: effectiveOrgId, active: true }),
  ]);

  const upcomingSevenDays = await db.collection<DbBooking>("bookings").countDocuments({
    organizationId: effectiveOrgId,
    startAt: { $gte: now, $lte: sevenDaysLaterMs },
    status: { $nin: ["canceled"] },
  });

  return {
    organization: {
      _id: organization._id!.toString(),
      name: organization.name,
      slug: organization.slug,
      timezone: organization.timezone,
      currency: organization.currency,
      locale: organization.locale,
      terminology: organization.terminology,
    },
    stats: {
      bookingsToday,
      bookingsTodayIsCapped: false,
      completedToday,
      upcomingSevenDays,
      upcomingSevenDaysIsCapped: false,
      totalContacts,
      totalContactsIsCapped: false,
      conversationsThirtyDays,
      conversationsThirtyDaysIsCapped: false,
      activeOfferings,
      activeOfferingsIsCapped: false,
      activeTeamMembers,
      activeTeamMembersIsCapped: false,
    },
    upcomingBookings: upcomingBookings.map((b: any) => ({
      bookingId: b._id!.toString(),
      status: b.status,
      startAt: b.startAt,
      endAt: b.endAt,
      startTimeISO: new Date(b.startAt).toISOString(),
      endTimeISO: new Date(b.endAt).toISOString(),
      confirmationCode: b.confirmationCode,
      offering: b.offeringSnapshot,
      teamMember: b.teamMemberSnapshot,
      customer: b.customerSnapshot,
      source: b.source,
      notes: b.notes,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    })),
    recentConversations: recentConversations.map((c: any) => ({
      _id: c._id!.toString(),
      externalConversationId: c.externalConversationId,
      channel: c.channel,
      status: c.status,
      caller: c.caller,
      transcript: c.transcript,
      summary: c.summary,
      durationSeconds: c.durationSeconds,
      outcome: c.outcome,
      startedAt: c.startedAt,
      endedAt: c.endedAt,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    })),
  };
}
