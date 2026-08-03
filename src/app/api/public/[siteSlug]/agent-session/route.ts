import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { createAgentDynamicVariables } from "@/lib/agent-context";
import { organizationHasFeature } from "@/lib/billing";
import * as agentsService from "@/lib/services/agents";
import * as publicSiteService from "@/lib/services/publicSite";
import { getVapiSettings } from "@/lib/services/settings";

export const runtime = "nodejs";

function clientKey(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = forwardedFor || request.headers.get("x-real-ip") || "unknown";
  const agent = request.headers.get("user-agent") || "unknown";
  return createHash("sha256").update(`${address}|${agent}`).digest("hex");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ siteSlug: string }> },
) {
  const { siteSlug } = await params;
  const body = (await request.json().catch(() => null)) as {
    mode?: unknown;
  } | null;
  const mode = body?.mode;

  if (mode !== "text" && mode !== "voice" && mode !== "widget") {
    return NextResponse.json(
      { error: "Choose text chat, browser audio, or the Vapi widget." },
      { status: 400 },
    );
  }

  try {
    const aiSettings = await getVapiSettings();
    const activeProvider = aiSettings.activeProvider || "vapi";

    const sessionConfig = await agentsService.requestPublicSession(
      siteSlug,
      clientKey(request),
      mode,
    );

    if (!sessionConfig) {
      return NextResponse.json(
        { error: "The assistant is not enabled for this page." },
        { status: 404 },
      );
    }

    const requiredFeature = mode === "text" ? "web_agent" : "browser_voice";
    const entitled = await organizationHasFeature(
      sessionConfig.clerkOrgId,
      requiredFeature,
    );
    if (!entitled) {
      return NextResponse.json(
        {
          error:
            mode === "text"
              ? "This organization’s plan does not include AI text chat."
              : "This organization’s plan does not include browser audio.",
        },
        { status: 402 },
      );
    }

    const published = await publicSiteService.getPublishedBySlug(sessionConfig.siteSlug);
    if (!published) {
      return NextResponse.json(
        { error: "This public page is unavailable." },
        { status: 404 },
      );
    }

    const dynamicVariables = createAgentDynamicVariables({
      siteSlug: published.site.siteSlug,
      businessName:
        (published.site as any).config?.businessName ||
        (published.site as any).businessName ||
        published.organization.name,
      description:
        (published.site as any).config?.about ||
        (published.site as any).about ||
        "",
      timezone: published.organization.timezone,
      locale: published.organization.locale,
      currency: published.organization.currency,
      terminology: published.organization.terminology,
      offerings: published.offerings,
      teamMembers: published.teamMembers,
      knowledgeItems: published.knowledgeItems,
    });

    return NextResponse.json({
      provider: "vapi",
      vapiPublicKey: aiSettings.vapiPublicKey,
      vapiAssistantId: aiSettings.vapiAssistantId,
      dynamicVariables,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const rateLimited = message.includes("Too many assistant sessions") || message.includes("Too many concierge sessions");
    console.error("Unable to create public assistant session", {
      siteSlug,
      error,
    });
    return NextResponse.json(
      {
        error: rateLimited
          ? "Too many assistant sessions. Please wait a moment and try again."
          : "The assistant is unavailable right now.",
      },
      { status: rateLimited ? 429 : 500 },
    );
  }
}
