import { eq, max } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { floors } from "@/lib/db/schema";
import { requireOwnedProperty } from "@/lib/data/access";
import { toFloorDTO } from "@/lib/data/mappers";
import { noteEdit } from "@/lib/data/mutations";
import { json, readJson, route } from "@/lib/http";
import { newId } from "@/lib/ids";

export const POST = route(async (req, ctx: RouteContext<"/api/properties/[id]/floors">) => {
  const { id } = await ctx.params;
  const { user } = await requireOwnedProperty(id);
  const { name } = await readJson(req, z.object({ name: z.string().trim().min(1).max(60) }));
  const [last] = await db.select({ value: max(floors.sortOrder) }).from(floors).where(eq(floors.propertyId, id));
  const [floor] = await db
    .insert(floors)
    .values({ id: newId(), propertyId: id, name, sortOrder: (last?.value ?? -1) + 1 })
    .returning();
  await noteEdit(id, user.id);
  return json({ floor: toFloorDTO(floor, undefined) });
});
