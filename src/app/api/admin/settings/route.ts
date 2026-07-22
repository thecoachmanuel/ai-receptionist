import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  getElevenLabsSettings,
  getPlatformSettings,
  updateElevenLabsSettings,
  updateExchangeRate,
  updatePlanPrice,
  updatePlatformContact,
} from "@/lib/services/settings";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getSession();
    if (
      !session ||
      (session.role !== "admin" && !session.permissions.includes("admin:all"))
    ) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    const [settings, elevenlabs] = await Promise.all([
      getPlatformSettings(),
      getElevenLabsSettings(),
    ]);

    return NextResponse.json({ settings, elevenlabs });
  } catch (error) {
    console.error("Admin GET settings error", error);
    return NextResponse.json(
      { error: "Failed to load platform settings." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (
      !session ||
      (session.role !== "admin" && !session.permissions.includes("admin:all"))
    ) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    const body = await request.json();
    const {
      plan,
      usdPrice,
      usdToNgnRate,
      elevenLabsApiKeys,
      elevenLabsDefaultAgentId,
      contactPhone,
      contactEmail,
    } = body;

    if (usdToNgnRate !== undefined) {
      const rate = Number(usdToNgnRate);
      if (!Number.isFinite(rate) || rate <= 0) {
        return NextResponse.json(
          { error: "Exchange rate must be a positive number." },
          { status: 400 },
        );
      }
      await updateExchangeRate(rate);
    }

    if (plan !== undefined) {
      if (plan !== "core" && plan !== "engage" && plan !== "voice") {
        return NextResponse.json(
          { error: "Plan must be 'core', 'engage', or 'voice'." },
          { status: 400 },
        );
      }
      const price = Number(usdPrice);
      if (!Number.isFinite(price) || price < 0) {
        return NextResponse.json(
          { error: "Price must be a non-negative number." },
          { status: 400 },
        );
      }
      await updatePlanPrice(plan, price);
    }

    if (contactPhone !== undefined || contactEmail !== undefined) {
      await updatePlatformContact(contactPhone, contactEmail);
    }

    if (elevenLabsApiKeys !== undefined || elevenLabsDefaultAgentId !== undefined) {
      await updateElevenLabsSettings({
        apiKeys: elevenLabsApiKeys,
        defaultAgentId: elevenLabsDefaultAgentId,
      });
    }

    const [settings, elevenlabs] = await Promise.all([
      getPlatformSettings(),
      getElevenLabsSettings(),
    ]);

    return NextResponse.json({ success: true, settings, elevenlabs });
  } catch (error) {
    console.error("Admin PATCH settings error", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update platform settings.",
      },
      { status: 500 },
    );
  }
}
