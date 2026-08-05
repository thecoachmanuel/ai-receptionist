import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { isUserAuthorizedForOrg, updateOrganizationPlan } from "@/lib/services/organizations";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { orgId, plan } = await request.json();
  if (!orgId || !plan) {
    return NextResponse.json({ error: "orgId and plan are required." }, { status: 400 });
  }

  if (plan !== "free_org" && plan !== "engage" && plan !== "voice") {
    return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
  }

  // Ensure user is authorized for the target organization and is an admin
  const isAuthorized = await isUserAuthorizedForOrg(session.user.id, orgId);
  if (!isAuthorized || (!session.isSuperAdmin && session.organization?.id !== orgId && session.role !== "admin")) {
    return NextResponse.json(
      { error: "Forbidden: You are not an administrator of this workspace." },
      { status: 403 },
    );
  }

  await updateOrganizationPlan(orgId, plan);

  return NextResponse.json({ success: true, plan });
}
