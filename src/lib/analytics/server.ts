import { and, eq, gt } from "drizzle-orm";
import { db } from "@/lib/db";
import { analyticsEvents } from "@/lib/db/schema";
import type { EventType } from "./events";

export interface TrackInput {
  type: EventType;
  userId?: string | null;
  tourId?: string | null;
  propertyId?: string | null;
  roomId?: string | null;
  mediaId?: string | null;
  sessionId?: string | null;
  source?: string | null;
  value?: number | null;
  meta?: Record<string, string | number | boolean>;
}

/** Records an analytics event. Never throws: analytics must not break product flows. */
export async function track(input: TrackInput): Promise<void> {
  try {
    await db.insert(analyticsEvents).values({
      eventType: input.type,
      userId: input.userId ?? null,
      tourId: input.tourId ?? null,
      propertyId: input.propertyId ?? null,
      roomId: input.roomId ?? null,
      mediaId: input.mediaId ?? null,
      sessionId: input.sessionId ?? null,
      source: input.source ?? null,
      value: input.value ?? null,
      meta: input.meta ?? null,
    });
  } catch (err) {
    console.warn("[analytics] failed to record", input.type, err);
  }
}

/** Like track(), but at most once per property per window (e.g. "tour_edited" on every autosave). */
export async function trackThrottled(input: TrackInput & { propertyId: string }, windowMs = 30 * 60 * 1000) {
  try {
    const since = new Date(Date.now() - windowMs);
    const recent = await db
      .select({ id: analyticsEvents.id })
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.eventType, input.type),
          eq(analyticsEvents.propertyId, input.propertyId),
          gt(analyticsEvents.createdAt, since),
        ),
      )
      .limit(1);
    if (recent.length === 0) await track(input);
  } catch (err) {
    console.warn("[analytics] throttled track failed", err);
  }
}
