import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { env } from "@/lib/env";
import { contentTypeForKey, type StorageDriver, type StoredObject } from "./types";

/** Any S3-compatible bucket: AWS S3, Cloudflare R2, Backblaze B2, MinIO… */
export class S3Storage implements StorageDriver {
  private client: S3Client;
  private bucket: string;

  constructor() {
    if (!env.s3.bucket) throw new Error("STORAGE_DRIVER=s3 requires S3_BUCKET");
    this.bucket = env.s3.bucket;
    this.client = new S3Client({
      region: env.s3.region,
      endpoint: env.s3.endpoint,
      forcePathStyle: env.s3.forcePathStyle,
      credentials:
        env.s3.accessKeyId && env.s3.secretAccessKey
          ? { accessKeyId: env.s3.accessKeyId, secretAccessKey: env.s3.secretAccessKey }
          : undefined,
    });
  }

  async put(key: string, body: Uint8Array, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        // Keys are unique per upload, so objects are immutable and CDN-cacheable forever.
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
  }

  async get(key: string): Promise<StoredObject | null> {
    try {
      const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      if (!res.Body) return null;
      return {
        body: await res.Body.transformToByteArray(),
        contentType: res.ContentType || contentTypeForKey(key),
      };
    } catch (err) {
      if ((err as { name?: string }).name === "NoSuchKey") return null;
      throw err;
    }
  }

  async size(key: string): Promise<number | null> {
    try {
      const res = await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return res.ContentLength ?? null;
    } catch {
      return null;
    }
  }

  async getRange(key: string, start: number, end: number): Promise<ReadableStream<Uint8Array> | null> {
    try {
      const res = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key, Range: `bytes=${start}-${end}` }),
      );
      return (res.Body?.transformToWebStream() as ReadableStream<Uint8Array>) ?? null;
    } catch {
      return null;
    }
  }

  async delete(keys: string[]): Promise<void> {
    for (let i = 0; i < keys.length; i += 1000) {
      const chunk = keys.slice(i, i + 1000);
      if (chunk.length === 0) continue;
      await this.client.send(
        new DeleteObjectsCommand({
          Bucket: this.bucket,
          Delete: { Objects: chunk.map((Key) => ({ Key })), Quiet: true },
        }),
      );
    }
  }
}
