import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

import * as organizationsService from "@/lib/services/organizations";
import * as dashboardService from "@/lib/services/dashboard";
import * as bookingsService from "@/lib/services/bookings";
import * as catalogService from "@/lib/services/catalog";
import * as teamService from "@/lib/services/team";
import * as availabilityService from "@/lib/services/availability";
import * as publicSiteService from "@/lib/services/publicSite";
import * as conversationsService from "@/lib/services/conversations";
import * as agentsService from "@/lib/services/agents";
import * as knowledgeService from "@/lib/services/knowledge";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const endpoint = path.join("/");
  const body = (await request.json().catch(() => ({}))) as Record<string, any>;

  // Public Endpoints
  if (endpoint === "publicSite/getPublishedBySlug") {
    const data = await publicSiteService.getPublishedBySlug(body.siteSlug);
    return NextResponse.json(data);
  }

  if (endpoint === "publicSite/getAgentSessionConfig") {
    const data = await publicSiteService.getAgentSessionConfig(body.siteSlug);
    return NextResponse.json(data);
  }

  if (endpoint === "agents/requestPublicSession") {
    const data = await agentsService.requestPublicSession(
      body.siteSlug,
      body.clientKey,
      body.mode,
    );
    return NextResponse.json(data);
  }

  if (endpoint === "publicBooking/getAvailableSlots") {
    const data = await bookingsService.getPublicAvailableSlots(
      body.siteSlug,
      body.offeringId,
      body.dateStr,
      body.teamMemberId,
    );
    return NextResponse.json(data);
  }

  if (endpoint === "publicBooking/create") {
    const site = await publicSiteService.getPublishedBySlug(body.siteSlug);
    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }
    const data = await bookingsService.createBooking(site.organization.clerkOrgId, {
      offeringId: body.offeringId,
      teamMemberId: body.teamMemberId,
      startAt: body.startAt,
      customer: body.customer,
      notes: body.notes,
      idempotencyKey: body.idempotencyKey,
      source: "public_site",
      publicSiteId: site.site._id,
    });
    return NextResponse.json(data);
  }

  // Authenticated Endpoints
  const session = await getSession();
  if (!session || !session.organization) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const orgId = session.organization.id;
  const clerkOrgId = session.organization.clerkOrgId;

  try {
    switch (endpoint) {
      case "organizations/current": {
        const org = await organizationsService.getOrganizationByIdOrSlug(orgId);
        if (!org) return NextResponse.json(null);
        return NextResponse.json(await organizationsService.viewOrganization(org, session.role));
      }
      case "organizations/bootstrapCurrent": {
        const org = await organizationsService.getOrganizationByIdOrSlug(orgId);
        if (org) {
          return NextResponse.json(await organizationsService.viewOrganization(org, session.role));
        }
        const created = await organizationsService.createOrganizationForUser(
          session.user.id,
          body.name || session.organization.name,
          body.timezone || session.organization.timezone,
          body.currency || session.organization.currency,
          body.locale || session.organization.locale,
        );
        return NextResponse.json(await organizationsService.viewOrganization(created, "admin"));
      }
      case "organizations/updateCurrent": {
        // Implement update organization settings
        return NextResponse.json(await organizationsService.getOrganizationByIdOrSlug(orgId));
      }
      case "dashboard/overview": {
        const data = await dashboardService.getOverview(orgId);
        return NextResponse.json(data);
      }
      case "bookings/listForCurrentOrg": {
        const data = await bookingsService.listBookings(orgId, body);
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
          body,
        );
        return NextResponse.json(data);
      }
      case "catalog/updateOffering": {
        const data = await catalogService.updateOffering(orgId, body.offeringId, body);
        return NextResponse.json(data);
      }
      case "team/listMembers": {
        const data = await teamService.listMembers(orgId, body.includeInactive);
        return NextResponse.json(data);
      }
      case "team/createMember": {
        const data = await teamService.createMember(orgId, body);
        return NextResponse.json(data);
      }
      case "team/updateMember": {
        const data = await teamService.updateMember(orgId, body.teamMemberId, body);
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
