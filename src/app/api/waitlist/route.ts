import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/mongodb";
import { DbWaitlistEntry } from "@/lib/db/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    const db = await getDb();
    
    // Check for duplicates
    const existing = await db.collection("waitlist").findOne({ email: email.toLowerCase() });
    if (existing) {
      return NextResponse.json({ error: "Email is already on the waitlist" }, { status: 400 });
    }

    const entry: Omit<DbWaitlistEntry, "_id"> = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      createdAt: Date.now(),
    };

    await db.collection("waitlist").insertOne(entry);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Waitlist submission error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
