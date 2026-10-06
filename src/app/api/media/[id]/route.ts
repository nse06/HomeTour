import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { media } from "@/lib/db/schema";
import { requireOwnedMedia } from "@/lib/data/access";
import { toMediaDTO } from "@/lib/data/mappers";
import { deleteMedia, moveMedia, noteEdit } from "@/lib/data/mutations";
import { badRequest, json, readJson, route } from "@/lib/http";
import { IngestError, reprocessMedia } from "@/lib/media/ingest";
import { mediaPatchSchema } from "@/lib/validation";

export const PATCH = route(async (req, ctx: RouteContext<"/api/media/[id]">) => {
  const { id } = await ctx.params;
  const { user, media: row } = await requireOwnedMedia(id);
  const patch = await readJson(req, mediaPatchSchema);

  if (patch.roomId !== undefined && patch.roomId !== row.roomId) {
    try {
      await moveMedia(row.propertyId, [row.id], patch.roomId);
    } catch {
      throw badRequest("Room not found.");
    }
  }
  if (patch.caption !== undefined) {
    await db.update(media).set({ caption: patch.caption }).where(eq(media.id, id));
  }
  if (patch.kind && patch.kind !== row.kind && (row.kind === "photo" || row.kind === "pano")) {
    try {
      await reprocessMedia(row, { forcePanorama: patch.kind === "pano" });
    } catch (err) {
      if (err instanceof IngestError) throw badRequest(err.message);
      throw err;
    }
  }
  const [updated] = await db.select().from(media).where(eq(media.id, id)).limit(1);
  await noteEdit(row.propertyId, user.id);
  return json({ media: toMediaDTO(updated) });
});

export const DELETE = route(async (_req, ctx: RouteContext<"/api/media/[id]">) => {
  const { id } = await ctx.params;
  const { user, media: row } = await requireOwnedMedia(id);
  await deleteMedia(row.propertyId, [id]);
  await noteEdit(row.propertyId, user.id);
  return json({ ok: true });
});
