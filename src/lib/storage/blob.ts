import { del, head, put } from "@vercel/blob";
import { blobPublicUrl as blobUrl } from "./blob-url";
import { contentTypeForKey, type StorageDriver, type StoredObject } from "./types";

/**
 * Vercel Blob (a public store). Credentials come from the environment — BLOB_READ_WRITE_TOKEN,
 * or OIDC with BLOB_STORE_ID — and are resolved by the SDK itself.
 */
export class BlobStorage implements StorageDriver {
  async put(key: string, body: Uint8Array, contentType: string): Promise<void> {
    await put(key, Buffer.from(body.buffer, body.byteOffset, body.byteLength), {
      access: "public",
      contentType,
      addRandomSuffix: false,
      // Re-processing a photo (e.g. marking it 360°) rewrites its variants in place.
      allowOverwrite: true,
      cacheControlMaxAge: 31536000,
    });
  }

  async get(key: string): Promise<StoredObject | null> {
    const res = await fetch(blobUrl(key), { cache: "no-store" });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Blob read failed (${res.status}) for ${key}`);
    return { body: new Uint8Array(await res.arrayBuffer()), contentType: res.headers.get("content-type") || contentTypeForKey(key) };
  }

  async size(key: string): Promise<number | null> {
    try {
      return (await head(blobUrl(key))).size;
    } catch {
      return null;
    }
  }

  async getRange(key: string, start: number, end: number): Promise<ReadableStream<Uint8Array> | null> {
    const res = await fetch(blobUrl(key), { headers: { Range: `bytes=${start}-${end}` }, cache: "no-store" });
    return res.ok ? res.body : null;
  }

  async delete(keys: string[]): Promise<void> {
    for (let i = 0; i < keys.length; i += 500) {
      const chunk = keys.slice(i, i + 500);
      if (chunk.length) await del(chunk.map(blobUrl));
    }
  }
}
