import { env } from "@/lib/env";

/** Public URL of a Vercel Blob object, built the way the SDK does (store id → per-store CDN host). */
export function blobPublicUrl(key: string): string {
  const storeId = env.blob.storeId;
  if (!storeId) throw new Error("Vercel Blob is not configured: connect a Blob store or set BLOB_READ_WRITE_TOKEN.");
  return `https://${storeId}.public.blob.vercel-storage.com/${key}`;
}
