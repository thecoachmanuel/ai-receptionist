import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db/mongodb";
import type { BookingStatus, DbAvailabilityRule, DbBooking, DbContact, DbOffering, DbOrganization, DbPublicSite, DbTeamMember } from "@/lib/db/types";
import { dayOfWeek, localPartsAt } from "@/lib/time";
import { normalizedEmail, normalizedPhone, optionalTrimmed, requiredTrimmed } from "@/lib/validation";

function generateConfirmationCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 6; i += 1) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function listBookings(
  orgId: string,
  args?: { from?: number; to?: number; status?: BookingStatus; limit?: number },
) {
  const db = await getDb();
  const filter: Record<string, unknown> = { organizationId: orgId };

  if (args?.status) {
    filter.status = args.status;
  }
  if (args?.from || args?.to) {
    const startFilter: Record<string, number> = {};
    if (args.from) startFilter.$gte = args.from;
    if (args.to) startFilter.$lte = args.to;
    filter.startAt = startFilter;
  }

  const limit = args?.limit ?? 100;
  const bookings = await db
    .collection<DbBooking>("bookings")
    .find(filter)
    .sort({ startAt: -1 })
    .limit(limit)
    .toArray();

  return bookings.map((b) => ({
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
  }));
}

export async function createBooking(
  orgId: string,
  args: {
    offeringId: string;
    teamMemberId?: string;
    startAt: number;
    customer: { name: string; email?: string; phone?: string };
    notes?: string;
    idempotencyKey?: string;
    source?: "dashboard" | "public_site" | "web_agent";
    publicSiteId?: string;
    createdByUserId?: string;
  },
) {
  const db = await getDb();

  // Check idempotency
  if (args.idempotencyKey) {
    const existing = await db.collection<DbBooking>("bookings").findOne({
      organizationId: orgId,
      idempotencyKey: args.idempotencyKey,
    });
    if (existing) {
      return {
        bookingId: existing._id!.toString(),
        status: existing.status,
        startAt: existing.startAt,
        endAt: existing.endAt,
        startTimeISO: new Date(existing.startAt).toISOString(),
        endTimeISO: new Date(existing.endAt).toISOString(),
        confirmationCode: existing.confirmationCode,
        offering: existing.offeringSnapshot,
        teamMember: existing.teamMemberSnapshot,
        customer: existing.customerSnapshot,
        source: existing.source,
        notes: existing.notes,
        createdAt: existing.createdAt,
        updatedAt: existing.updatedAt,
        replayed: true,
      };
    }
  }

  const offering = await db.collection<DbOffering>("offerings").findOne({
    _id: new ObjectId(args.offeringId),
    organizationId: orgId,
  });
  if (!offering || !offering.active) {
    throw new Error("Invalid or inactive offering selected.");
  }

  let teamMember: DbTeamMember | null = null;
  if (args.teamMemberId) {
    teamMember = await db.collection<DbTeamMember>("teamMembers").findOne({
      _id: new ObjectId(args.teamMemberId),
      organizationId: orgId,
    });
  } else {
    // Pick first available member assigned to offering
    teamMember = await db.collection<DbTeamMember>("teamMembers").findOne({
      organizationId: orgId,
      offeringIds: args.offeringId,
      active: true,
      acceptingBookings: true,
    });
  }

  if (!teamMember || !teamMember.active || !teamMember.acceptingBookings) {
    throw new Error("No team member available for this offering.");
  }

  const durationMs = offering.durationMinutes * 60_000;
  const endAt = args.startAt + durationMs;
  const reservedStartAt = args.startAt - offering.bufferBeforeMinutes * 60_000;
  const reservedEndAt = endAt + offering.bufferAfterMinutes * 60_000;

  // Contact resolution or creation
  const customerName = requiredTrimmed(args.customer.name, "customer.name", 120);
  const emailNorm = normalizedEmail(args.customer.email);
  const phoneNorm = normalizedPhone(args.customer.phone);

  let contact = await db.collection<DbContact>("contacts").findOne({
    organizationId: orgId,
    ...(emailNorm ? { emailNormalized: emailNorm } : phoneNorm ? { phoneNormalized: phoneNorm } : { name: customerName }),
  });

  const now = Date.now();
  if (!contact) {
    const insertContact = await db.collection<DbContact>("contacts").insertOne({
      organizationId: orgId,
      name: customerName,
      email: args.customer.email,
      emailNormalized: emailNorm,
      phone: args.customer.phone,
      phoneNormalized: phoneNorm,
      tags: ["customer"],
      createdAt: now,
      updatedAt: now,
    });
    contact = (await db.collection<DbContact>("contacts").findOne({ _id: insertContact.insertedId }))!;
  }

  const confirmationCode = generateConfirmationCode();

  const newBooking: DbBooking = {
    organizationId: orgId,
    publicSiteId: args.publicSiteId,
    contactId: contact._id!.toString(),
    offeringId: offering._id!.toString(),
    teamMemberId: teamMember._id!.toString(),
    startAt: args.startAt,
    endAt,
    reservedStartAt,
    reservedEndAt,
    status: "confirmed",
    source: args.source ?? "dashboard",
    notes: optionalTrimmed(args.notes, "notes", 1_000),
    confirmationCode,
    idempotencyKey: args.idempotencyKey,
    offeringSnapshot: {
      name: offering.name,
      durationMinutes: offering.durationMinutes,
      priceMinor: offering.priceMinor,
      currency: offering.currency,
    },
    teamMemberSnapshot: {
      name: teamMember.name,
      title: teamMember.title,
    },
    customerSnapshot: {
      name: customerName,
      email: args.customer.email,
      phone: args.customer.phone,
    },
    createdByUserId: args.createdByUserId,
    createdAt: now,
    updatedAt: now,
  };

  const result = await db.collection<DbBooking>("bookings").insertOne(newBooking);

  return {
    bookingId: result.insertedId.toString(),
    status: newBooking.status,
    startAt: newBooking.startAt,
    endAt: newBooking.endAt,
    startTimeISO: new Date(newBooking.startAt).toISOString(),
    endTimeISO: new Date(newBooking.endAt).toISOString(),
    confirmationCode: newBooking.confirmationCode,
    offering: newBooking.offeringSnapshot,
    teamMember: newBooking.teamMemberSnapshot,
    customer: newBooking.customerSnapshot,
    source: newBooking.source,
    notes: newBooking.notes,
    createdAt: newBooking.createdAt,
    updatedAt: newBooking.updatedAt,
    replayed: false,
  };
}

