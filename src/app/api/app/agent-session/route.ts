import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { organizationHasFeature } from "@/lib/billing";
import { createAgentDynamicVariables } from "@/lib/agent-context";
import * as organizationsService from "@/lib/services/organizations";
import * as agentsService from "@/lib/services/agents";
import * as publicSiteService from "@/lib/services/publicSite";
import * as catalogService from "@/lib/services/catalog";
import * as knowledgeService from "@/lib/services/knowledge";
import * as teamService from "@/lib/services/team";
import { getWorkingElevenLabsSignedUrl } from "@/lib/services/settings";

export const runtime = "nodejs";

export async function POST() {
  const session = await getSession();
  if (!session || !session.organization) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const orgId = session.organization.id;

  const entitled = await organizationHasFeature(orgId, "browser_voice");
  if (!entitled) {
    return NextResponse.json(
      { error: "This organization’s plan does not include browser audio." },
      { status: 403 },
    );
  }

  if (
    session.role !== "admin" &&
    session.role !== "operator" &&
    !(session.permissions || []).includes("org:operations_hub:manage")
  ) {
    return NextResponse.json(
      { error: "Organization operator access is required." },
      { status: 403 },
    );
  }

  try {
    const [organization, agent, site, offerings, knowledgeItems, teamMembers] =
      await Promise.all([
        organizationsService.getOrganizationByIdOrSlug(orgId),
        agentsService.getCurrentAgent(orgId),
        publicSiteService.getCurrentDraft(orgId),
        catalogService.listOfferings(orgId, false),
        knowledgeService.listKnowledgeItems(orgId, false),
        teamService.listMembers(orgId, false),
      ]);

    if (!organization || !agent.integration?.webEnabled) {
      return NextResponse.json(
        { error: "No web agent is connected to this organization." },
        { status: 404 },
      );
    }

    const { signedUrl } = await getWorkingElevenLabsSignedUrl();

    return NextResponse.json(
      {
        signedUrl,
        dynamicVariables: createAgentDynamicVariables({
          siteSlug: site.site.siteSlug,
          businessName: (site.site.draft as any)?.businessName ?? organization.name ?? "",
          description: (site.site.draft as any)?.about ?? "",
          timezone: organization.timezone,
          locale: organization.locale,
          currency: organization.currency,
          terminology: organization.terminology,
          offerings,
          teamMembers,
          knowledgeItems,
        }),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Unable to start authenticated ElevenLabs agent test", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "The agent test is unavailable right now." },
      { status: 500 },
    );
  }
}
