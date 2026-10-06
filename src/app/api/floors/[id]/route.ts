import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { floors, media } from "@/lib/db/schema";
import { requireOwnedFloor } from "@/lib/data/access";
import { toFloorDTO } from "@/lib/data/mappers";
import { deleteFloor, deleteMedia, noteEdit } from "@/lib/data/mutations";
import { badRequest, json, readJson, route } from "@/lib/http";
import { floorPatchSchema } from "@/lib/validation";

export const PATCH = route(async (req, ctx: RouteContext<"/api/floors/[id]">) => {
  const { id } = await ctx.params;
  const { user, floor } = await requireOwnedFloor(id);
  const patch = await readJson(req, floorPatchSchema);
  // Switching away from an uploaded image drops the image.
  if (patch.planType && patch.planType !== "image" && floor.planMediaId) {
    await deleteMedia(floor.propertyId, [floor.planMediaId]);
  }
  if (patch.planType === "image" && !floor.planMediaId) throw badRequest("Upload a floor plan image first.");
  const values = { ...patch, ...(patch.planType && patch.planType !== "image" ? { planMediaId: null } : {}) };
  const [row] = await db.update(floors).set(values).where(eq(floors.id, id)).returning();
  const plan = row.planMediaId ? (await db.select().from(media).where(eq(media.id, row.planMediaId)).limit(1))[0] : undefined;
  await noteEdit(floor.propertyId, user.id);
  return json({ floor: toFloorDTO(row, plan) });
});

export const DELETE = route(async (_req, ctx: RouteContext<"/api/floors/[id]">) => {
  const { id } = await ctx.params;
  const { user, floor } = await requireOwnedFloor(id);
  const siblings = await db.select({ id: floors.id }).from(floors).where(eq(floors.propertyId, floor.propertyId));
  if (siblings.length <= 1) throw badRequest("A tour needs at least one floor.");
  await deleteFloor(id, floor.propertyId);
  await noteEdit(floor.propertyId, user.id);
  return json({ ok: true });
});
