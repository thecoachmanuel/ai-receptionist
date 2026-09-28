"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";

export interface UploadedImage {
  url: string;
  id: string;
}

export function useImageUpload() {
  const [uploading, setUploading] = useState(false);

  const uploadFile = useCallback(async (file: File): Promise<UploadedImage | null> => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10 MB");
      return null;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are accepted");
      return null;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/storage", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? "Upload failed");
      }
      const data: UploadedImage = await res.json();
      return data;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
      return null;
    } finally {
      setUploading(false);
    }
  }, []);

  /** Upload multiple files and return the URL array */
  const uploadFiles = useCallback(
    async (files: FileList | File[]): Promise<string[]> => {
      const results: string[] = [];
      for (const file of Array.from(files)) {
        const uploaded = await uploadFile(file);
        if (uploaded) results.push(uploaded.url);
      }
      return results;
    },
    [uploadFile],
  );

  return { uploadFile, uploadFiles, uploading };
}
