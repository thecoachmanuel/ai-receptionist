import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

import * as agentsService from "@/lib/services/agents";
import * as availabilityService from "@/lib/services/availability";
import * as bookingsService from "@/lib/services/bookings";
import * as catalogService from "@/lib/services/catalog";
import * as contactsService from "@/lib/services/contacts";
import * as conversationsService from "@/lib/services/conversations";
import * as dashboardService from "@/lib/services/dashboard";
import * as knowledgeService from "@/lib/services/knowledge";
import * as organizationsService from "@/lib/services/organizations";
import * as publicSiteService from "@/lib/services/publicSite";
import * as teamService from "@/lib/services/team";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const endpoint = path.join("/");

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, any>;

    // Handle public booking endpoints that don't require session auth
    if (endpoint === "publicBooking/getAvailableSlots") {
      const data = await bookingsService.getAvailableSlots(
        body.siteSlug,
        body.offeringId,
        body.dateStr,
        body.teamMemberId,
      );
      return NextResponse.json(data);
    }

    if (endpoint === "publicBooking/create") {
      const data = await bookingsService.createPublicBooking(body as any);
      return NextResponse.json(data);
    }

    if (endpoint === "publicBooking/lookup") {
      const data = await bookingsService.lookupBooking(
        body.siteSlug,
        body.confirmationCode,
        body.phone,
      );
      return NextResponse.json(data);
    }

    if (endpoint === "publicBooking/reschedule") {
      const data = await bookingsService.rescheduleBooking(
        body.siteSlug,
        body.confirmationCode,
        body.phone,
        body.offeringId,
        body.startAt,
        body.teamMemberId,
      );
      return NextResponse.json(data);
    }

    if (endpoint === "publicBooking/logConversation") {
      const data = await conversationsService.logPublicConversationBySlug(body.siteSlug, body);
      return NextResponse.json(data);
    }

    if (endpoint === "publicBooking/cancel") {
      const data = await bookingsService.cancelBooking(
        body.siteSlug,
        body.confirmationCode,
        body.phone,
      );
      return NextResponse.json(data);
    }

    // Require session authentication for dashboard endpoints
    const session = await getSession();
    if (!session || !session.user || !session.organization) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = session.organization.id;

    switch (endpoint) {
      case "organizations/current": {
        const org = await organizationsService.getOrganizationByIdOrSlug(orgId);
        if (!org) return NextResponse.json(null);
        return NextResponse.json(await organizationsService.viewOrganization(org, session.role || "admin"));
      }
      case "organizations/listUserOrganizations": {
        const orgs = await organizationsService.listUserOrganizations(session.user.id);
        return NextResponse.json(orgs);
      }
      case "organizations/create": {
        const created = await organizationsService.createOrganization(
          session.user.id,
          body.name,
          body.timezone,
          body.currency,
          body.locale,
        );
        return NextResponse.json(await organizationsService.viewOrganization(created, "admin"));
      }
      case "organizations/updateCurrent": {
        const updated = await organizationsService.updateOrganization(orgId, body);
        return NextResponse.json(updated);
      }
      case "dashboard/overview": {
        const data = await dashboardService.getOverview(orgId);
        return NextResponse.json(data);
      }
      case "bookings/listForCurrentOrg": {
        const data = await bookingsService.listBookings(orgId, body as any);
        return NextResponse.json(data);
      }
      case "bookings/createForCurrentOrg": {
        const data = await bookingsService.createBooking(orgId, {
          ...body,
          createdByUserId: session.user.id,
          source: "dashboard",
        } as any);
        return NextResponse.json(data);
      }
      case "bookings/updateStatus": {
        const data = await bookingsService.updateBookingStatus(
          orgId,
          body.bookingId,
          body.status,
        );
        return NextResponse.json(data);
      }
      case "catalog/listOfferings": {
        const data = await catalogService.listOfferings(orgId, body.includeInactive);
        return NextResponse.json(data);
      }
      case "catalog/createOffering": {
        const data = await catalogService.createOffering(
          orgId,
          session.organization.currency,
          body as any,
        );
        return NextResponse.json(data);
      }
      case "catalog/updateOffering": {
        const data = await catalogService.updateOffering(orgId, body.offeringId, body as any);
        return NextResponse.json(data);
      }
      case "team/listMembers": {
        const data = await teamService.listMembers(orgId, body.includeInactive);
        return NextResponse.json(data);
      }
      case "team/createMember": {
        const data = await teamService.createMember(orgId, body as any);
        return NextResponse.json(data);
      }
      case "team/updateMember": {
        const data = await teamService.updateMember(orgId, body.teamMemberId, body as any);
        return NextResponse.json(data);
      }
      case "availability/listRules": {
        const data = await availabilityService.listRules(orgId, body.teamMemberId);
        return NextResponse.json(data);
      }
      case "availability/replaceMemberRules": {
        const data = await availabilityService.replaceMemberRules(
          orgId,
          body.teamMemberId,
          body.rules,
        );
        return NextResponse.json(data);
      }
      case "publicSite/getCurrentDraft": {
        const data = await publicSiteService.getCurrentDraft(orgId);
        return NextResponse.json(data);
      }
      case "publicSite/updateDraft": {
        const data = await publicSiteService.updateDraft(orgId, body.config, body.siteSlug);
        return NextResponse.json(data);
      }
      case "publicSite/publish": {
        const data = await publicSiteService.publish(orgId);
        return NextResponse.json(data);
      }
      case "conversations/listRecent": {
        const data = await conversationsService.listRecentConversations(orgId, body.limit);
        return NextResponse.json(data);
      }
      case "conversations/log": {
        const data = await conversationsService.logConversation(orgId, body);
        return NextResponse.json(data);
      }
      case "contacts/list": {
        const data = await contactsService.listContacts(orgId, body.limit);
        return NextResponse.json(data);
      }
      case "agents/getCurrent": {
        const data = await agentsService.getCurrentAgent(orgId);
        return NextResponse.json(data);
      }
      case "knowledge/list": {
        const data = await knowledgeService.listKnowledgeItems(orgId, body.includeUnpublished);
        return NextResponse.json(data);
      }
      default:
        return NextResponse.json({ error: `Unknown endpoint: ${endpoint}` }, { status: 404 });
    }
  } catch (error) {
    console.error(`Error handling ${endpoint}`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}
