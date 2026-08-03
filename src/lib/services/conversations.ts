import { getDb } from "@/lib/db/mongodb";
import type { DbConversation } from "@/lib/db/types";

export async function listRecentConversations(orgId: string, limit = 20) {
  const db = await getDb();
  const conversations = await db
    .collection<DbConversation>("conversations")
    .find({ organizationId: orgId })
    .sort({ startedAt: -1 })
    .limit(limit)
    .toArray();

  return conversations.map((c: any) => ({
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
  }));
}

export async function logConversation(
  orgId: string,
  data: {
    externalConversationId?: string;
    channel?: "web";
    status?: "active" | "completed" | "failed";
    caller?: string;
    transcript?: string;
    summary?: string;
    durationSeconds?: number;
    outcome?: string;
  },
) {
  const db = await getDb();
  const now = Date.now();

  // Truncate fields to prevent bloat in MongoDB storage
  const cleanSummary = data.summary
    ? data.summary.trim().slice(0, 1000)
    : "AI Conversation completed.";
  const cleanTranscript = data.transcript
    ? data.transcript.trim().slice(0, 1000)
    : undefined;

  const conversationDoc: DbConversation = {
    organizationId: orgId,
    externalConversationId:
      data.externalConversationId ||
      `conv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    channel: data.channel || "web",
    status: data.status || "completed",
    caller: data.caller ? data.caller.trim().slice(0, 150) : "Web Visitor",
    transcript: cleanTranscript,
    summary: cleanSummary,
    durationSeconds: data.durationSeconds || 0,
    outcome: data.outcome || "AI Assistant Interaction",
    startedAt: now,
    endedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  const res = await db.collection<DbConversation>("conversations").insertOne(conversationDoc);

  // Asynchronously prune conversations beyond the top 50 for this organization
  void (async () => {
    try {
      const excessDocs = await db
        .collection("conversations")
        .find({ organizationId: orgId }, { projection: { _id: 1 } })
        .sort({ startedAt: -1 })
        .skip(50)
        .toArray();

      if (excessDocs.length > 0) {
        const idsToDelete = excessDocs.map((doc) => doc._id);
        await db.collection("conversations").deleteMany({ _id: { $in: idsToDelete } });
      }
    } catch (err) {
      console.warn("Conversation cap pruning warning:", err);
    }
  })();

  return { ...conversationDoc, _id: res.insertedId.toString() };
}

export async function logPublicConversationBySlug(
  siteSlug: string,
  data: {
    caller?: string;
    transcript?: string;
    summary?: string;
    durationSeconds?: number;
  },
) {
  const db = await getDb();
  const normalizedSlug = siteSlug.trim().toLowerCase();
  const site = await db.collection("publicSites").findOne({ siteSlug: normalizedSlug });
  if (!site) throw new Error("Public site not found.");

  return logConversation(site.organizationId, {
    ...data,
    channel: "web",
    status: "completed",
    outcome: "Public Site AI Assistant Session",
  });
}
