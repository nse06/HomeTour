import { and, eq, inArray, max } from "drizzle-orm";
import { trackThrottled } from "@/lib/analytics/server";
import { db } from "@/lib/db";
import { floors, media, properties, rooms, tours, type Media, type Property, type Room } from "@/lib/db/schema";
import { newId } from "@/lib/ids";
import { deleteMediaObjects } from "@/lib/media/ingest";
import { categoryFromName, getCategory, isRoomCategory, uniqueRoomName, type RoomIconKey } from "@/lib/rooms";
import type { RoomRegion } from "@/lib/db/schema";
import { touchProperty } from "./access";
import { createTourFor } from "./queries";

/** Records a (throttled) "tour_edited" funnel event and bumps updatedAt. */
export async function noteEdit(propertyId: string, userId: string): Promise<void> {
  await touchProperty(propertyId);
  await trackThrottled({ type: "tour_edited", propertyId, userId });
}

export async function createProperty(
  ownerId: string,
  input: { name: string; tourTitle?: string; address?: string | null; propertyType: Property["propertyType"] },
): Promise<Property> {
  const id = newId();
  const tourTitle = input.tourTitle?.trim() || input.name;
  const [property] = await db
    .insert(properties)
    .values({ id, ownerId, name: input.name, tourTitle, address: input.address ?? null, propertyType: input.propertyType })
    .returning();
  await db.insert(floors).values({ id: newId(), propertyId: id, name: "Main floor", sortOrder: 0 });
  await createTourFor(id, tourTitle);
  return property;
}

export async function deleteProperty(propertyId: string): Promise<void> {
  const rows = await db.select().from(media).where(eq(media.propertyId, propertyId));
  await db.delete(properties).where(eq(properties.id, propertyId));
  await deleteMediaObjects(rows);
}

async function nextRoomOrder(propertyId: string): Promise<number> {
  const [row] = await db.select({ value: max(rooms.sortOrder) }).from(rooms).where(eq(rooms.propertyId, propertyId));
  return (row?.value ?? -1) + 1;
}

export async function createRoom(
  propertyId: string,
  input: {
    name: string;
    category?: string;
    icon?: RoomIconKey;
    floorId?: string | null;
    hotspot?: { x: number; y: number } | null;
    region?: RoomRegion | null;
    sortOrder?: number;
  },
): Promise<Room> {
  const category =
    input.category && isRoomCategory(input.category) ? input.category : (categoryFromName(input.name) ?? "other");
  const existing = await db.select({ name: rooms.name }).from(rooms).where(eq(rooms.propertyId, propertyId));
  const name = uniqueRoomName(input.name.trim(), existing.map((r) => r.name));
  const [room] = await db
    .insert(rooms)
    .values({
      id: newId(),
      propertyId,
      name,
      category,
      icon: input.icon ?? getCategory(category).icon,
      floorId: input.floorId ?? null,
      hotspotX: input.hotspot?.x ?? null,
      hotspotY: input.hotspot?.y ?? null,
      region: input.region ?? null,
      sortOrder: input.sortOrder ?? (await nextRoomOrder(propertyId)),
    })
    .returning();
  return room;
}

export async function updateRoom(
  room: Room,
  patch: Partial<{
    name: string;
    category: string;
    icon: RoomIconKey;
    description: string | null;
    features: string[];
    floorId: string | null;
    hotspot: { x: number; y: number } | null;
    region: RoomRegion | null;
    coverMediaId: string | null;
    videoUrl: string | null;
  }>,
): Promise<Room> {
  const values: Partial<typeof rooms.$inferInsert> = {};
  if (patch.name !== undefined) values.name = patch.name;
  if (patch.category !== undefined) values.category = isRoomCategory(patch.category) ? patch.category : "other";
  if (patch.icon !== undefined) values.icon = patch.icon;
  if (patch.description !== undefined) {
    values.description = patch.description;
    values.descriptionSource = patch.description ? "user" : null;
  }
  if (patch.features !== undefined) values.features = patch.features;
  if (patch.floorId !== undefined) values.floorId = patch.floorId;
  if (patch.hotspot !== undefined) {
    values.hotspotX = patch.hotspot?.x ?? null;
    values.hotspotY = patch.hotspot?.y ?? null;
  }
  if (patch.region !== undefined) values.region = patch.region;
  if (patch.coverMediaId !== undefined) values.coverMediaId = patch.coverMediaId;
  if (patch.videoUrl !== undefined) values.videoUrl = patch.videoUrl;
  const [row] = await db.update(rooms).set(values).where(eq(rooms.id, room.id)).returning();
  return row;
}

/** Deletes a room; its photos become unassigned (never deleted). */
export async function deleteRoom(room: Room): Promise<void> {
  await db.update(media).set({ roomId: null, roomAssignedBy: null }).where(eq(media.roomId, room.id));
  await db.delete(rooms).where(eq(rooms.id, room.id));
}

