import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { media, rooms, tours, type Media, type Room } from "@/lib/db/schema";
import { createRoom } from "@/lib/data/mutations";
import { isNearDuplicate } from "@/lib/media/hash";
import { categoryOrder, getCategory } from "@/lib/rooms";

export interface OrganizeSummary {
  rooms: number;
  roomsCreated: number;
  photosAssigned: number;
  duplicates: number;
  unassigned: number;
}

/** Pure grouping step, unit-tested separately: which category does each movable photo go to? */
export function planAssignments(items: Pick<Media, "id" | "aiCategory" | "roomAssignedBy">[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  for (const m of items) {
    if (m.roomAssignedBy === "user" || !m.aiCategory) continue;
    const list = groups.get(m.aiCategory) ?? [];
    list.push(m.id);
    groups.set(m.aiCategory, list);
  }
  return groups;
}

/** Marks near-duplicates: the lower-quality shot of each similar pair points at the better one. */
export function findDuplicates(items: Pick<Media, "id" | "dhash" | "aiQuality" | "createdAt">[]): Map<string, string> {
  const dupes = new Map<string, string>();
  const ranked = [...items].sort((a, b) => (b.aiQuality ?? 0) - (a.aiQuality ?? 0) || a.createdAt.getTime() - b.createdAt.getTime());
  for (let i = 0; i < ranked.length; i++) {
    if (dupes.has(ranked[i].id)) continue;
    for (let j = i + 1; j < ranked.length; j++) {
      if (!dupes.has(ranked[j].id) && isNearDuplicate(ranked[i].dhash, ranked[j].dhash)) dupes.set(ranked[j].id, ranked[i].id);
    }
  }
  return dupes;
}

/**
 * The tour builder: turns analyzed photos into a suggested tour structure.
 * Deterministic (no AI calls). Never moves photos the user placed by hand.
 *  1. groups photos by detected room, creating rooms as needed
 *  2. flags near-duplicates
 *  3. orders photos best-first and picks a cover per room
 *  4. sequences rooms in natural walkthrough order (unless the user reordered them)
 */
export async function organizeProperty(propertyId: string): Promise<OrganizeSummary> {
  const allMedia = await db.select().from(media).where(eq(media.propertyId, propertyId));
  const photos = allMedia.filter((m) => m.kind === "photo" || m.kind === "pano");
  let roomRows: Room[] = await db.select().from(rooms).where(eq(rooms.propertyId, propertyId));

  // Duplicates.
  const dupes = findDuplicates(photos);
  for (const p of photos) {
    const target = dupes.get(p.id) ?? null;
    if (target !== p.aiDuplicateOf) await db.update(media).set({ aiDuplicateOf: target }).where(eq(media.id, p.id));
  }

  // Grouping.
  const groups = planAssignments(photos);
  let roomsCreated = 0;
  let photosAssigned = 0;
  const hasPrimary = () => roomRows.some((r) => r.category === "primary_bedroom");
  const categories = [...groups.keys()].sort((a, b) => categoryOrder(a) - categoryOrder(b));
  for (const category of categories) {
    const ids = groups.get(category)!;
    // Prefer a room of this category that already holds AI-placed photos, then any room of this category.
    let room =
      roomRows.find((r) => r.category === category && allMedia.some((m) => m.roomId === r.id && m.roomAssignedBy === "ai")) ??
      roomRows.find((r) => r.category === category);
    if (!room) {
      const label = category === "bedroom" && hasPrimary() ? "Bedroom 2" : getCategory(category).label;
      room = await createRoom(propertyId, { name: label, category });
      roomRows = [...roomRows, room];
      roomsCreated++;
    }
    const ranked = ids
      .map((id) => photos.find((p) => p.id === id)!)
      .sort((a, b) => Number(dupes.has(a.id)) - Number(dupes.has(b.id)) || (b.aiQuality ?? 0) - (a.aiQuality ?? 0));
    const existingCount = allMedia.filter((m) => m.roomId === room!.id && m.roomAssignedBy === "user").length;
    for (const [i, p] of ranked.entries()) {
      await db.update(media).set({ roomId: room.id, roomAssignedBy: "ai", sortOrder: existingCount + i }).where(eq(media.id, p.id));
      photosAssigned++;
    }
  }

  // Covers: best non-duplicate photo, unless the user picked one that is still in the room.
  const fresh = await db.select().from(media).where(eq(media.propertyId, propertyId));
  for (const room of roomRows) {
    const inRoom = fresh.filter((m) => m.roomId === room.id && (m.kind === "photo" || m.kind === "pano"));
    if (room.coverMediaId && inRoom.some((m) => m.id === room.coverMediaId)) continue;
    const best = [...inRoom].sort(
      (a, b) =>
        Number(a.kind === "pano") - Number(b.kind === "pano") ||
        Number(dupes.has(a.id)) - Number(dupes.has(b.id)) ||
        (b.aiQuality ?? 0) - (a.aiQuality ?? 0),
    )[0];
    if (best) await db.update(rooms).set({ coverMediaId: best.id }).where(eq(rooms.id, room.id));
  }

  // Walkthrough order, unless the owner arranged rooms themselves.
  const [tour] = await db.select().from(tours).where(eq(tours.propertyId, propertyId)).limit(1);
  const manualOrder = (tour?.settings as { roomOrder?: string } | undefined)?.roomOrder === "manual";
  if (!manualOrder) {
    const ordered = [...roomRows].sort((a, b) => categoryOrder(a.category) - categoryOrder(b.category) || a.sortOrder - b.sortOrder);
    for (const [i, r] of ordered.entries()) await db.update(rooms).set({ sortOrder: i }).where(eq(rooms.id, r.id));
  }

  // The property cover is left to the owner: when none is picked, pickCover() derives it at
  // read time from the exterior room or the opening room, so it follows later edits.

  const unassigned = fresh.filter((m) => m.kind !== "floorplan" && !m.roomId).length;
  return { rooms: roomRows.length, roomsCreated, photosAssigned, duplicates: dupes.size, unassigned };
}
