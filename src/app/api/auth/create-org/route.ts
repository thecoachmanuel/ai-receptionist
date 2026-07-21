import { NextRequest, NextResponse } from "next/server";
import { getSession, updateActiveOrganization } from "@/lib/auth/session";
import { createOrganizationForUser } from "@/lib/services/organizations";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { name } = await request.json();
  if (!name) {
    return NextResponse.json({ error: "Organization name is required." }, { status: 400 });
  }

  const org = await createOrganizationForUser(session.user.id, name);
  await updateActiveOrganization(session.user.id, org._id!.toString());

  return NextResponse.json({ success: true, slug: org.slug, id: org._id!.toString() });
}
