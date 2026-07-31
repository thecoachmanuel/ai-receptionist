import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/mongodb";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "admin" && !session.permissions.includes("admin:all"))) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    const db = await getDb();
    
    const messages = await db
      .collection("contactMessages")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Failed to list contact messages:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
