import { z } from "zod";
import { requireOwnedProperty } from "@/lib/data/access";
import { noteEdit, reorderRooms } from "@/lib/data/mutations";
import { json, readJson, route } from "@/lib/http";

export const POST = route(async (req, ctx: RouteContext<"/api/properties/[id]/rooms/reorder">) => {
  const { id } = await ctx.params;
  const { user } = await requireOwnedProperty(id);
  const { ids } = await readJson(req, z.object({ ids: z.array(z.string().max(40)).max(200) }));
  await reorderRooms(id, ids);
  await noteEdit(id, user.id);
  return json({ ok: true });
});
