import { NextRequest, NextResponse } from "next/server";
import { createAgentDynamicVariables } from "@/lib/agent-context";
import * as publicSiteService from "@/lib/services/publicSite";
import { getElevenLabsSettings } from "@/lib/services/settings";
import { getDb } from "@/lib/db/mongodb";

export const runtime = "nodejs";

/** Friendly user-facing messages that never reveal internal details */
const USER_FRIENDLY_REPLIES: Record<string, string> = {
  quota: "I'm a little busy right now — please give me a moment and try again shortly.",
  not_found: "I'm having trouble accessing my knowledge base right now. Please try again in a moment.",
  default: "I'm sorry, I couldn't process that just now. Please try again in a few seconds.",
};

/** Detect if the Gemini error is a rate/quota error */
function isQuotaError(status: number, message: string): boolean {
  if (status === 429) return true;
  if (status === 503) return true;
  const lower = message.toLowerCase();
  return (
    lower.includes("quota") ||
    lower.includes("rate limit") ||
    lower.includes("resource_exhausted") ||
    lower.includes("too many requests") ||
    lower.includes("overloaded")
  );
}

/** Detect a model not found / bad model error */
function isModelError(status: number, message: string): boolean {
  const lower = message.toLowerCase();
  return status === 404 || lower.includes("not found") || lower.includes("invalid model");
}

/**
 * Try a single Gemini API key. Returns the reply text on success,
 * or throws an error with `status` attached for the caller to inspect.
 */
async function tryGeminiKey(
  apiKey: string,
  model: string,
  contents: unknown[],
  systemInstruction: string,
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const payload = {
    contents,
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: {
      temperature: 0.65,
      maxOutputTokens: 600,   // keep tokens tight to avoid hitting limits fast
      topP: 0.9,
      topK: 40,
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
    ],
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let errorMsg = `Gemini API error status ${res.status}`;
    try {
      const errBody = await res.json();
      errorMsg = errBody?.error?.message || errorMsg;
    } catch {
      // ignore json parse failure
    }
    const err: Error & { status?: number } = new Error(errorMsg);
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  const replyText: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!replyText) {
    const finishReason: string = data?.candidates?.[0]?.finishReason || "unknown";
    const err: Error & { status?: number } = new Error(`No text in response (finishReason: ${finishReason})`);
    err.status = 200; // not a network error, but still no usable reply
    throw err;
  }

  return replyText;
}

/**
 * Call Gemini with full key rotation + model fallback.
 * - Tries every configured API key.
 * - On model-not-found, falls back to gemini-2.0-flash then gemini-1.5-flash.
 * - Never leaks internal API errors to the caller; returns a friendly string on total failure.
 */
