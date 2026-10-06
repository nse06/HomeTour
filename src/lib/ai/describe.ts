import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { media, properties, rooms, type Room } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { toAiJpeg } from "@/lib/media/process";
import { PROPERTY_TYPE_LABELS } from "@/lib/data/types";
import { storage } from "@/lib/storage";
import { AiBudgetError, propertyAiSpend, recordUsage } from "./classify";
import { getProvider, type DescribeRoomInput } from "./providers";

const ROOMS_PER_REQUEST = 6;

export class AiUnavailableError extends Error {}

/** Facts the owner explicitly provided — the only non-visual claims the writer may use. */
function ownerFacts(p: typeof properties.$inferSelect): string {
  const facts: string[] = [`Property type: ${PROPERTY_TYPE_LABELS[p.propertyType]}`];
  if (p.bedrooms) facts.push(`Bedrooms: ${p.bedrooms}`);
  if (p.bathrooms) facts.push(`Bathrooms: ${p.bathrooms}`);
  if (p.amenities?.length) facts.push(`Amenities: ${p.amenities.join(", ")}`);
  if (p.description) facts.push(`Owner's description: ${p.description.slice(0, 1200)}`);
  return facts.join("\n");
}

/**
 * Writes descriptions for rooms that don't have one yet (or the given rooms, when forced).
 * Existing user-written descriptions are never overwritten unless explicitly requested.
 */
export async function describeRooms(opts: { propertyId: string; userId: string; roomIds?: string[]; force?: boolean }): Promise<Room[]> {
  const provider = getProvider();
  if (!provider) throw new AiUnavailableError("AI writing isn't enabled on this server.");

  const [property] = await db.select().from(properties).where(eq(properties.id, opts.propertyId)).limit(1);
  if (!property) return [];
  const where = opts.roomIds?.length
    ? and(eq(rooms.propertyId, opts.propertyId), inArray(rooms.id, opts.roomIds))
    : eq(rooms.propertyId, opts.propertyId);
  const candidates = (await db.select().from(rooms).where(where)).filter((r) => opts.force || !r.description?.trim());
  if (candidates.length === 0) return [];

  if (provider.name === "anthropic" && (await propertyAiSpend(opts.propertyId)) >= env.ai.maxSpendPerPropertyUsd) {
    throw new AiBudgetError("This tour has used its AI budget. You can still write descriptions yourself.");
  }

  const photos = await db
    .select()
    .from(media)
    .where(and(eq(media.propertyId, opts.propertyId), inArray(media.kind, ["photo", "pano"])));
  const store = await storage();
  const inputs: DescribeRoomInput[] = [];
  for (const room of candidates) {
    const own = photos
      .filter((m) => m.roomId === room.id)
      .sort((a, b) => Number(b.id === room.coverMediaId) - Number(a.id === room.coverMediaId) || (b.aiQuality ?? 0) - (a.aiQuality ?? 0));
    if (own.length === 0) continue;
    const images: Buffer[] = [];
    for (const m of own.filter((p) => p.kind === "photo").slice(0, 2)) {
      const v = m.variants.sm ?? m.variants.md;
      const obj = v ? await store.get(v.key) : null;
      if (obj) images.push(await toAiJpeg(obj.body, 640));
    }
    const detected = [...new Set(own.flatMap((m) => m.aiFeatures ?? []))].slice(0, 10);
    inputs.push({ roomId: room.id, name: room.name, category: room.category, detected, images });
  }
  if (inputs.length === 0) return [];

  const facts = ownerFacts(property);
  const updated: Room[] = [];
  for (let i = 0; i < inputs.length; i += ROOMS_PER_REQUEST) {
    const chunk = inputs.slice(i, i + ROOMS_PER_REQUEST);
    const { results, usage } = await provider.describe(chunk, facts);
    await recordUsage({ userId: opts.userId, propertyId: opts.propertyId, purpose: "describe", ...usage, items: chunk.length });
    for (const r of results) {
      if (!chunk.some((c) => c.roomId === r.room_id)) continue;
      const room = candidates.find((c) => c.id === r.room_id)!;
      const [row] = await db
        .update(rooms)
        .set({
          description: r.description.trim().slice(0, 1200),
          descriptionSource: "ai",
          features: room.features?.length && !opts.force ? room.features : r.features.map((f) => f.trim()).filter(Boolean).slice(0, 6),
        })
        .where(eq(rooms.id, r.room_id))
        .returning();
      if (row) updated.push(row);
    }
  }
  return updated;
}
