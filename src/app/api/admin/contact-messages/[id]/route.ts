import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/mongodb";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !session.permissions.includes("admin:all")) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    const db = await getDb();
    const body = await req.json();
    const { status } = body;
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    if (status !== "read" && status !== "unread") {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const result = await db.collection("contactMessages").updateOne(
      { _id: new ObjectId(id) },
      { $set: { status, updatedAt: Date.now() } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update message:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !session.permissions.includes("admin:all")) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    const db = await getDb();
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const result = await db.collection("contactMessages").deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete message:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
