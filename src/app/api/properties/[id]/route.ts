import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { properties } from "@/lib/db/schema";
import { requireOwnedProperty } from "@/lib/data/access";
import { toPropertyDTO } from "@/lib/data/mappers";
import { deleteProperty, noteEdit } from "@/lib/data/mutations";
import { loadPropertyGraph } from "@/lib/data/queries";
import { json, readJson, route } from "@/lib/http";
import { propertyPatchSchema } from "@/lib/validation";

export const GET = route(async (_req, ctx: RouteContext<"/api/properties/[id]">) => {
  const { id } = await ctx.params;
  await requireOwnedProperty(id);
  return json(await loadPropertyGraph(id));
});

export const PATCH = route(async (req, ctx: RouteContext<"/api/properties/[id]">) => {
  const { id } = await ctx.params;
  const { user } = await requireOwnedProperty(id);
  const patch = await readJson(req, propertyPatchSchema);
  const [row] = await db.update(properties).set(patch).where(eq(properties.id, id)).returning();
  await noteEdit(id, user.id);
  return json({ property: toPropertyDTO(row) });
});

export const DELETE = route(async (_req, ctx: RouteContext<"/api/properties/[id]">) => {
  const { id } = await ctx.params;
  await requireOwnedProperty(id);
  await deleteProperty(id);
  return json({ ok: true });
});
