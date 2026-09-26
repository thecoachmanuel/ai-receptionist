import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/mongodb";
import { broadcastSaasWhatsAppUpdate } from "@/lib/services/saas-whatsapp";

export const runtime = "nodejs";

/**
 * Super Admin: Get recent broadcasts and dispatch history.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.isSuperAdmin) {
      return NextResponse.json({ error: "Unauthorized. Super-admin access required." }, { status: 403 });
    }

    const db = await getDb();
    const broadcasts = await db
      .collection("saas_whatsapp_broadcasts")
      .find({})
      .sort({ createdAt: -1 })
      .limit(30)
      .toArray();

    const recentLogs = await db
      .collection("saas_whatsapp_logs")
      .find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    // Get count of tenant businesses with linked phone numbers
    const totalTenants = await db.collection("organizations").countDocuments({});
    const tenantsWithPhone = await db.collection("organizations").countDocuments({
      $or: [
        { "whatsappInstance.phone": { $exists: true, $ne: "" } },
        { contactPhone: { $exists: true, $ne: "" } },
      ],
    });

    return NextResponse.json({
      broadcasts,
      recentLogs,
      stats: {
        totalTenants,
        tenantsWithPhone,
      },
    });
  } catch (error) {
    console.error("Super Admin broadcast GET error:", error);
    return NextResponse.json({ error: "Failed to fetch broadcasts." }, { status: 500 });
  }
}

/**
 * Super Admin: Send a WhatsApp broadcast update to tenant businesses.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.isSuperAdmin) {
      return NextResponse.json({ error: "Unauthorized. Super-admin access required." }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { message, targetAudience = "all" } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ error: "Message content is required." }, { status: 400 });
    }

    const result = await broadcastSaasWhatsAppUpdate({
      message: message.trim(),
      targetAudience,
      adminEmail: session.user.email,
    });

    return NextResponse.json({
      ...result,
      message: `Broadcast completed. Sent to ${result.sentCount} businesses (${result.failedCount} failed or missing phone).`,
    });
  } catch (error) {
    console.error("Super Admin broadcast POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to dispatch broadcast." },
      { status: 500 },
    );
  }
}
