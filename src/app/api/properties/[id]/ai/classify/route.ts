import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { AiBudgetError, classifyPhotos } from "@/lib/ai/classify";
import { track } from "@/lib/analytics/server";
import { db } from "@/lib/db";
import { media } from "@/lib/db/schema";
import { requireOwnedProperty } from "@/lib/data/access";
import { toMediaDTO } from "@/lib/data/mappers";
import { HttpError, json, readJson, route } from "@/lib/http";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const maxDuration = 120;

const schema = z.object({
  mediaIds: z.array(z.string().max(40)).max(24).optional(),
  force: z.boolean().optional(),
  /** First call of a run: records the funnel event once. */
  start: z.boolean().optional(),
});

/** Analyze a batch of photos (the client drives batches so long jobs never hit request timeouts). */
export const POST = route(async (req, ctx: RouteContext<"/api/properties/[id]/ai/classify">) => {
  const { id } = await ctx.params;
  const { user } = await requireOwnedProperty(id);
  if (!rateLimit(`ai:${user.id}:${clientIp(req.headers)}`, 60, 60_000).ok) {
    throw new HttpError(429, "Too many requests — give it a moment.", "rate_limited");
  }
  const body = await readJson(req, schema);
  if (body.start) await track({ type: "ai_processing_started", userId: user.id, propertyId: id });

  try {
    const outcome = await classifyPhotos({ propertyId: id, userId: user.id, mediaIds: body.mediaIds, force: body.force });
    const rows = body.mediaIds?.length
      ? await db.select().from(media).where(and(eq(media.propertyId, id), inArray(media.id, body.mediaIds)))
      : await db.select().from(media).where(eq(media.propertyId, id));
    return json({ outcome, media: rows.filter((m) => m.kind !== "floorplan").map(toMediaDTO) });
  } catch (err) {
    if (err instanceof AiBudgetError) throw new HttpError(402, err.message, "ai_budget");
    throw err;
  }
});
