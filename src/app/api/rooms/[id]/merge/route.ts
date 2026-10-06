import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { rooms } from "@/lib/db/schema";
import { requireOwnedRoom } from "@/lib/data/access";
import { toRoomDTO } from "@/lib/data/mappers";
import { mergeRooms, noteEdit } from "@/lib/data/mutations";
import { badRequest, json, readJson, route } from "@/lib/http";

/** Merge this room into `targetId` (photos move, this room is removed). */
export const POST = route(async (req, ctx: RouteContext<"/api/rooms/[id]/merge">) => {
  const { id } = await ctx.params;
  const { user, room } = await requireOwnedRoom(id);
  const { targetId } = await readJson(req, z.object({ targetId: z.string().max(40) }));
  if (targetId === id) throw badRequest("Pick a different room to merge into.");
  const [target] = await db.select().from(rooms).where(eq(rooms.id, targetId)).limit(1);
  if (!target || target.propertyId !== room.propertyId) throw badRequest("Room not found.");
  await mergeRooms(room, target);
  const [updated] = await db.select().from(rooms).where(eq(rooms.id, targetId)).limit(1);
  await noteEdit(room.propertyId, user.id);
  return json({ room: toRoomDTO(updated) });
});
