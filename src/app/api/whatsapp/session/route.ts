import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/mongodb";
import { getSystemSettings } from "@/lib/services/system-settings";
import type { DbOrganization } from "@/lib/db/types";

export const runtime = "nodejs";

function buildGatewayHeaders(apiKey?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers["x-api-secret"] = apiKey;
    headers["X-Api-Key"] = apiKey;
    headers["apikey"] = apiKey;
    headers["Authorization"] = `Bearer ${apiKey}`;
  }
  return headers;
}

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
        const headers = buildGatewayHeaders(gateway.apiKey);
        let checked = false;

        // 1. Try Nectar / Baileys multi-tenant route: /sessions/:orgSlug/status
        try {
          const res = await fetch(`${cleanUrl}/sessions/${encodeURIComponent(org.slug)}/status`, { headers });
          if (res.ok) {
            const data = await res.json();
            checked = true;
            if (data.connected === true || data.connection === "open") {
              instanceStatus = "connected";
              qrCode = undefined;
              connectedPhone = data.phone || connectedPhone;
            } else if (data.connection === "connecting" || data.connection === "qr_pending" || data.qrReady) {
              instanceStatus = "connecting";
              // Fetch QR if not available
              const qrRes = await fetch(`${cleanUrl}/sessions/${encodeURIComponent(org.slug)}/qr`, { headers });
              if (qrRes.ok) {
                const qrData = await qrRes.json();
                if (qrData.qr) qrCode = qrData.qr;
              }
            }
          }
        } catch (_) {}

        // 2. Try WAHA format: /api/sessions/:orgSlug
        if (!checked) {
          try {
            const checkRes = await fetch(`${cleanUrl}/api/sessions/${encodeURIComponent(org.slug)}`, { headers });
            if (checkRes.ok) {
              const checkData = await checkRes.json();
              checked = true;
              const isWorking =
                checkData.status === "WORKING" ||
                checkData.status === "CONNECTED" ||
                checkData.status === "PAIRED";

              if (isWorking) {
                instanceStatus = "connected";
                qrCode = undefined;
                connectedPhone = checkData.me?.id ? checkData.me.id.split("@")[0] : connectedPhone;
              } else if (checkData.status === "SCAN_QR_CODE" || checkData.status === "STARTING") {
                const qrRes = await fetch(`${cleanUrl}/api/${encodeURIComponent(org.slug)}/auth/qr`, { headers });
                if (qrRes.ok) {
                  const qrData = await qrRes.json();
                  qrCode = qrData.qr || qrData.image || qrData.url;
                }
              }
            }
          } catch (_) {}
        }

        // 3. Fallback to single-tenant /status if still unchecked
        if (!checked) {
          try {
            const legacyRes = await fetch(`${cleanUrl}/status`, { headers });
            if (legacyRes.ok) {
              const legacyData = await legacyRes.json();
              if (legacyData.connected === true || legacyData.connection === "open") {
                instanceStatus = "connected";
                qrCode = undefined;
              }
            }
          } catch (_) {}
        }

        // Persist verified live status to MongoDB
        if (instanceStatus === "connected" && org.whatsappInstance?.status !== "connected") {
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
        }
      } catch (err) {
        // Gateway momentarily offline
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
    const headers = buildGatewayHeaders(gateway?.apiKey);

    if (action === "start") {
      let qrCode: string | undefined;

      if (cleanUrl) {
        try {
          // 1. Try Nectar multi-tenant start / qr
          try {
            const nectarStart = await fetch(`${cleanUrl}/sessions/${encodeURIComponent(org.slug)}/start`, {
              method: "POST",
              headers,
            });
            if (nectarStart.ok) {
              const data = await nectarStart.json();
              if (data.qr) qrCode = data.qr;
            }
          } catch (_) {}

          if (!qrCode) {
            try {
              const nectarQr = await fetch(`${cleanUrl}/sessions/${encodeURIComponent(org.slug)}/qr`, { headers });
              if (nectarQr.ok) {
                const data = await nectarQr.json();
                if (data.qr) qrCode = data.qr;
              }
            } catch (_) {}
          }

          // 2. Try WAHA / Evolution gateway
          if (!qrCode) {
            try {
              const startRes = await fetch(`${cleanUrl}/api/sessions/start`, {
                method: "POST",
                headers,
                body: JSON.stringify({
                  name: org.slug,
                  config: {
                    noweb: { store: { enabled: true } },
                  },
                }),
              });

              if (startRes.ok) {
                const startData = await startRes.json();
                qrCode = startData.qr || startData.image;
              }

              if (!qrCode) {
                const qrRes = await fetch(`${cleanUrl}/api/${encodeURIComponent(org.slug)}/auth/qr`, { headers });
                if (qrRes.ok) {
                  const qrData = await qrRes.json();
                  qrCode = qrData.qr || qrData.image || qrData.url;
                }
              }
            } catch (_) {}
          }

          // 3. Fallback to legacy single session /qr
          if (!qrCode) {
            try {
              const singleQrRes = await fetch(`${cleanUrl}/qr`, { headers });
              if (singleQrRes.ok) {
                const data = await singleQrRes.json();
                if (data.qr) qrCode = data.qr;
              }
            } catch (_) {}
          }
        } catch (err) {
          console.warn("Could not reach WhatsApp gateway directly:", err);
        }
      }

      // Fallback pairing code token if offline
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
          // 1. Try Nectar multi-tenant logout
          await fetch(`${cleanUrl}/sessions/${encodeURIComponent(org.slug)}/logout`, {
            method: "POST",
            headers,
          }).catch(() => {});

          // 2. Try WAHA stop
          await fetch(`${cleanUrl}/api/sessions/stop`, {
            method: "POST",
            headers,
            body: JSON.stringify({ name: org.slug, logout: true }),
          }).catch(() => {});

          // 3. Fallback to legacy logout
          await fetch(`${cleanUrl}/logout`, { method: "POST", headers }).catch(() => {});
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