async function callGeminiWithRotation(
  allKeys: string[],
  startIndex: number,
  model: string,
  contents: unknown[],
  systemInstruction: string,
): Promise<{ reply: string; usedKeyIndex: number; usedModel: string; fallback: boolean }> {
  const fallbackModels = ["gemini-2.0-flash", "gemini-1.5-flash"];
  const modelsToTry = model === "gemini-2.0-flash"
    ? ["gemini-2.0-flash", "gemini-1.5-flash"]
    : model === "gemini-1.5-flash"
    ? ["gemini-1.5-flash"]
    : [model, ...fallbackModels.filter((m) => m !== model)];

  const keyCount = allKeys.length;
  let lastError: (Error & { status?: number }) | null = null;

  // Iterate through all keys starting from the rotation index
  for (let attempt = 0; attempt < keyCount; attempt++) {
    const keyIndex = (startIndex + attempt) % keyCount;
    const apiKey = allKeys[keyIndex];

    for (let mi = 0; mi < modelsToTry.length; mi++) {
      const currentModel = modelsToTry[mi];
      try {
        const reply = await tryGeminiKey(apiKey, currentModel, contents, systemInstruction);
        return { reply, usedKeyIndex: keyIndex, usedModel: currentModel, fallback: mi > 0 };
      } catch (err: unknown) {
        lastError = err as Error & { status?: number };
        const status = lastError.status ?? 0;
        const message = lastError.message ?? "";

        if (isModelError(status, message)) {
          // This model doesn't work with this key — try next fallback model
          continue;
        }

        if (isQuotaError(status, message)) {
          // This key is rate-limited — try the next key (break inner model loop)
          break;
        }

        // Any other error (auth, bad request) — don't retry this key, move on
        break;
      }
    }
  }

  // All keys and models exhausted — return a graceful message
  const finalStatus = lastError?.status ?? 0;
  const finalMsg = lastError?.message ?? "";
  const friendlyReply = isQuotaError(finalStatus, finalMsg)
    ? USER_FRIENDLY_REPLIES.quota
    : USER_FRIENDLY_REPLIES.default;

  return { reply: friendlyReply, usedKeyIndex: startIndex, usedModel: model, fallback: true };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ siteSlug: string }> },
) {
  const { siteSlug } = await params;
  try {
    const body = await request.json().catch(() => ({}));
    const { message, history } = body as { message?: unknown; history?: unknown[] };

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    // Load settings and site in parallel
    const [settings, published] = await Promise.all([
      getElevenLabsSettings(),
      publicSiteService.getPublishedBySlug(siteSlug),
    ]);

    if (!published) {
      return NextResponse.json({ error: "Public site not found." }, { status: 404 });
    }

    const allKeys = settings.geminiApiKeys;
    const model = settings.geminiModel || "gemini-2.5-flash";

    if (!allKeys.length) {
      // Graceful: no keys configured at all
      return NextResponse.json({
        success: true,
        provider: "gemini",
        model,
        reply: USER_FRIENDLY_REPLIES.default,
      });
    }

    // Determine which key to start from (round-robin)
    const startIndex = (settings.geminiCurrentIndex || 0) % allKeys.length;

    const dynamicVars = createAgentDynamicVariables({
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

    const systemInstruction = `You are the front-desk AI Receptionist for ${dynamicVars.business_name}.
Your job is to answer questions, guide visitors, and help book appointments warmly and concisely as a real human receptionist would.

BUSINESS DETAILS & KNOWLEDGE BASE:
${dynamicVars.business_description}

Offerings & Services:
${dynamicVars.business_offerings}

Team Roster:
${dynamicVars.business_team}

Knowledge Base:
${dynamicVars.business_knowledge}

Booking Instructions:
${dynamicVars.booking_instruction}

RULES:
1. Always introduce yourself as the front-desk AI receptionist for ${dynamicVars.business_name}.
2. Keep responses natural, warm, conversational, and concise (1-3 sentences max).
3. Do not invent fake availability; use provided offerings and business hours.
4. Speak naturally in standard, humanlike conversational English.`;

    // Build conversation history
    const contents: unknown[] = [];
    if (Array.isArray(history)) {
      for (const h of history as Array<{ role?: string; content?: string }>) {
        if (h.role && h.content) {
          contents.push({
            role: h.role === "user" ? "user" : "model",
            parts: [{ text: h.content }],
          });
        }
      }
    }
    contents.push({ role: "user", parts: [{ text: message }] });

    // Execute with rotation + graceful fallback
    const { reply, usedKeyIndex, usedModel } = await callGeminiWithRotation(
      allKeys,
      startIndex,
      model,
      contents,
      systemInstruction,
    );

    // Advance rotation index for next request (fire-and-forget, don't block response)
    const nextIndex = (usedKeyIndex + 1) % allKeys.length;
    getDb()
      .then((db) =>
        db
          .collection("platformSettings")
          .updateOne(
            { key: "elevenlabs" },
            { $set: { geminiCurrentIndex: nextIndex } },
            { upsert: true },
          ),
      )
      .catch(() => null);

    return NextResponse.json({ success: true, provider: "gemini", model: usedModel, reply });
  } catch (error) {
    // Final safety net — never show raw errors to the public
    console.error("Gemini chat route unhandled error", { siteSlug, error });
    return NextResponse.json(
      { success: true, provider: "gemini", model: "gemini-2.5-flash", reply: USER_FRIENDLY_REPLIES.default },
    );
  }
}
