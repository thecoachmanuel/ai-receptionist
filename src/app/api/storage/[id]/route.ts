import { NextRequest, NextResponse } from "next/server";
import { downloadFileFromGridFS, uploadFileToGridFS } from "@/lib/db/gridfs";
import { Readable } from "node:stream";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const fileData = await downloadFileFromGridFS(id);
  if (!fileData) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  // Convert Node Readable stream to Web ReadableStream
  const webStream = new ReadableStream({
    start(controller) {
      fileData.stream.on("data", (chunk: Buffer) => {
        controller.enqueue(new Uint8Array(chunk));
      });
      fileData.stream.on("end", () => {
        controller.close();
      });
      fileData.stream.on("error", (err: Error) => {
        controller.error(err);
      });
    },
  });

  return new NextResponse(webStream, {
    headers: {
      "Content-Type": fileData.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileId = await uploadFileToGridFS(
      buffer,
      file.name || "upload",
      file.type || "application/octet-stream",
    );

    const url = `/api/storage/${fileId}`;
    return NextResponse.json({ url, id: fileId });
  } catch (error) {
    console.error("Storage upload error", error);
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}
