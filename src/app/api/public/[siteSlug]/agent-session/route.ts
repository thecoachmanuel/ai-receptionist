import { createHash } from "node:crypto";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { NextRequest, NextResponse } from "next/server";

import { createAgentDynamicVariables } from "@/lib/agent-context";
import { organizationHasFeature } from "@/lib/billing";
import * as agentsService from "@/lib/services/agents";
import * as publicSiteService from "@/lib/services/publicSite";
import {
  getElevenLabsSettings,
  getRotatedGeminiKey,
  getRotatedElevenLabsKey,
} from "@/lib/services/settings";

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
      { error: "Choose text chat, browser audio, or the ElevenLabs widget." },
      { status: 400 },
    );
  }

  try {
    const aiSettings = await getElevenLabsSettings();
    const activeProvider = aiSettings.activeProvider || "elevenlabs";

    const sessionConfig = await agentsService.requestPublicSession(
      siteSlug,
      clientKey(request),
      mode,
    );

    if (!sessionConfig) {
      return NextResponse.json(
        { error: "The concierge is not enabled for this page." },
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

    if (activeProvider === "gemini") {
      const { model } = await getRotatedGeminiKey();
      return NextResponse.json({
        provider: "gemini",
        model,
        siteSlug: published.site.siteSlug,
        dynamicVariables,
      });
    }

    // Default to ElevenLabs
    const credentials = await getRotatedElevenLabsKey();
    const elevenlabs = new ElevenLabsClient({ apiKey: credentials.apiKey });
    const { signedUrl } =
      await elevenlabs.conversationalAi.conversations.getSignedUrl({
        agentId: credentials.agentId,
      });

    return NextResponse.json(
      {
        provider: "elevenlabs",
        signedUrl,
        dynamicVariables,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const rateLimited = message.includes("Too many concierge sessions");
    console.error("Unable to create public concierge session", {
      siteSlug,
      error,
    });
    return NextResponse.json(
      {
        error: rateLimited
          ? "Too many concierge sessions. Please wait a moment and try again."
          : "The concierge is unavailable right now.",
      },
      { status: rateLimited ? 429 : 500 },
    );
  }
}
