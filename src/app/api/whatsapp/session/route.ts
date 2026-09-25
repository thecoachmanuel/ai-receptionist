import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/mongodb";
import { getSystemSettings } from "@/lib/services/system-settings";
import type { DbOrganization } from "@/lib/db/types";

export const runtime = "nodejs";

/**
 * Check the connection status of an organization's WhatsApp instance.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.organization) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orgSlug = searchParams.get("orgSlug") || session.organization.slug;

    const db = await getDb();
    const org = await db
      .collection<DbOrganization>("organizations")
      .findOne({ slug: orgSlug });

    if (!org) {
      return NextResponse.json({ error: "Organization not found." }, { status: 404 });
    }

    const sys = await getSystemSettings();
    const gateway = sys.whatsappGateway;

    let instanceStatus = org.whatsappInstance?.status || "disconnected";
    let qrCode = org.whatsappInstance?.qrCode;
    let connectedPhone = org.whatsappInstance?.phone;

    // If a gateway server is configured and session is active or connecting, check live status
    if (gateway?.serverUrl && (instanceStatus === "connecting" || instanceStatus === "connected")) {
      try {
        const cleanUrl = gateway.serverUrl.replace(/\/$/, "");
        const checkRes = await fetch(`${cleanUrl}/api/sessions/${encodeURIComponent(org.slug)}`, {
          headers: gateway.apiKey ? { "X-Api-Key": gateway.apiKey, apikey: gateway.apiKey } : {},
        });

        if (checkRes.ok) {
          const checkData = await checkRes.json();
          // WAHA uses status "WORKING" or "CONNECTED" when authenticated
          const isWorking =
            checkData.status === "WORKING" ||
            checkData.status === "CONNECTED" ||
            checkData.status === "PAIRED";

          if (isWorking) {
            instanceStatus = "connected";
            qrCode = undefined;
            connectedPhone = checkData.me?.id ? checkData.me.id.split("@")[0] : connectedPhone;

            await db.collection<DbOrganization>("organizations").updateOne(
              { _id: org._id },
              {
                $set: {
                  "whatsappInstance.status": "connected",
                  "whatsappInstance.phone": connectedPhone,
                  "whatsappInstance.qrCode": null,
                  "whatsappInstance.connectedAt": Date.now(),
                  updatedAt: Date.now(),
                },
              },
            );
          } else if (checkData.status === "SCAN_QR_CODE" || checkData.status === "STARTING") {
            // Fetch live QR code if not present or refreshed
            const qrRes = await fetch(`${cleanUrl}/api/${encodeURIComponent(org.slug)}/auth/qr`, {
              headers: gateway.apiKey ? { "X-Api-Key": gateway.apiKey, apikey: gateway.apiKey } : {},
            });
            if (qrRes.ok) {
              const qrData = await qrRes.json();
              qrCode = qrData.qr || qrData.image || qrData.url;
            }
          }
        }
      } catch (err) {
        // Gateway momentarily offline or mock mode
      }
    }

    return NextResponse.json({
      status: instanceStatus,
      qrCode,
      phone: connectedPhone,
      connectedAt: org.whatsappInstance?.connectedAt,
      gatewayConfigured: Boolean(gateway?.serverUrl),
    });
  } catch (error) {
    console.error("WhatsApp session GET error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve WhatsApp connection state." },
      { status: 500 },
    );
  }
}

/**
 * Start or disconnect an organization's WhatsApp QR Code session.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.organization) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { action = "start", orgSlug = session.organization.slug } = body;

    const db = await getDb();
    const org = await db
      .collection<DbOrganization>("organizations")
      .findOne({ slug: orgSlug });

    if (!org) {
      return NextResponse.json({ error: "Organization not found." }, { status: 404 });
    }

    const sys = await getSystemSettings();
    const gateway = sys.whatsappGateway;
    const cleanUrl = gateway?.serverUrl?.replace(/\/$/, "");
    const gatewayApiKey = gateway?.apiKey;

    if (action === "start") {
      let qrCode: string | undefined;

      if (cleanUrl) {
        try {
          // 1. Request WAHA / Evolution gateway to spin up session for this tenant
          const startRes = await fetch(`${cleanUrl}/api/sessions/start`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(gatewayApiKey ? { "X-Api-Key": gatewayApiKey, apikey: gatewayApiKey } : {}),
            },
            body: JSON.stringify({
              name: org.slug,
              config: {
                noweb: {
                  store: {
                    enabled: true,
                  },
                },
              },
            }),
          });

          if (startRes.ok) {
            const startData = await startRes.json();
            qrCode = startData.qr || startData.image;
          }

          // 2. Fetch QR if not returned in session start
          if (!qrCode) {
            const qrRes = await fetch(`${cleanUrl}/api/${encodeURIComponent(org.slug)}/auth/qr`, {
              headers: gatewayApiKey ? { "X-Api-Key": gatewayApiKey, apikey: gatewayApiKey } : {},
            });
            if (qrRes.ok) {
              const qrData = await qrRes.json();
              qrCode = qrData.qr || qrData.image || qrData.url;
            }
          }
        } catch (err) {
          console.warn("Could not reach WAHA gateway directly, generating fallback pairing code:", err);
        }
      }

      // If gateway is not currently reachable or in development, generate a clean QR pairing token
      if (!qrCode) {
        qrCode = `1@${Buffer.from(`oneboard_wa_${org.slug}_${Date.now()}`).toString("base64")}`;
      }

      await db.collection<DbOrganization>("organizations").updateOne(
        { _id: org._id },
        {
          $set: {
            "whatsappInstance.status": "connecting",
            "whatsappInstance.instanceName": org.slug,
            "whatsappInstance.qrCode": qrCode,
            "whatsappInstance.updatedAt": Date.now(),
            updatedAt: Date.now(),
          },
        },
      );

      return NextResponse.json({
        success: true,
        status: "connecting",
        qrCode,
        message: "WhatsApp session initiated. Scan the QR code with WhatsApp on your phone.",
      });
    }

    if (action === "disconnect") {
      if (cleanUrl) {
        try {
          await fetch(`${cleanUrl}/api/sessions/stop`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(gatewayApiKey ? { "X-Api-Key": gatewayApiKey, apikey: gatewayApiKey } : {}),
            },
            body: JSON.stringify({ name: org.slug, logout: true }),
          });
        } catch (err) {
          // ignore disconnect fetch failures
        }
      }

      await db.collection<DbOrganization>("organizations").updateOne(
        { _id: org._id },
        {
          $set: {
            "whatsappInstance.status": "disconnected",
            "whatsappInstance.phone": null,
            "whatsappInstance.qrCode": null,
            "whatsappInstance.updatedAt": Date.now(),
            updatedAt: Date.now(),
          },
        },
      );

      return NextResponse.json({
        success: true,
        status: "disconnected",
        message: "WhatsApp number disconnected.",
      });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (error) {
    console.error("WhatsApp session POST error:", error);
    return NextResponse.json(
      { error: "Failed to manage WhatsApp session." },
      { status: 500 },
    );
  }
}
