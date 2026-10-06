import { env } from "@/lib/env";
import { blobPublicUrl } from "./blob-url";
import { LocalStorage } from "./local";
import type { StorageDriver } from "./types";

export type { StorageDriver } from "./types";

const globalForStorage = globalThis as unknown as { __hometourStorage?: StorageDriver };

async function createDriver(): Promise<StorageDriver> {
  if (env.storageDriver === "s3") {
    const { S3Storage } = await import("./s3");
    return new S3Storage();
  }
  if (env.storageDriver === "blob") {
    const { BlobStorage } = await import("./blob");
    return new BlobStorage();
  }
  if (process.env.VERCEL) {
    throw new Error("No media storage configured: connect a Vercel Blob store (or set STORAGE_DRIVER=s3) and redeploy.");
  }
  return new LocalStorage(env.storageDir);
}

let pending: Promise<StorageDriver> | null = null;

/** Media storage is deliberately separate from the database (local disk or any S3-compatible bucket). */
export async function storage(): Promise<StorageDriver> {
  if (globalForStorage.__hometourStorage) return globalForStorage.__hometourStorage;
  pending ??= createDriver().then((d) => (globalForStorage.__hometourStorage = d));
  return pending;
}

const KEY_RE = /^[a-z0-9][a-z0-9/_.-]*$/i;

export function assertSafeKey(key: string): void {
  if (!KEY_RE.test(key) || key.includes("..") || key.includes("//")) {
    throw new Error(`Unsafe storage key: ${key}`);
  }
}

/**
 * Public URL for a stored object. Local files are served by /files/*; Vercel Blob objects come
 * straight from its CDN; S3 objects use S3_PUBLIC_URL (CDN) when configured, otherwise they're
 * proxied through /files/*.
 */
export function publicUrl(key: string): string {
  const driver = env.storageDriver;
  if (driver === "blob") return blobPublicUrl(key);
  if (driver === "s3" && env.s3.publicUrl) return `${env.s3.publicUrl}/${key}`;
  return `/files/${key}`;
}
