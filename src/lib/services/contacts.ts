import { getDb } from "@/lib/db/mongodb";
import type { DbContact } from "@/lib/db/types";
import { normalizedEmail, normalizedPhone, optionalTrimmed, requiredTrimmed } from "@/lib/validation";

export async function listContacts(orgId: string, limit = 200) {
  const db = await getDb();
  const contacts = await db
    .collection<DbContact>("contacts")
    .find({ organizationId: orgId })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .toArray();

  return contacts.map((c: any) => ({
    _id: c._id!.toString(),
    name: c.name,
    email: c.email,
    phone: c.phone,
    notes: c.notes,
    tags: c.tags || [],
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }));
}

export async function upsertContact(
  orgId: string,
  data: {
    name: string;
    email?: string;
    phone?: string;
    notes?: string;
    tags?: string[];
  },
) {
  const db = await getDb();
  const name = requiredTrimmed(data.name, "name", 120);
  const email = normalizedEmail(data.email);
  const phone = normalizedPhone(data.phone);
  const now = Date.now();

  const query: Record<string, unknown>[] = [{ organizationId: orgId, name }];
  if (email) query.push({ organizationId: orgId, emailNormalized: email });
  if (phone) query.push({ organizationId: orgId, phoneNormalized: phone });

  const existing = await db.collection<DbContact>("contacts").findOne({
    $or: query,
  });

  if (existing) {
    const updates: Partial<DbContact> = { updatedAt: now };
    if (name) updates.name = name;
    if (email) {
      updates.email = email;
      updates.emailNormalized = email;
    }
    if (phone) {
      updates.phone = phone;
      updates.phoneNormalized = phone;
    }
    if (data.notes) updates.notes = data.notes;
    if (data.tags) {
      updates.tags = Array.from(new Set([...(existing.tags || []), ...data.tags]));
    }

    await db.collection<DbContact>("contacts").updateOne({ _id: existing._id }, { $set: updates });
    return { ...existing, ...updates, _id: existing._id!.toString() };
  }

  const newContact: DbContact = {
    organizationId: orgId,
    name,
    email,
    emailNormalized: email,
    phone,
    phoneNormalized: phone,
    notes: optionalTrimmed(data.notes, "notes", 1000),
    tags: data.tags || ["client"],
    createdAt: now,
    updatedAt: now,
  };

  const res = await db.collection<DbContact>("contacts").insertOne(newContact);
  return { ...newContact, _id: res.insertedId.toString() };
}
