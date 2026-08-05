import { NextRequest, NextResponse } from "next/server";
import { getSession, updateActiveOrganization } from "@/lib/auth/session";
import { getOrganizationByIdOrSlug, isUserAuthorizedForOrg } from "@/lib/services/organizations";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { orgIdOrSlug } = await request.json();
  if (!orgIdOrSlug) {
    return NextResponse.json({ error: "Organization required." }, { status: 400 });
  }

  const org = await getOrganizationByIdOrSlug(orgIdOrSlug);
  if (!org) {
    return NextResponse.json({ error: "Organization not found." }, { status: 404 });
  }

  const isAuthorized = await isUserAuthorizedForOrg(session.user.id, org._id!.toString());
  if (!isAuthorized) {
    return NextResponse.json(
      { error: "Forbidden: You do not have access to this workspace." },
      { status: 403 },
    );
  }

  await updateActiveOrganization(session.user.id, org._id!.toString());

  return NextResponse.json({ success: true, slug: org.slug, id: org._id!.toString() });
}
