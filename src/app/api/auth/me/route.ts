import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getUserOrganizations } from "@/lib/services/organizations";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null, organization: null, userOrganizations: [] }, { status: 200 });
  }

  const userOrganizations = await getUserOrganizations(session.user.id);

  return NextResponse.json({
    user: session.user,
    organization: session.organization,
    userOrganizations,
    role: session.role,
    permissions: session.permissions,
  });
}
