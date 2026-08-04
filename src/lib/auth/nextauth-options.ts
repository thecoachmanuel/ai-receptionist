import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { comparePassword, hashPassword } from "@/lib/auth/password";
import { getDb } from "@/lib/db/mongodb";
import type { DbUser } from "@/lib/db/types";
import { createOrganizationForUser } from "@/lib/services/organizations";
import { getSystemSettings } from "@/lib/services/system-settings";
import { ObjectId } from "mongodb";

function cleanEnv(val?: string): string {
  if (!val) return "";
  return val.replace(/^["']|["']$/g, "").trim();
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || "oneboard_fallback_secret_key_321",
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/sign-in",
    error: "/sign-in",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required.");
        }

        const normalizedEmail = credentials.email.trim().toLowerCase();
        const adminEmail = (cleanEnv(process.env.ADMIN_EMAIL) || "admin@admin.com").toLowerCase();
        const adminPassword = cleanEnv(process.env.ADMIN_PASSWORD) || "admin123";

        const db = await getDb();
        const escapedEmail = normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        let user = await db.collection<DbUser>("users").findOne({
          $or: [
            { email: normalizedEmail },
            { email: { $regex: `^${escapedEmail}$`, $options: "i" } },
          ],
        });

        const isSuperAdminUser = normalizedEmail === adminEmail;

        // Super Admin Authentication Logic
        if (isSuperAdminUser) {
          const isEnvPasswordValid = credentials.password === adminPassword;
          const isDbPasswordValid = user?.passwordHash ? await comparePassword(credentials.password, user.passwordHash) : false;

          if (!isEnvPasswordValid && !isDbPasswordValid) {
            throw new Error("Invalid email or password.");
          }

          const now = Date.now();
          if (!user) {
            const passwordHash = await hashPassword(credentials.password);
            const insertUserResult = await db.collection<DbUser>("users").insertOne({
              email: adminEmail,
              passwordHash,
              name: "System Admin",
              createdAt: now,
              updatedAt: now,
            });
            const userId = insertUserResult.insertedId.toString();
            const org = await createOrganizationForUser(userId, "Oneboard Admin Workspace");
            const activeOrgId = org._id.toString();

            await db.collection<DbUser>("users").updateOne(
              { _id: insertUserResult.insertedId },
              { $set: { activeOrgId } }
            );

            user = {
              _id: insertUserResult.insertedId,
              email: adminEmail,
              passwordHash,
              name: "System Admin",
              activeOrgId,
              createdAt: now,
              updatedAt: now,
            };
          } else if (isEnvPasswordValid) {
            const passwordHash = await hashPassword(adminPassword);
            await db.collection<DbUser>("users").updateOne(
              { _id: user._id },
              { $set: { passwordHash, updatedAt: now } }
            );
            user.passwordHash = passwordHash;
          }

          let activeOrgId = user.activeOrgId;
          let orgSlug = "";
          if (activeOrgId) {
            const org = await db.collection("organizations").findOne({
              $or: [
                { clerkOrgId: activeOrgId },
                { slug: activeOrgId },
                ...(activeOrgId.length === 24 ? [{ _id: new ObjectId(activeOrgId) }] : []),
              ],
            });
            if (org) orgSlug = (org as any).slug;
          }

          if (!orgSlug) {
            const org = await createOrganizationForUser(user._id!.toString(), "Oneboard Admin Workspace");
            activeOrgId = org._id.toString();
            orgSlug = org.slug;
            await db.collection<DbUser>("users").updateOne(
              { _id: user._id },
              { $set: { activeOrgId } }
            );
          }

          return {
            id: user._id!.toString(),
            email: user.email,
            name: user.name || "System Admin",
            activeOrgId,
            orgSlug,
            role: "admin",
            permissions: ["admin:all", "admin:full_control", "org:operations_hub:manage"],
            isSuperAdmin: true,
          };
        }

        // Standard User Authentication
        if (!user || !user.passwordHash) {
          throw new Error("Invalid email or password.");
        }

        const valid = await comparePassword(credentials.password, user.passwordHash);
        if (!valid) {
          throw new Error("Invalid email or password.");
        }

        let activeOrgId = user.activeOrgId;
        if (!activeOrgId) {
          const firstMember = await db.collection("organization_members").findOne({ userId: user._id!.toString() });
          if (firstMember) {
            activeOrgId = firstMember.organizationId;
            await db.collection<DbUser>("users").updateOne(
              { _id: user._id },
              { $set: { activeOrgId } }
            );
          } else {
            const org = await createOrganizationForUser(user._id!.toString(), `${user.name || "My"} Organization`);
            activeOrgId = org._id.toString();
            await db.collection<DbUser>("users").updateOne(
              { _id: user._id },
              { $set: { activeOrgId } }
            );
          }
        }

        let role: "admin" | "operator" | "member" = "admin";
        let permissions: string[] = [];
        let orgSlug = "";

        const org = await db.collection("organizations").findOne({
          $or: [
            { clerkOrgId: activeOrgId },
            { slug: activeOrgId },
            ...(activeOrgId && activeOrgId.length === 24 ? [{ _id: new ObjectId(activeOrgId) }] : []),
          ],
        });
        if (org) orgSlug = (org as any).slug;

        const membership = await db.collection("organization_members").findOne({
          userId: user._id!.toString(),
          organizationId: activeOrgId,
        });

        if (membership) {
          role = membership.role as any;
          permissions = membership.permissions || [];
        }

        return {
          id: user._id!.toString(),
          email: user.email,
          name: user.name || "",
          activeOrgId,
          orgSlug,
          role,
          permissions,
          isSuperAdmin: false,
        };
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "placeholder_id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "placeholder_secret",
    }),
  ],
  callbacks: {
    async signIn({ account, profile, user }) {
      if (account?.provider === "google") {
        const settings = await getSystemSettings();
        if (!settings.googleAuthEnabled) {
          throw new Error("Google Authentication has been disabled by the system administrator.");
        }

        const email = profile?.email?.toLowerCase();
        if (!email) return false;

        const db = await getDb();
        let dbUser = await db.collection<DbUser>("users").findOne({ email });

        const now = Date.now();
        if (!dbUser) {
          const insertResult = await db.collection<DbUser>("users").insertOne({
            email,
            name: profile?.name || user.name || "Google User",
            avatarUrl: user.image || (profile as any)?.picture || "",
            createdAt: now,
            updatedAt: now,
          });

          const userId = insertResult.insertedId.toString();
          const org = await createOrganizationForUser(userId, `${profile?.name || "My"} Organization`);
          const activeOrgId = org._id.toString();

          await db.collection<DbUser>("users").updateOne(
            { _id: insertResult.insertedId },
            { $set: { activeOrgId } }
          );

          user.id = userId;
          (user as any).activeOrgId = activeOrgId;
          (user as any).orgSlug = org.slug;
          (user as any).role = "admin";
          (user as any).permissions = ["admin:all"];
          (user as any).isSuperAdmin = false;
        } else {
          user.id = dbUser._id!.toString();
          let activeOrgId = dbUser.activeOrgId;

          if (!activeOrgId) {
            const firstMember = await db.collection("organization_members").findOne({ userId: dbUser._id!.toString() });
            if (firstMember) {
              activeOrgId = firstMember.organizationId;
            } else {
              const org = await createOrganizationForUser(dbUser._id!.toString(), `${dbUser.name || "My"} Organization`);
              activeOrgId = org._id.toString();
            }
            await db.collection<DbUser>("users").updateOne(
              { _id: dbUser._id },
              { $set: { activeOrgId, updatedAt: now } }
            );
          }

          let orgSlug = "";
          const org = await db.collection("organizations").findOne({
            $or: [
              { clerkOrgId: activeOrgId },
              { slug: activeOrgId },
              ...(activeOrgId && activeOrgId.length === 24 ? [{ _id: new ObjectId(activeOrgId) }] : []),
            ],
          });
          if (org) orgSlug = (org as any).slug;

          const adminEmail = (cleanEnv(process.env.ADMIN_EMAIL) || "admin@admin.com").toLowerCase();
          const isSuperAdmin = email === adminEmail;

          (user as any).activeOrgId = activeOrgId;
          (user as any).orgSlug = orgSlug;
          (user as any).role = isSuperAdmin ? "admin" : "admin";
          (user as any).permissions = isSuperAdmin ? ["admin:all"] : [];
          (user as any).isSuperAdmin = isSuperAdmin;
        }
      }

      return true;
    },

    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.userId = user.id;
        token.email = user.email;
        token.name = user.name;
        token.activeOrgId = (user as any).activeOrgId;
        token.orgSlug = (user as any).orgSlug;
        token.role = (user as any).role;
        token.permissions = (user as any).permissions;
        token.isSuperAdmin = (user as any).isSuperAdmin;
      }

      if (trigger === "update" && session) {
        if (session.activeOrgId) token.activeOrgId = session.activeOrgId;
        if (session.orgSlug) token.orgSlug = session.orgSlug;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.userId;
        (session.user as any).email = token.email;
        (session.user as any).name = token.name;
        (session as any).activeOrgId = token.activeOrgId;
        (session as any).orgSlug = token.orgSlug;
        (session as any).role = token.role;
        (session as any).permissions = token.permissions;
        (session as any).isSuperAdmin = token.isSuperAdmin;
      }
      return session;
    },
  },
};
