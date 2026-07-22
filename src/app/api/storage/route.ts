import { NextRequest, NextResponse } from "next/server";
import { uploadFileToGridFS } from "@/lib/db/gridfs";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    // Limit logo image uploads to 5MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Logo image size exceeds 5MB limit." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileId = await uploadFileToGridFS(
      buffer,
      file.name || "business_logo",
      file.type || "image/png",
    );

    const url = `/api/storage/${fileId}`;
    return NextResponse.json({ url, id: fileId, success: true });
  } catch (error) {
    console.error("Local file upload error", error);
    return NextResponse.json({ error: "Failed to upload logo file." }, { status: 500 });
  }
}
