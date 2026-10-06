import { and, count, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { track } from "@/lib/analytics/server";
import { db } from "@/lib/db";
import { properties, tours } from "@/lib/db/schema";
import { requireOwnedProperty } from "@/lib/data/access";
import { toTourDTO } from "@/lib/data/mappers";
import { noteEdit, tourForProperty } from "@/lib/data/mutations";
import { navigableRooms, loadPropertyGraph } from "@/lib/data/queries";
import { badRequest, HttpError, json, readJson, route } from "@/lib/http";
import { maxActiveTours } from "@/lib/plans";

/** Publish or unpublish. Published tours are live at /t/<slug>; edits show up immediately. */
export const POST = route(async (req, ctx: RouteContext<"/api/properties/[id]/publish">) => {
  const { id } = await ctx.params;
  const { user } = await requireOwnedProperty(id);
  const { publish } = await readJson(req, z.object({ publish: z.boolean() }));
  const tour = await tourForProperty(id);
  if (!tour) throw badRequest("Tour not found.");

  if (publish) {
    const graph = await loadPropertyGraph(id);
    if (!graph || navigableRooms(graph).length === 0) {
      throw badRequest("Add at least one room with photos before publishing.");
    }
    const [{ value: active }] = await db
      .select({ value: count() })
      .from(tours)
      .innerJoin(properties, eq(properties.id, tours.propertyId))
      .where(and(eq(properties.ownerId, user.id), eq(tours.status, "published"), ne(tours.id, tour.id)));
    if (active >= maxActiveTours(user)) {
      throw new HttpError(403, "Your plan's active tour limit is reached. Unpublish another tour or upgrade.", "limit");
    }
  }

  const [row] = await db
    .update(tours)
    .set(publish ? { status: "published", publishedAt: tour.publishedAt ?? new Date() } : { status: "draft" })
    .where(eq(tours.id, tour.id))
    .returning();
  if (publish && tour.status !== "published") {
    await track({ type: "tour_published", userId: user.id, propertyId: id, tourId: tour.id });
  }
  await noteEdit(id, user.id);
  return json({ tour: toTourDTO(row) });
});
