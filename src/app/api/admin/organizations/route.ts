import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  createOrganizationForUser,
  getAllOrganizationsWithStats,
} from "@/lib/services/organizations";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || (session.role !== "admin" && !session.permissions.includes("admin:all"))) {
      return NextResponse.json({ error: "Unauthorized site admin access." }, { status: 403 });
    }

    const organizations = await getAllOrganizationsWithStats();
    return NextResponse.json({ organizations });
  } catch (error) {
    console.error("Admin list organizations error", error);
    return NextResponse.json({ error: "Failed to list business entities." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "admin" && !session.permissions.includes("admin:all"))) {
      return NextResponse.json({ error: "Unauthorized site admin access." }, { status: 403 });
    }

    const body = await request.json();
    const { name, timezone, currency, locale } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Business entity name is required." }, { status: 400 });
    }

    const organization = await createOrganizationForUser(
      session.user.id,
      name,
      timezone,
      currency,
      locale,
    );

    return NextResponse.json({ success: true, organization });
  } catch (error) {
    console.error("Admin create organization error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to provision business entity." },
      { status: 500 },
    );
  }
}
