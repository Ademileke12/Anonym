import { createClient } from "@/services/supabase/client";

export type StorageBucket = "avatars" | "logos" | "banners" | "covers";

const MAX_DIMENSION: Record<StorageBucket, number> = {
  avatars: 512,
  logos: 512,
  banners: 1600,
  covers: 1600,
};

const MAX_BYTES = 2 * 1024 * 1024; // 2MB after compress target

/**
 * Resize/compress an image in the browser before upload.
 * Returns a JPEG/WebP Blob optimized for the bucket type.
 */
export async function optimizeImage(
  file: File,
  bucket: StorageBucket,
): Promise<Blob> {
  if (!file.type.startsWith("image/")) {
    throw new Error("File must be an image");
  }

  const maxDim = MAX_DIMENSION[bucket];
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const quality = bucket === "avatars" || bucket === "logos" ? 0.85 : 0.8;
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Compress failed"))),
      "image/jpeg",
      quality,
    );
  });

  if (blob.size > MAX_BYTES * 2) {
    throw new Error("Image is still too large after optimization");
  }
  return blob;
}

/**
 * Upload optimized image to Supabase Storage and return public URL.
 * Path: `{wallet}/{uuid}.jpg` under the given bucket.
 */
export async function uploadImage(params: {
  file: File;
  bucket: StorageBucket;
  wallet: string;
}): Promise<string> {
  const { file, bucket, wallet } = params;
  const supabase = createClient();
  const optimized = await optimizeImage(file, bucket);
  const path = `${wallet.toLowerCase()}/${crypto.randomUUID()}.jpg`;

  const { error } = await supabase.storage.from(bucket).upload(path, optimized, {
    contentType: "image/jpeg",
    upsert: false,
    cacheControl: "3600",
  });
  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
