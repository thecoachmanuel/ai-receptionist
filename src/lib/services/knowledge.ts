import { getDb } from "@/lib/db/mongodb";
import type { DbKnowledgeItem } from "@/lib/db/types";

export async function listKnowledgeItems(orgId: string, includeUnpublished = false) {
  const db = await getDb();
  const filter: Record<string, unknown> = { organizationId: orgId };
  if (!includeUnpublished) {
    filter.published = true;
  }

  const items = await db
    .collection<DbKnowledgeItem>("knowledgeItems")
    .find(filter)
    .sort({ sortOrder: 1 })
    .toArray();

  return items.map((k: any) => ({
    _id: k._id!.toString(),
    title: k.title,
    content: k.content,
    category: k.category,
    published: k.published,
    sortOrder: k.sortOrder,
    createdAt: k.createdAt,
    updatedAt: k.updatedAt,
  }));
}
