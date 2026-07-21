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

  return conversations.map((c) => ({
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
