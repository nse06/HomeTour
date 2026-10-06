import { and, count, eq, inArray } from "drizzle-orm";
import { trackThrottled } from "@/lib/analytics/server";
import { db } from "@/lib/db";
import { media, rooms } from "@/lib/db/schema";
import { requireOwnedProperty } from "@/lib/data/access";
import { toMediaDTO } from "@/lib/data/mappers";
import { noteEdit } from "@/lib/data/mutations";
import { badRequest, HttpError, json, route } from "@/lib/http";
import { IngestError, ingestUpload, MAX_VIDEO_BYTES } from "@/lib/media/ingest";
import { maxPhotosPerTour } from "@/lib/plans";
import { readUpload } from "@/lib/upload";

/** Upload one photo / 360° photo / video. Body: raw bytes; ?filename=&roomId= */
export const POST = route(async (req, ctx: RouteContext<"/api/properties/[id]/media">) => {
  const { id } = await ctx.params;
  const { user } = await requireOwnedProperty(id);

  const [{ value: existing }] = await db
    .select({ value: count() })
    .from(media)
    .where(and(eq(media.propertyId, id), inArray(media.kind, ["photo", "pano", "video"])));
  const limit = maxPhotosPerTour(user);
  if (existing >= limit) throw new HttpError(403, `This tour has reached its ${limit}-photo limit.`, "limit");

  const roomId = new URL(req.url).searchParams.get("roomId");
  if (roomId) {
    const [room] = await db.select({ id: rooms.id }).from(rooms).where(and(eq(rooms.id, roomId), eq(rooms.propertyId, id))).limit(1);
    if (!room) throw badRequest("Room not found.");
  }

  const { bytes, filename } = await readUpload(req, MAX_VIDEO_BYTES);
  try {
    const row = await ingestUpload({ propertyId: id, bytes, filename, roomId });
    await trackThrottled({ type: "photos_uploaded", userId: user.id, propertyId: id });
    await noteEdit(id, user.id);
    return json({ media: toMediaDTO(row) });
  } catch (err) {
    if (err instanceof IngestError) throw badRequest(err.message);
    throw err;
  }
});
