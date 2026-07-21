import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db/mongodb";
import type { DbOrgMember, DbOrganization, DbSession, DbUser } from "@/lib/db/types";
import { PLAN_FEATURES } from "@/lib/billing";

const SESSION_COOKIE_NAME = "switchboard_session";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export type ActiveAuthContext = {
  user: {
    id: string;
    email: string;
    name: string;
    avatarUrl?: string;
  };
  organization: {
    id: string;
    clerkOrgId: string;
    name: string;
    slug: string;
    timezone: string;
    currency: string;
    locale: string;
    plan: string;
  } | null;
  role?: "admin" | "operator" | "member";
  permissions: string[];
};

export async function createSession(userId: string, activeOrgId?: string): Promise<string> {
  const db = await getDb();
  const token = randomBytes(32).toString("hex");
  const expiresAt = Date.now() + SESSION_DURATION_MS;

  await db.collection<DbSession>("sessions").insertOne({
    token,
    userId,
    activeOrgId,
    expiresAt,
    createdAt: Date.now(),
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  });

  return token;
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    const db = await getDb();
    await db.collection<DbSession>("sessions").deleteOne({ token });
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function updateActiveOrganization(userId: string, orgId: string): Promise<void> {
  const db = await getDb();
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    await db.collection<DbSession>("sessions").updateOne(
      { token },
      { $set: { activeOrgId: orgId } },
    );
  }

  const userObjectId = ObjectId.isValid(userId) ? new ObjectId(userId) : userId;
  await db.collection<DbUser>("users").updateOne(
    { _id: userObjectId as ObjectId },
    { $set: { activeOrgId: orgId } },
  );
}

export async function getSession(): Promise<ActiveAuthContext | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) return null;

    const db = await getDb();
    const session = await db.collection<DbSession>("sessions").findOne({ token });

    if (!session || session.expiresAt < Date.now()) {
      if (session) {
        await db.collection<DbSession>("sessions").deleteOne({ token });
      }
      return null;
    }

    const userObjectId = ObjectId.isValid(session.userId)
      ? new ObjectId(session.userId)
      : session.userId;
    const user = await db.collection<DbUser>("users").findOne({ _id: userObjectId as ObjectId });

    if (!user) return null;

    let targetOrgId = session.activeOrgId || user.activeOrgId;
    let organization: DbOrganization | null = null;
    let orgMember: DbOrgMember | null = null;

    if (targetOrgId) {
      if (ObjectId.isValid(targetOrgId)) {
        organization = await db
          .collection<DbOrganization>("organizations")
          .findOne({ _id: new ObjectId(targetOrgId) });
      }
      if (!organization) {
        organization = await db
          .collection<DbOrganization>("organizations")
          .findOne({ clerkOrgId: targetOrgId });
      }
    }

    if (!organization) {
      const firstMember = await db
        .collection<DbOrgMember>("orgMembers")
        .findOne({ userId: user._id!.toString() });

      if (firstMember) {
        organization = await db
          .collection<DbOrganization>("organizations")
          .findOne({ _id: new ObjectId(firstMember.organizationId) });
      }
    }

    if (organization && organization._id) {
      const orgIdStr = organization._id.toString();
      const userIdStr = user._id!.toString();
      orgMember = await db.collection<DbOrgMember>("orgMembers").findOne({
        organizationId: orgIdStr,
        userId: userIdStr,
      });
    }

    const role = orgMember?.role || "member";
    const features = PLAN_FEATURES[organization?.plan || "free_org"] || PLAN_FEATURES.free_org;
    const permissions: string[] = [];

    if (role === "admin" || role === "operator" || features.includes("operations_hub")) {
      permissions.push("org:operations_hub:manage");
    }

    return {
      user: {
        id: user._id!.toString(),
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
      organization: organization
        ? {
            id: organization._id.toString(),
            clerkOrgId: organization.clerkOrgId,
            name: organization.name,
            slug: organization.slug,
            timezone: organization.timezone,
            currency: organization.currency,
            locale: organization.locale,
            plan: organization.plan || "free_org",
          }
        : null,
      role,
      permissions,
    };
  } catch (error) {
    console.error("Error getting auth session", error);
    return null;
  }
}

export async function requireAuth(): Promise<ActiveAuthContext> {
  const session = await getSession();
  if (!session) {
    throw new Error("Authentication required.");
  }
  return session;
}

export async function requireOrgAdmin(): Promise<ActiveAuthContext> {
  const session = await requireAuth();
  if (session.role !== "admin") {
    throw new Error("Organization admin access required.");
  }
  return session;
}

export async function requireOrgOperator(): Promise<ActiveAuthContext> {
  const session = await requireAuth();
  if (session.role !== "admin" && session.role !== "operator") {
    throw new Error("Organization operator access required.");
  }
  return session;
}
