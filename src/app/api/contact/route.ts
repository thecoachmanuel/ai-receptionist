import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/mongodb";
import { DbContactMessage } from "@/lib/db/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Name, email, and message are required." },
        { status: 400 }
      );
    }

    const db = await getDb();
    
    const contactMessage: Omit<DbContactMessage, "_id"> = {
      name,
      email,
      phone: phone || undefined,
      message,
      status: "unread",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await db.collection("contactMessages").insertOne(contactMessage);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to capture contact message:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
