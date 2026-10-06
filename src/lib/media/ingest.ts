import { createHash } from "node:crypto";
import { and, eq, max } from "drizzle-orm";
import { db } from "@/lib/db";
import { media, type Media, type MediaKind, type VariantName } from "@/lib/db/schema";
import { newId } from "@/lib/ids";
import { storage } from "@/lib/storage";
import { processImage, processPoster, variantsToRecord } from "./process";
import { sniff } from "./sniff";

export const MAX_IMAGE_BYTES = 40 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 150 * 1024 * 1024;

export class IngestError extends Error {}

const variantKey = (propertyId: string, mediaId: string, name: VariantName, ext = "webp") =>
  `m/${propertyId}/${mediaId}/${name}.${ext}`;

async function nextSortOrder(propertyId: string, roomId: string | null): Promise<number> {
  const [row] = await db
    .select({ value: max(media.sortOrder) })
    .from(media)
    .where(roomId ? and(eq(media.propertyId, propertyId), eq(media.roomId, roomId)) : eq(media.propertyId, propertyId));
  return (row?.value ?? -1) + 1;
}

/**
 * Validates, processes and stores an uploaded file, then records it.
 * Images get responsive WebP variants, a blur placeholder and a perceptual hash;
 * equirectangular panoramas are detected automatically; videos are stored as-is.
 */
export async function ingestUpload(input: {
  propertyId: string;
  bytes: Buffer;
  filename: string;
  kind?: "floorplan";
  roomId?: string | null;
  forcePanorama?: boolean;
}): Promise<Media> {
  const { propertyId, bytes, filename } = input;
  const type = sniff(bytes);

  if (type.kind === "heic") {
    throw new IngestError("HEIC photos aren't supported yet. Export as JPEG (or pick from your Photos library on iPhone).");
  }
  if (type.kind === "pdf") {
    throw new IngestError("PDFs are converted in the browser — please re-upload from the floor plan step.");
  }
  if (type.kind === "unknown") throw new IngestError("Unsupported file type. Use JPG, PNG, WebP, MP4 or MOV.");

  const id = newId();
  const store = await storage();
  const contentHash = createHash("sha256").update(bytes).digest("hex");
  const roomId = input.roomId ?? null;

  if (type.kind === "video") {
    if (input.kind === "floorplan") throw new IngestError("A floor plan must be an image or PDF.");
    if (bytes.byteLength > MAX_VIDEO_BYTES) throw new IngestError("Videos must be under 150 MB. For longer videos, paste a YouTube or Vimeo link.");
    const key = variantKey(propertyId, id, "video", type.ext);
    await store.put(key, bytes, type.mime);
    const [row] = await db
      .insert(media)
      .values({
        id,
        propertyId,
        roomId,
        kind: "video",
        status: "ready",
        originalKey: null,
        variants: { video: { key, width: 0, height: 0, bytes: bytes.byteLength } },
        mimeType: type.mime,
        sizeBytes: bytes.byteLength,
        originalFilename: filename.slice(0, 200),
        contentHash,
        sortOrder: await nextSortOrder(propertyId, roomId),
        roomAssignedBy: roomId ? "user" : null,
      })
      .returning();
    return row;
  }

  if (bytes.byteLength > MAX_IMAGE_BYTES) throw new IngestError("Images must be under 40 MB.");

  let processed;
  try {
    processed = await processImage(bytes, { kind: input.kind as MediaKind | undefined, forcePanorama: input.forcePanorama });
  } catch (err) {
    console.warn("[ingest] image processing failed", err);
    throw new IngestError("We couldn't read that image. Try exporting it again as JPG or PNG.");
  }

  const originalKey = `o/${propertyId}/${id}.${type.ext}`;
  await Promise.all([
    store.put(originalKey, bytes, type.mime),
    ...processed.variants.map((v) => store.put(variantKey(propertyId, id, v.name), v.buffer, "image/webp")),
  ]);

  const [row] = await db
    .insert(media)
    .values({
      id,
      propertyId,
      roomId: processed.kind === "floorplan" ? null : roomId,
      kind: processed.kind,
      status: "ready",
      originalKey,
      variants: variantsToRecord(processed.variants, (name) => variantKey(propertyId, id, name)),
      width: processed.width,
      height: processed.height,
      mimeType: type.mime,
      sizeBytes: bytes.byteLength,
      originalFilename: filename.slice(0, 200),
      contentHash,
      dhash: processed.dhash,
      blurDataUrl: processed.blurDataUrl,
      sortOrder: processed.kind === "floorplan" ? 0 : await nextSortOrder(propertyId, roomId),
      roomAssignedBy: roomId ? "user" : null,
    })
    .returning();
  return row;
}

/** Attaches a client-captured poster frame to an uploaded video. */
export async function attachPoster(video: Media, bytes: Buffer): Promise<Media> {
  const type = sniff(bytes);
  if (type.kind !== "image") throw new IngestError("Poster must be an image.");
  const poster = await processPoster(bytes);
  const key = variantKey(video.propertyId, video.id, "poster");
  await (await storage()).put(key, poster.buffer, "image/webp");
  const [row] = await db
    .update(media)
    .set({
      variants: { ...video.variants, poster: { key, width: poster.width, height: poster.height, bytes: poster.buffer.byteLength } },
      width: poster.width,
      height: poster.height,
      blurDataUrl: poster.blurDataUrl,
    })
    .where(eq(media.id, video.id))
    .returning();
  return row;
}

/** Deletes media rows and their stored objects. */
export async function deleteMediaObjects(rows: Media[]): Promise<void> {
  const keys = rows.flatMap((m) => [
    ...(m.originalKey ? [m.originalKey] : []),
    ...Object.values(m.variants ?? {}).flatMap((v) => (v ? [v.key] : [])),
  ]);
  if (keys.length) {
    try {
      await (await storage()).delete(keys);
    } catch (err) {
      console.warn("[media] failed to delete objects", err);
    }
  }
}
