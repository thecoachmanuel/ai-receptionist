import { GridFSBucket, ObjectId } from "mongodb";
import { getDb } from "./mongodb";

export async function getGridFSBucket(): Promise<GridFSBucket> {
  const db = await getDb();
  return new GridFSBucket(db, { bucketName: "uploads" });
}

export async function uploadFileToGridFS(
  buffer: Buffer,
  filename: string,
  contentType: string,
): Promise<string> {
  const bucket = await getGridFSBucket();
  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(filename, {
      metadata: { contentType },
    });
    uploadStream.on("finish", () => {
      resolve(uploadStream.id.toString());
    });
    uploadStream.on("error", (err: any) => {
      reject(err);
    });
    uploadStream.end(buffer);
  });
}

export async function downloadFileFromGridFS(idString: string): Promise<{
  stream: any;
  filename: string;
  contentType: string;
} | null> {
  try {
    const bucket = await getGridFSBucket();
    const id = new ObjectId(idString);
    const files = await bucket.find({ _id: id }).toArray();
    if (!files || files.length === 0) return null;
    const file = files[0];
    const stream = bucket.openDownloadStream(id);
    return {
      stream,
      filename: file.filename,
      contentType: file.metadata?.contentType || "application/octet-stream",
    };
  } catch {
    return null;
  }
}
