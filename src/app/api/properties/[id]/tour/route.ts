import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { tours } from "@/lib/db/schema";
import { requireOwnedProperty } from "@/lib/data/access";
import { toTourDTO } from "@/lib/data/mappers";
import { noteEdit, tourForProperty } from "@/lib/data/mutations";
import { badRequest, HttpError, json, readJson, route } from "@/lib/http";
import { can } from "@/lib/plans";
import { validateSlug } from "@/lib/slug";
import { tourPatchSchema } from "@/lib/validation";

/** Update the share URL slug and/or presentation settings. */
export const PATCH = route(async (req, ctx: RouteContext<"/api/properties/[id]/tour">) => {
  const { id } = await ctx.params;
  const { user } = await requireOwnedProperty(id);
  const tour = await tourForProperty(id);
  if (!tour) throw badRequest("Tour not found.");
  const body = await readJson(req, tourPatchSchema);

  const values: Partial<typeof tours.$inferInsert> = {};
  if (body.slug !== undefined && body.slug !== tour.slug) {
    const problem = validateSlug(body.slug);
    if (problem) throw badRequest(problem);
    const [taken] = await db
      .select({ id: tours.id })
      .from(tours)
      .where(and(eq(tours.slug, body.slug), ne(tours.id, tour.id)))
      .limit(1);
    if (taken) throw new HttpError(409, "That link is already taken. Try another.", "slug_taken");
    values.slug = body.slug;
  }
  if (body.settings) {
    const next = { ...tour.settings, ...body.settings };
    if (body.settings.showBranding === false && !can(user, "removeBranding")) {
      throw new HttpError(403, "Removing branding is a Pro feature.", "upgrade");
    }
    if (next.cta?.enabled && !next.cta.value) throw badRequest("Add where the button should go.");
    values.settings = next;
  }
  const [row] = Object.keys(values).length
    ? await db.update(tours).set(values).where(eq(tours.id, tour.id)).returning()
    : [tour];
  await noteEdit(id, user.id);
  return json({ tour: toTourDTO(row) });
});
