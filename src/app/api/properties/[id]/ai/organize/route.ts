import { organizeProperty } from "@/lib/ai/organize";
import { track } from "@/lib/analytics/server";
import { requireOwnedProperty } from "@/lib/data/access";
import { noteEdit } from "@/lib/data/mutations";
import { loadPropertyGraph } from "@/lib/data/queries";
import { json, route } from "@/lib/http";

/** Builds the suggested tour structure from analyzed photos (deterministic, no AI calls). */
export const POST = route(async (_req, ctx: RouteContext<"/api/properties/[id]/ai/organize">) => {
  const { id } = await ctx.params;
  const { user } = await requireOwnedProperty(id);
  const summary = await organizeProperty(id);
  await track({
    type: "ai_processing_completed",
    userId: user.id,
    propertyId: id,
    meta: { rooms: summary.rooms, photos: summary.photosAssigned, duplicates: summary.duplicates },
  });
  await noteEdit(id, user.id);
  return json({ summary, graph: await loadPropertyGraph(id) });
});