/** Moves all of `source`'s photos into `target`, then removes `source`. */
export async function mergeRooms(source: Room, target: Room): Promise<void> {
  const [row] = await db.select({ value: max(media.sortOrder) }).from(media).where(eq(media.roomId, target.id));
  const offset = (row?.value ?? -1) + 1;
  const moving = await db.select().from(media).where(eq(media.roomId, source.id));
  for (const m of moving) {
    await db
      .update(media)
      .set({ roomId: target.id, roomAssignedBy: "user", sortOrder: offset + m.sortOrder })
      .where(eq(media.id, m.id));
  }
  const features = Array.from(new Set([...(target.features ?? []), ...(source.features ?? [])])).slice(0, 12);
  await db
    .update(rooms)
    .set({
      features,
      description: target.description || source.description,
      descriptionSource: target.description ? target.descriptionSource : source.descriptionSource,
      hotspotX: target.hotspotX ?? source.hotspotX,
      hotspotY: target.hotspotY ?? source.hotspotY,
      floorId: target.floorId ?? source.floorId,
      coverMediaId: target.coverMediaId ?? source.coverMediaId,
    })
    .where(eq(rooms.id, target.id));
  await db.delete(rooms).where(eq(rooms.id, source.id));
}

export async function reorderRooms(propertyId: string, ids: string[]): Promise<void> {
  const owned = await db.select({ id: rooms.id }).from(rooms).where(eq(rooms.propertyId, propertyId));
  const valid = new Set(owned.map((r) => r.id));
  let order = 0;
  for (const id of ids) {
    if (!valid.has(id)) continue;
    await db.update(rooms).set({ sortOrder: order++ }).where(eq(rooms.id, id));
  }
}

/** User-initiated move: the assignment becomes sticky so AI re-organizing never undoes it. */
export async function moveMedia(propertyId: string, ids: string[], roomId: string | null): Promise<void> {
  if (roomId) {
    const [room] = await db.select().from(rooms).where(and(eq(rooms.id, roomId), eq(rooms.propertyId, propertyId))).limit(1);
    if (!room) throw new Error("Room not found");
  }
  const [row] = roomId
    ? await db.select({ value: max(media.sortOrder) }).from(media).where(eq(media.roomId, roomId))
    : [{ value: -1 }];
  let order = (row?.value ?? -1) + 1;
  for (const id of ids) {
    await db
      .update(media)
      .set({ roomId, roomAssignedBy: roomId ? "user" : null, sortOrder: order++ })
      .where(and(eq(media.id, id), eq(media.propertyId, propertyId)));
  }
}

export async function reorderMedia(propertyId: string, ids: string[]): Promise<void> {
  let order = 0;
  for (const id of ids) {
    await db.update(media).set({ sortOrder: order++ }).where(and(eq(media.id, id), eq(media.propertyId, propertyId)));
  }
}

export async function deleteMedia(propertyId: string, ids: string[]): Promise<Media[]> {
  if (ids.length === 0) return [];
  const rows = await db.select().from(media).where(and(eq(media.propertyId, propertyId), inArray(media.id, ids)));
  if (rows.length === 0) return [];
  const gone = rows.map((r) => r.id);
  await db.delete(media).where(inArray(media.id, gone));
  // Clear dangling cover / plan references.
  await db.update(rooms).set({ coverMediaId: null }).where(and(eq(rooms.propertyId, propertyId), inArray(rooms.coverMediaId, gone)));
  await db
    .update(properties)
    .set({ coverMediaId: null })
    .where(and(eq(properties.id, propertyId), inArray(properties.coverMediaId, gone)));
  await db
    .update(floors)
    .set({ planMediaId: null, planType: "none" })
    .where(and(eq(floors.propertyId, propertyId), inArray(floors.planMediaId, gone)));
  await deleteMediaObjects(rows);
  return rows;
}

/** Attaches an uploaded plan image to a floor and removes the previous one. */
export async function setFloorPlan(floorId: string, plan: Media): Promise<void> {
  const [floor] = await db.select().from(floors).where(eq(floors.id, floorId)).limit(1);
  if (!floor) return;
  const previous = floor.planMediaId;
  await db
    .update(floors)
    .set({
      planType: "image",
      planMediaId: plan.id,
      aspectRatio: plan.width && plan.height ? plan.width / plan.height : floor.aspectRatio,
    })
    .where(eq(floors.id, floorId));
  if (previous && previous !== plan.id) await deleteMedia(floor.propertyId, [previous]);
}

export async function deleteFloor(floorId: string, propertyId: string): Promise<void> {
  const [floor] = await db.select().from(floors).where(eq(floors.id, floorId)).limit(1);
  if (!floor) return;
  // Rooms keep their photos; they just lose their place on this plan.
  await db
    .update(rooms)
    .set({ floorId: null, hotspotX: null, hotspotY: null, region: null })
    .where(eq(rooms.floorId, floorId));
  await db.delete(floors).where(eq(floors.id, floorId));
  if (floor.planMediaId) await deleteMedia(propertyId, [floor.planMediaId]);
}

export async function tourForProperty(propertyId: string) {
  const [tour] = await db.select().from(tours).where(eq(tours.propertyId, propertyId)).limit(1);
  return tour;
}

