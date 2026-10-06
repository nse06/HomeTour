import { eq } from "drizzle-orm";
import { z } from "zod";
import { CLIENT_EVENT_TYPES, TOUR_EVENT_TYPES, isEventType } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/server";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { tours } from "@/lib/db/schema";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const BOT_RE = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|pingdom|monitor/i;

const schema = z.object({
  type: z.string().max(40),
  sessionId: z.string().max(64).optional(),
  tourId: z.string().max(40).optional(),
  roomId: z.string().max(40).optional(),
  mediaId: z.string().max(40).optional(),
  source: z.string().max(20).optional(),
  value: z.number().finite().min(0).max(1e9).optional(),
  meta: z.record(z.string().max(40), z.union([z.string().max(200), z.number(), z.boolean()])).optional(),
});

/** Anonymous analytics ingestion. Always answers 204 so clients never retry or surface errors. */
export async function POST(request: Request) {
  const done = () => new Response(null, { status: 204 });
  if (BOT_RE.test(request.headers.get("user-agent") ?? "")) return done();
  if (!rateLimit(`events:${clientIp(request.headers)}`, 240, 60_000).ok) return done();

  let parsed;
  try {
    parsed = schema.safeParse(JSON.parse(await request.text()));
  } catch {
    return done();
  }
  if (!parsed.success) return done();
  const e = parsed.data;
  if (!isEventType(e.type) || !CLIENT_EVENT_TYPES.has(e.type)) return done();

  let propertyId: string | null = null;
  if (e.tourId) {
    const [tour] = await db
      .select({ propertyId: tours.propertyId, status: tours.status })
      .from(tours)
      .where(eq(tours.id, e.tourId))
      .limit(1);
    if (!tour) return done();
    propertyId = tour.propertyId;
  } else if (TOUR_EVENT_TYPES.has(e.type)) {
    return done();
  }

  const user = e.type === "landing_view" || e.type === "create_started" || e.type === "tour_shared" ? await getCurrentUser() : null;
  await track({
    type: e.type,
    userId: user?.id ?? null,
    tourId: e.tourId ?? null,
    propertyId,
    roomId: e.roomId ?? null,
    mediaId: e.mediaId ?? null,
    sessionId: e.sessionId ?? null,
    source: e.source ?? null,
    value: e.value ?? null,
    meta: e.meta,
  });
  return done();
}
