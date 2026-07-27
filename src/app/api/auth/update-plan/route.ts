import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { updateOrganizationPlan } from "@/lib/services/organizations";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (session.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const { orgId, plan } = await request.json();
  if (!orgId || !plan) {
    return NextResponse.json({ error: "orgId and plan are required." }, { status: 400 });
  }

  if (plan !== "free_org" && plan !== "engage" && plan !== "voice") {
    return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
  }

  await updateOrganizationPlan(orgId, plan);

  return NextResponse.json({ success: true, plan });
}
