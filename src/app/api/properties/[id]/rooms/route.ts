import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { floors } from "@/lib/db/schema";
import { requireOwnedProperty } from "@/lib/data/access";
import { toRoomDTO } from "@/lib/data/mappers";
import { createRoom, noteEdit } from "@/lib/data/mutations";
import { badRequest, json, readJson, route } from "@/lib/http";
import { roomCreateSchema } from "@/lib/validation";

export const POST = route(async (req, ctx: RouteContext<"/api/properties/[id]/rooms">) => {
  const { id } = await ctx.params;
  const { user } = await requireOwnedProperty(id);
  const input = await readJson(req, roomCreateSchema);
  if (input.floorId) {
    const [floor] = await db.select({ id: floors.id }).from(floors).where(and(eq(floors.id, input.floorId), eq(floors.propertyId, id))).limit(1);
    if (!floor) throw badRequest("Floor not found.");
  }
  const room = await createRoom(id, input);
  await noteEdit(id, user.id);
  return json({ room: toRoomDTO(room) });
});
