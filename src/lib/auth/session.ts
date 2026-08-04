import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/mongodb";
import type { DbOrgMember, DbOrganization, DbSession, DbUser } from "@/lib/db/types";
import { PLAN_FEATURES } from "@/lib/billing";
import { createOrganizationForUser } from "@/lib/services/organizations";

export const SESSION_COOKIE_NAME = "oneboard_session";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Explicitly sets the session cookie on a NextResponse.
 * Must be used instead of cookies().set() because cookies().set() inside
 * Route Handlers does NOT reliably add Set-Cookie to the HTTP response on
 * all runtimes and mobile browsers.
 */
export function applySessionCookie(response: NextResponse, token: string): NextResponse {
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(Date.now() + SESSION_DURATION_MS),
  });
  return response;
}

/**
 * Explicitly clears the session cookie on a NextResponse.
 */
export function clearSessionCookie(response: NextResponse): NextResponse {
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}

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
  isSuperAdmin: boolean;
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

  try {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(expiresAt),
    });
  } catch {
    // Ignore if cookies() is read-only in current context
  }

  return token;
}

export async function clearSession(): Promise<void> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (token) {
      const db = await getDb();
      await db.collection<DbSession>("sessions").deleteOne({ token });
    }

    cookieStore.delete(SESSION_COOKIE_NAME);
  } catch {
    // Ignore if cookies() is read-only in current context
  }
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

    const userFilters: any[] = [{ _id: session.userId as any }];
    if (ObjectId.isValid(session.userId)) {
      userFilters.push({ _id: new ObjectId(session.userId) });
    }
    const user = await db.collection<DbUser>("users").findOne({ $or: userFilters });

    if (!user) return null;

    let targetOrgId = session.activeOrgId || user.activeOrgId;
    let organization: DbOrganization | null = null;
    let orgMember: DbOrgMember | null = null;

    if (targetOrgId) {
      const orgFilters: any[] = [{ clerkOrgId: targetOrgId }, { slug: targetOrgId }];
      if (ObjectId.isValid(targetOrgId)) {
        orgFilters.unshift({ _id: new ObjectId(targetOrgId) });
      }
      organization = await db.collection<DbOrganization>("organizations").findOne({ $or: orgFilters });
    }

    const userIdStr = user._id!.toString();
    if (!organization) {
      const firstMember = await db
        .collection<DbOrgMember>("orgMembers")
        .findOne({ $or: [{ userId: userIdStr }, { userId: user._id as any }] });

      if (firstMember) {
        const orgIdStr = firstMember.organizationId;
        const orgFilters: any[] = [{ clerkOrgId: orgIdStr }, { slug: orgIdStr }];
        if (ObjectId.isValid(orgIdStr)) {
          orgFilters.unshift({ _id: new ObjectId(orgIdStr) });
        }
        organization = await db.collection<DbOrganization>("organizations").findOne({ $or: orgFilters });
      }
    }

    const adminEmail = (process.env.ADMIN_EMAIL ? process.env.ADMIN_EMAIL.replace(/^["']|["']$/g, "").trim() : "admin@admin.com").toLowerCase();
    const isSiteAdmin = user.email.trim().toLowerCase() === adminEmail;

    if (!organization) {
      organization = await db.collection<DbOrganization>("organizations").findOne({});
    }

    if (!organization) {
      const newOrg = await createOrganizationForUser(userIdStr, `${user.name || "Default"}'s Workspace`);
      organization = newOrg as any;
    }

    if (organization && organization._id) {
      const orgIdStr = organization._id.toString();
      orgMember = await db.collection<DbOrgMember>("orgMembers").findOne({
        organizationId: orgIdStr,
        $or: [{ userId: userIdStr }, { userId: user._id as any }],
      });
    }

    let role: "admin" | "operator" | "member" = orgMember?.role || "member";
    if (isSiteAdmin) {
      role = "admin";
    }

    const features = PLAN_FEATURES[organization?.plan || "free_org"] || PLAN_FEATURES.free_org;
    const permissions: string[] = [];

    if (role === "admin" || role === "operator" || features.includes("operations_hub")) {
      permissions.push("org:operations_hub:manage");
    }
    if (isSiteAdmin) {
      permissions.push("admin:all", "admin:full_control");
    }

    return {
      user: {
        id: userIdStr,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
      organization: organization && organization._id
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
      isSuperAdmin: isSiteAdmin,
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
  if (session.role !== "admin" && !session.permissions.includes("admin:all")) {
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
