import { and, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { aiUsage, analyticsEvents, rooms } from "@/lib/db/schema";
import { FUNNEL_STEPS } from "./events";

export interface TourReport {
  days: number;
  totals: {
    views: number;
    sessions: number;
    avgDurationMs: number;
    roomViews: number;
    photoViews: number;
    ctaClicks: number;
    qrVisits: number;
    shares: number;
    embedViews: number;
  };
  previousViews: number;
  daily: { date: string; views: number }[];
  rooms: { roomId: string; name: string; views: number }[];
  sources: { source: string; views: number }[];
}

const DAY = 86_400_000;
const MAX_DURATION_MS = 3 * 60 * 60 * 1000; // ignore tabs left open for hours

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

export async function tourReport(tourId: string, propertyId: string, days: number): Promise<TourReport> {
  const now = new Date();
  const since = new Date(now.getTime() - days * DAY);
  const prevSince = new Date(since.getTime() - days * DAY);
  const inRange = and(eq(analyticsEvents.tourId, tourId), gte(analyticsEvents.createdAt, since));

  const [counts] = await db
    .select({
      views: sql<number>`sum(case when ${analyticsEvents.eventType} = 'tour_viewed' then 1 else 0 end)`,
      sessions: sql<number>`count(distinct case when ${analyticsEvents.eventType} = 'tour_viewed' then ${analyticsEvents.sessionId} end)`,
      roomViews: sql<number>`sum(case when ${analyticsEvents.eventType} = 'room_viewed' then 1 else 0 end)`,
      photoViews: sql<number>`sum(case when ${analyticsEvents.eventType} = 'photo_viewed' then 1 else 0 end)`,
      ctaClicks: sql<number>`sum(case when ${analyticsEvents.eventType} = 'lead_cta_clicked' then 1 else 0 end)`,
      qrVisits: sql<number>`sum(case when ${analyticsEvents.eventType} = 'tour_viewed' and ${analyticsEvents.source} = 'qr' then 1 else 0 end)`,
      shares: sql<number>`sum(case when ${analyticsEvents.eventType} = 'tour_shared' then 1 else 0 end)`,
      embedViews: sql<number>`sum(case when ${analyticsEvents.eventType} = 'embed_viewed' then 1 else 0 end)`,
      avgDuration: sql<number>`avg(case when ${analyticsEvents.eventType} = 'tour_session_end' and ${analyticsEvents.value} > 1000 and ${analyticsEvents.value} < ${MAX_DURATION_MS} then ${analyticsEvents.value} end)`,
    })
    .from(analyticsEvents)
    .where(inRange);

  const [prev] = await db
    .select({ views: sql<number>`count(*)` })
    .from(analyticsEvents)
    .where(
      and(
        eq(analyticsEvents.tourId, tourId),
        eq(analyticsEvents.eventType, "tour_viewed"),
        gte(analyticsEvents.createdAt, prevSince),
        lt(analyticsEvents.createdAt, since),
      ),
    );

  const dailyRows = await db
    .select({
      day: sql<string>`strftime('%Y-%m-%d', ${analyticsEvents.createdAt} / 1000, 'unixepoch')`,
      views: sql<number>`count(*)`,
    })
    .from(analyticsEvents)
    .where(and(inRange, eq(analyticsEvents.eventType, "tour_viewed")))
    .groupBy(sql`1`);
  const byDay = new Map(dailyRows.map((r) => [r.day, Number(r.views)]));
  const daily = Array.from({ length: days }, (_, i) => {
    const date = dayKey(new Date(now.getTime() - (days - 1 - i) * DAY));
    return { date, views: byDay.get(date) ?? 0 };
  });

  const roomRows = await db
    .select({ roomId: analyticsEvents.roomId, views: sql<number>`count(*)` })
    .from(analyticsEvents)
    .where(and(inRange, eq(analyticsEvents.eventType, "room_viewed")))
    .groupBy(analyticsEvents.roomId);
  const roomNames = await db.select({ id: rooms.id, name: rooms.name }).from(rooms).where(eq(rooms.propertyId, propertyId));
  const names = new Map(roomNames.map((r) => [r.id, r.name]));
  const roomStats = roomRows
    .filter((r) => r.roomId && names.has(r.roomId))
    .map((r) => ({ roomId: r.roomId!, name: names.get(r.roomId!)!, views: Number(r.views) }))
    .sort((a, b) => b.views - a.views);

  const sourceRows = await db
    .select({ source: analyticsEvents.source, views: sql<number>`count(*)` })
    .from(analyticsEvents)
    .where(and(inRange, eq(analyticsEvents.eventType, "tour_viewed")))
    .groupBy(analyticsEvents.source);

  return {
    days,
    totals: {
      views: Number(counts?.views ?? 0),
      sessions: Number(counts?.sessions ?? 0),
      avgDurationMs: Math.round(Number(counts?.avgDuration ?? 0)),
      roomViews: Number(counts?.roomViews ?? 0),
      photoViews: Number(counts?.photoViews ?? 0),
      ctaClicks: Number(counts?.ctaClicks ?? 0),
      qrVisits: Number(counts?.qrVisits ?? 0),
      shares: Number(counts?.shares ?? 0),
      embedViews: Number(counts?.embedViews ?? 0),
    },
    previousViews: Number(prev?.views ?? 0),
    daily,
    rooms: roomStats,
    sources: sourceRows
      .map((r) => ({ source: r.source ?? "direct", views: Number(r.views) }))
      .sort((a, b) => b.views - a.views),
  };
}

export interface FunnelReport {
  days: number;
  steps: { type: string; label: string; count: number; actors: number }[];
  aiSpendUsd: number;
  aiCalls: number;
}

/** Product funnel across all users (admin only). "actors" = distinct users or sessions. */
export async function funnelReport(days: number): Promise<FunnelReport> {
  const since = new Date(Date.now() - days * DAY);
  const rows = await db
    .select({
      type: analyticsEvents.eventType,
      count: sql<number>`count(*)`,
      actors: sql<number>`count(distinct coalesce(${analyticsEvents.userId}, ${analyticsEvents.sessionId}, ${analyticsEvents.propertyId}))`,
    })
    .from(analyticsEvents)
    .where(gte(analyticsEvents.createdAt, since))
    .groupBy(analyticsEvents.eventType);
  const map = new Map(rows.map((r) => [r.type, r]));
  const [spend] = await db
    .select({ total: sql<number>`coalesce(sum(${aiUsage.costUsd}), 0)`, calls: sql<number>`count(*)` })
    .from(aiUsage)
    .where(gte(aiUsage.createdAt, since));
  return {
    days,
    steps: FUNNEL_STEPS.map((s) => ({
      type: s.type,
      label: s.label,
      count: Number(map.get(s.type)?.count ?? 0),
      actors: Number(map.get(s.type)?.actors ?? 0),
    })),
    aiSpendUsd: Number(spend?.total ?? 0),
    aiCalls: Number(spend?.calls ?? 0),
  };
}
