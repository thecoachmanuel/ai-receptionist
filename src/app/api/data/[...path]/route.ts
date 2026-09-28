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
import * as locationsService from "@/lib/services/locations";
import * as calendarSyncService from "@/lib/services/calendar-sync";
import * as organizationsService from "@/lib/services/organizations";
import * as publicSiteService from "@/lib/services/publicSite";
import * as teamService from "@/lib/services/team";
import * as commerceService from "@/lib/services/commerce";
import * as whatsappNotifications from "@/lib/services/whatsapp-notifications";

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

    // ─── Public Commerce Endpoints (Storefront) ───────────────────────────
    if (endpoint === "publicCommerce/getStorefront") {
      const data = await commerceService.getStorefrontData(body.siteSlug);
      return NextResponse.json(data);
    }

    if (endpoint === "publicCommerce/createOrder") {
      const { order, organization } = await commerceService.createStorefrontOrder(
        body.siteSlug,
        body.orderData,
      );
      if (order) {
        whatsappNotifications.sendOrderNotification(
          String(organization._id || organization.clerkOrgId),
          order as any,
        ).catch(() => {});
      }
      return NextResponse.json(order);
    }

    if (endpoint === "publicCommerce/getOrder") {
      const data = await commerceService.getOrderByNumber(body.orderNumber, body.siteSlug);
      return NextResponse.json(data);
    }

    if (endpoint === "publicCommerce/validatePromoCode") {
      const data = await commerceService.validatePromoCode(
        body.siteSlug,
        body.code,
        body.subtotalMinor,
      );
      return NextResponse.json(data);
    }

    if (endpoint === "publicCommerce/getProductReviews") {
      const data = await commerceService.listProductReviews(body.siteSlug, body.productId);
      return NextResponse.json(data);
    }

    if (endpoint === "publicCommerce/submitReview") {
      const data = await commerceService.createProductReview(body.siteSlug, body as any);
      return NextResponse.json(data);
    }

    // Require session authentication for dashboard endpoints
    const session = await getSession();
    if (!session || !session.user || !session.organization) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = session.organization.id;

    if (
      endpoint !== "organizations/listUserOrganizations" &&
      endpoint !== "organizations/create"
    ) {
      const isAuthorized = await organizationsService.isUserAuthorizedForOrg(
        session.user.id,
        orgId,
      );
      if (!isAuthorized) {
        return NextResponse.json(
          { error: "Forbidden: You are not a member of this organization." },
          { status: 403 },
        );
      }
    }

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
        if (session.role === "member" || session.role === "operator") {
          return NextResponse.json(
            { error: "Forbidden: Staff members are not permitted to create organizations." },
            { status: 403 },
          );
        }
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
      case "team/deleteMember":
      case "team/delete": {
        const data = await teamService.deleteMember(orgId, body.teamMemberId);
        return NextResponse.json({ success: Boolean(data) });
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
        const data = await publicSiteService.publish(orgId, body.config, body.siteSlug);
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
      case "locations/list": {
        const data = await locationsService.listLocations(orgId, body.includeInactive);
        return NextResponse.json(data);
      }
      case "locations/create": {
        const data = await locationsService.createLocation(orgId, body as any);
        return NextResponse.json(data);
      }
      case "locations/update": {
        const data = await locationsService.updateLocation(orgId, body.locationId, body);
        return NextResponse.json(data);
      }
      case "locations/delete": {
        const data = await locationsService.deleteLocation(orgId, body.locationId);
        return NextResponse.json(data);
      }
      case "calendar/listIntegrations": {
        const data = await calendarSyncService.listCalendarIntegrations(orgId, body.teamMemberId);
        return NextResponse.json(data);
      }
      case "calendar/saveIntegration": {
        const data = await calendarSyncService.saveGoogleCalendarIntegration(orgId, body.teamMemberId, {
          accessToken: body.accessToken || "mock_access_token",
          refreshToken: body.refreshToken || "mock_refresh_token",
          expiresAt: body.expiresAt || Date.now() + 3600000,
          calendarId: body.calendarId,
        });
        return NextResponse.json(data);
      }
      case "calendar/removeIntegration": {
        const data = await calendarSyncService.removeGoogleCalendarIntegration(orgId, body.teamMemberId);
        return NextResponse.json(data);
      }
      // ─── Commerce: Products ──────────────────────────────────────────────
      case "commerce/listProducts": {
        const data = await commerceService.listProducts(orgId, {
          includeInactive: body.includeInactive,
          collectionId: body.collectionId,
          limit: body.limit,
        });
        return NextResponse.json(data);
      }
      case "commerce/createProduct": {
        const data = await commerceService.createProduct(orgId, body as any);
        return NextResponse.json(data);
      }
      case "commerce/updateProduct": {
        const data = await commerceService.updateProduct(orgId, body.productId, body as any);
        return NextResponse.json(data);
      }
      case "commerce/deleteProduct": {
        const data = await commerceService.deleteProduct(orgId, body.productId);
        return NextResponse.json({ success: data });
      }
      case "commerce/countProducts": {
        const data = await commerceService.countProducts(orgId);
        return NextResponse.json({ count: data });
      }
      // ─── Commerce: Collections ───────────────────────────────────────────
      case "commerce/listCollections": {
        const data = await commerceService.listCollections(orgId, body.includeInactive);
        return NextResponse.json(data);
      }
      case "commerce/createCollection": {
        const data = await commerceService.createCollection(orgId, body as any);
        return NextResponse.json(data);
      }
      case "commerce/updateCollection": {
        const data = await commerceService.updateCollection(orgId, body.collectionId, body as any);
        return NextResponse.json(data);
      }
      case "commerce/deleteCollection": {
        const data = await commerceService.deleteCollection(orgId, body.collectionId);
        return NextResponse.json({ success: data });
      }
      // ─── Commerce: Orders ────────────────────────────────────────────────
      case "commerce/listOrders": {
        const data = await commerceService.listOrders(orgId, {
          status: body.status,
          paymentStatus: body.paymentStatus,
          limit: body.limit,
          skip: body.skip,
        });
        return NextResponse.json(data);
      }
      case "commerce/createOrder": {
        const data = await commerceService.createOrder(orgId, body as any);
        return NextResponse.json(data);
      }
      case "commerce/updateOrderStatus": {
        const data = await commerceService.updateOrderStatus(
          orgId,
          body.orderId,
          body.status,
          body.paymentStatus,
          body.extra,
        );
        // Fire-and-forget WhatsApp notification — never blocks the response
        if (data) {
          whatsappNotifications.sendOrderNotification(orgId, data as any).catch(() => {});
        }
        return NextResponse.json(data);
      }
      case "commerce/getOrderStats": {
        const data = await commerceService.getOrderStats(orgId);
        return NextResponse.json(data);
      }
      // ─── Commerce: Shipping Zones ────────────────────────────────────────
      case "commerce/listShippingZones": {
        const data = await commerceService.listShippingZones(orgId);
        return NextResponse.json(data);
      }
      case "commerce/createShippingZone": {
        const data = await commerceService.createShippingZone(orgId, body as any);
        return NextResponse.json(data);
      }
      case "commerce/updateShippingZone": {
        const data = await commerceService.updateShippingZone(orgId, body.zoneId, body as any);
        return NextResponse.json(data);
      }
      case "commerce/deleteShippingZone": {
        const data = await commerceService.deleteShippingZone(orgId, body.zoneId);
        return NextResponse.json({ success: data });
      }
      // ─── Commerce: Promo Codes ───────────────────────────────────────────
      case "commerce/listPromoCodes": {
        const data = await commerceService.listPromoCodes(orgId);
        return NextResponse.json(data);
      }
      case "commerce/createPromoCode": {
        const data = await commerceService.createPromoCode(orgId, body as any);
        return NextResponse.json(data);
      }
      case "commerce/deletePromoCode": {
        const data = await commerceService.deletePromoCode(orgId, body.promoId);
        return NextResponse.json({ success: data });
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
