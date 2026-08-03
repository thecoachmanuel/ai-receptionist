import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/mongodb";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.permissions.includes("admin:all")) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    const db = await getDb();
    
    const waitlist = await db
      .collection("waitlist")
      .find()
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({ waitlist });
  } catch (error) {
    console.error("Admin GET waitlist error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
