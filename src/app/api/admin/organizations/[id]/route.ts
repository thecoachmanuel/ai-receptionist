import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  deleteOrganizationData,
  updateOrganizationPlan,
} from "@/lib/services/organizations";

export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "admin" && !session.permissions.includes("admin:all"))) {
      return NextResponse.json({ error: "Unauthorized site admin access." }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { plan } = body;

    if (plan !== "free_org" && plan !== "engage" && plan !== "voice") {
      return NextResponse.json({ error: "Invalid plan specified." }, { status: 400 });
    }

    await updateOrganizationPlan(id, plan);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin update organization error", error);
    return NextResponse.json({ error: "Failed to update business entity." }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "admin" && !session.permissions.includes("admin:all"))) {
      return NextResponse.json({ error: "Unauthorized site admin access." }, { status: 403 });
    }

    const { id } = await params;
    const deleted = await deleteOrganizationData(id);

    if (!deleted) {
      return NextResponse.json({ error: "Business entity not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin delete organization error", error);
    return NextResponse.json({ error: "Failed to delete business entity." }, { status: 500 });
  }
}
