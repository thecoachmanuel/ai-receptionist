import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/mongodb";
import type { DbOrganization } from "@/lib/db/types";
import { processCustomerMessage } from "@/lib/services/ai-shopping-assistant";
import { getSystemSettings } from "@/lib/services/system-settings";

export const runtime = "nodejs";

/**
 * Incoming WhatsApp Webhook Handler
 * Supports Evolution API and WAHA webhook events.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // ─── Extract event data across Evolution API / WAHA formats ──────────────
    let senderPhone = "";
    let senderName = "";
    let messageText = "";
    let instanceName = "";

    // 1. Evolution API format: { event: "messages.upsert", data: { key: { remoteJid }, message: { conversation }, pushName } }
    if (body.data?.key?.remoteJid) {
      const jid = body.data.key.remoteJid;
      // Skip status broadcast and groups
      if (jid.includes("@g.us") || jid.includes("status@broadcast")) {
        return NextResponse.json({ skipped: true, reason: "group_or_status" });
      }
      // Skip messages sent by the bot itself
      if (body.data.key.fromMe) {
        return NextResponse.json({ skipped: true, reason: "from_me" });
      }

      senderPhone = jid.split("@")[0];
      senderName = body.data.pushName || "";
      messageText =
        body.data.message?.conversation ||
        body.data.message?.extendedTextMessage?.text ||
        "";
      instanceName = body.instance || "";
    }

    // 2. WAHA format: { event: "message", payload: { from, body, _data: { notifyName } }, session }
    if (!senderPhone && body.payload?.from) {
      if (body.payload.from.includes("@g.us") || body.payload.fromMe) {
        return NextResponse.json({ skipped: true, reason: "group_or_from_me" });
      }
      senderPhone = body.payload.from.split("@")[0];
      senderName = body.payload._data?.notifyName || "";
      messageText = body.payload.body || "";
      instanceName = body.session || "";
    }

    if (!senderPhone || !messageText) {
      return NextResponse.json({ skipped: true, reason: "no_message_content" });
    }

    // ─── Identify Organization by WhatsApp Instance / Phone ──────────────────
    const db = await getDb();
    let org: DbOrganization | null = null;

    if (instanceName) {
      org = await db.collection<DbOrganization>("organizations").findOne({
        $or: [
          { "whatsappInstance.instanceName": instanceName },
          { "whatsappInstance.phone": instanceName },
          { slug: instanceName },
        ],
      });
    }

    if (!org) {
      // Try to find by any connected instance
      org = await db.collection<DbOrganization>("organizations").findOne({
        "whatsappInstance.status": "connected",
      });
    }

    if (!org) {
      return NextResponse.json({ error: "Store organization not found for this WhatsApp instance" }, { status: 404 });
    }

    // ─── Process through AI Shopping Assistant ──────────────────────────────
    const result = await processCustomerMessage({
      orgSlugOrId: org.slug,
      senderPhone,
      senderName,
      messageText,
    });

    if (result.handled && result.replyMessage) {
      // Dispatch reply back via gateway
      const sys = await getSystemSettings();
      const gateway = sys.whatsappGateway;
      const evolutionBaseUrl = process.env.EVOLUTION_API_BASE_URL || gateway?.serverUrl || "http://localhost:8080";
      const evolutionApiKey = process.env.EVOLUTION_API_KEY || gateway?.apiKey || "";
      const inst = org.whatsappInstance?.phone || org.slug;

      try {
        await fetch(`${evolutionBaseUrl.replace(/\/$/, "")}/message/sendText/${inst}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: evolutionApiKey,
            "X-Api-Key": evolutionApiKey,
          },
          body: JSON.stringify({
            number: senderPhone,
            text: result.replyMessage,
          }),
        });
      } catch (sendErr) {
        console.error("Failed to send WhatsApp shopping assistant reply", sendErr);
      }
    }

    return NextResponse.json({ success: true, intent: result.intent });
  } catch (error) {
    console.error("WhatsApp webhook error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