export async function updateBookingStatus(
  orgId: string,
  bookingId: string,
  status: BookingStatus,
) {
  const db = await getDb();
  const filter = {
    _id: new ObjectId(bookingId),
    organizationId: orgId,
  };
  const booking = await db.collection<DbBooking>("bookings").findOne(filter);
  if (!booking) throw new Error("Booking not found.");

  const now = Date.now();
  await db.collection<DbBooking>("bookings").updateOne(filter, {
    $set: { status, updatedAt: now },
  });

  const updated = (await db.collection<DbBooking>("bookings").findOne(filter))!;

  return {
    bookingId: updated._id!.toString(),
    status: updated.status,
    startAt: updated.startAt,
    endAt: updated.endAt,
    startTimeISO: new Date(updated.startAt).toISOString(),
    endTimeISO: new Date(updated.endAt).toISOString(),
    confirmationCode: updated.confirmationCode,
    offering: updated.offeringSnapshot,
    teamMember: updated.teamMemberSnapshot,
    customer: updated.customerSnapshot,
    source: updated.source,
    notes: updated.notes,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  };
}

export async function getPublicAvailableSlots(
  siteSlug: string,
  offeringId: string,
  dateStr: string,
  teamMemberId?: string,
) {
  const db = await getDb();
  const site = await db.collection<DbPublicSite>("publicSites").findOne({ siteSlug });
  if (!site?.published || !site.publishedAt) throw new Error("Site not found");

  const orgId = site.organizationId;
  const orgFilter = ObjectId.isValid(orgId) ? { _id: new ObjectId(orgId) } : { clerkOrgId: orgId };
  const organization = await db.collection<DbOrganization>("organizations").findOne(orgFilter);
  if (!organization) throw new Error("Organization not found");

  const effectiveOrgId = organization._id!.toString();
  const timezone = organization.timezone;

  const offering = await db.collection<DbOffering>("offerings").findOne({
    _id: new ObjectId(offeringId),
    organizationId: effectiveOrgId,
    active: true,
  });
  if (!offering) throw new Error("Offering not found");

  // Calculate day bounds and availability rules
  const [year, month, day] = dateStr.split("-").map(Number);
  const targetDate = { year, month, day };
  const dayIndex = dayOfWeek(targetDate);

  const rulesFilter: Record<string, unknown> = {
    organizationId: effectiveOrgId,
    dayOfWeek: dayIndex,
    active: true,
  };
  if (teamMemberId) {
    rulesFilter.teamMemberId = teamMemberId;
  }

  const rules = await db
    .collection<DbAvailabilityRule>("availabilityRules")
    .find(rulesFilter)
    .toArray();

  const slotIntervalMinutes = site.published.booking.slotIntervalMinutes || 30;
  const durationMs = offering.durationMinutes * 60_000;
  const slots: Array<{ startAt: number; endAt: number; teamMemberId: string }> = [];

  const now = Date.now();
  const minNoticeMs = (site.published.booking.minimumNoticeMinutes || 60) * 60_000;

  for (const rule of rules) {
    const member = await db.collection<DbTeamMember>("teamMembers").findOne({
      _id: new ObjectId(rule.teamMemberId),
      organizationId: effectiveOrgId,
      active: true,
      acceptingBookings: true,
    });
    if (!member) continue;

    for (let min = rule.startMinute; min + offering.durationMinutes <= rule.endMinute; min += slotIntervalMinutes) {
      const hour = Math.floor(min / 60);
      const minute = min % 60;
      const startAt = Date.UTC(year, month - 1, day, hour, minute); // approximate wall clock

      if (startAt < now + minNoticeMs) continue;

      // Check collision with existing bookings
      const reservedStartAt = startAt - offering.bufferBeforeMinutes * 60_000;
      const reservedEndAt = startAt + durationMs + offering.bufferAfterMinutes * 60_000;

      const collision = await db.collection<DbBooking>("bookings").findOne({
        organizationId: effectiveOrgId,
        teamMemberId: member._id!.toString(),
        status: { $nin: ["canceled"] },
        reservedStartAt: { $lt: reservedEndAt },
        reservedEndAt: { $gt: reservedStartAt },
      });

      if (!collision) {
        slots.push({
          startAt,
          endAt: startAt + durationMs,
          teamMemberId: member._id!.toString(),
        });
      }
    }
  }

  return slots;
}
