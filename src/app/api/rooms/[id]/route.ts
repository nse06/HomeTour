import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { floors, media } from "@/lib/db/schema";
import { requireOwnedRoom } from "@/lib/data/access";
import { toRoomDTO } from "@/lib/data/mappers";
import { deleteRoom, noteEdit, updateRoom } from "@/lib/data/mutations";
import { badRequest, json, readJson, route } from "@/lib/http";
import { roomPatchSchema } from "@/lib/validation";

export const PATCH = route(async (req, ctx: RouteContext<"/api/rooms/[id]">) => {
  const { id } = await ctx.params;
  const { user, room } = await requireOwnedRoom(id);
  const patch = await readJson(req, roomPatchSchema);
  if (patch.floorId) {
    const [floor] = await db
      .select({ id: floors.id })
      .from(floors)
      .where(and(eq(floors.id, patch.floorId), eq(floors.propertyId, room.propertyId)))
      .limit(1);
    if (!floor) throw badRequest("Floor not found.");
  }
  if (patch.coverMediaId) {
    const [m] = await db
      .select({ id: media.id })
      .from(media)
      .where(and(eq(media.id, patch.coverMediaId), eq(media.propertyId, room.propertyId)))
      .limit(1);
    if (!m) throw badRequest("Photo not found.");
  }
  const updated = await updateRoom(room, patch);
  await noteEdit(room.propertyId, user.id);
  return json({ room: toRoomDTO(updated) });
});

export const DELETE = route(async (_req, ctx: RouteContext<"/api/rooms/[id]">) => {
  const { id } = await ctx.params;
  const { user, room } = await requireOwnedRoom(id);
  await deleteRoom(room);
  await noteEdit(room.propertyId, user.id);
  return json({ ok: true });
});
