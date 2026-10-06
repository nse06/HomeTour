import { requireOwnedProperty } from "@/lib/data/access";
import { deleteMedia, moveMedia, noteEdit, reorderMedia } from "@/lib/data/mutations";
import { badRequest, json, readJson, route } from "@/lib/http";
import { bulkMediaSchema } from "@/lib/validation";

/** Move / delete / reorder many photos at once. */
export const POST = route(async (req, ctx: RouteContext<"/api/properties/[id]/media/bulk">) => {
  const { id } = await ctx.params;
  const { user } = await requireOwnedProperty(id);
  const body = await readJson(req, bulkMediaSchema);
  if (body.action === "move") {
    try {
      await moveMedia(id, body.ids, body.roomId);
    } catch {
      throw badRequest("Room not found.");
    }
  } else if (body.action === "delete") {
    await deleteMedia(id, body.ids);
  } else {
    await reorderMedia(id, body.ids);
  }
  await noteEdit(id, user.id);
  return json({ ok: true });
});
