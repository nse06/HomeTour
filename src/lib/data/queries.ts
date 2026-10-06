import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { analyticsEvents, floors, media, properties, rooms, tours, type Media } from "@/lib/db/schema";
import { newId } from "@/lib/ids";
import { slugify } from "@/lib/slug";
import { toFloorDTO, toMediaDTO, toPropertyDTO, toRoomDTO, toTourDTO } from "./mappers";
import type { MediaDTO, PropertyGraph, RoomDTO } from "./types";

export async function loadPropertyGraph(propertyId: string): Promise<PropertyGraph | null> {
  const [property] = await db.select().from(properties).where(eq(properties.id, propertyId)).limit(1);
  if (!property) return null;

  const [floorRows, roomRows, mediaRows, tourRows] = await Promise.all([
    db.select().from(floors).where(eq(floors.propertyId, propertyId)).orderBy(asc(floors.sortOrder), asc(floors.createdAt)),
    db.select().from(rooms).where(eq(rooms.propertyId, propertyId)).orderBy(asc(rooms.sortOrder), asc(rooms.createdAt)),
    db.select().from(media).where(eq(media.propertyId, propertyId)).orderBy(asc(media.sortOrder), asc(media.createdAt)),
    db.select().from(tours).where(eq(tours.propertyId, propertyId)).limit(1),
  ]);

  const tour = tourRows[0] ?? (await createTourFor(propertyId, property.tourTitle));
  const planMedia = new Map<string, Media>(mediaRows.filter((m) => m.kind === "floorplan").map((m) => [m.id, m]));

  return {
    property: toPropertyDTO(property),
    floors: floorRows.map((f) => toFloorDTO(f, f.planMediaId ? planMedia.get(f.planMediaId) : undefined)),
    rooms: roomRows.map(toRoomDTO),
    media: mediaRows.filter((m) => m.kind !== "floorplan").map(toMediaDTO),
    tour: toTourDTO(tour),
  };
}

/** Finds a free slug like "modern-chicago-home", then "modern-chicago-home-2", … */
export async function uniqueSlug(base: string, excludeTourId?: string): Promise<string> {
  const root = slugify(base);
  const like = await db
    .select({ slug: tours.slug, id: tours.id })
    .from(tours)
    .where(sql`${tours.slug} = ${root} OR ${tours.slug} LIKE ${root + "-%"}`);
  const taken = new Set(like.filter((t) => t.id !== excludeTourId).map((t) => t.slug));
  if (!taken.has(root) && root.length >= 3) return root;
  for (let i = 2; i < 1000; i++) {
    const candidate = `${root}-${i}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${root}-${newId().slice(0, 6)}`;
}

export async function createTourFor(propertyId: string, title: string) {
  const slug = await uniqueSlug(title);
  const [tour] = await db
    .insert(tours)
    .values({
      id: newId(),
      propertyId,
      slug,
      status: "draft",
      settings: { showBranding: true, showContact: true },
    })
    .returning();
  return tour;
}

export async function getPublishedTourGraph(slug: string): Promise<PropertyGraph | null> {
  const [tour] = await db
    .select({ propertyId: tours.propertyId, status: tours.status })
    .from(tours)
    .where(eq(tours.slug, slug))
    .limit(1);
  if (!tour || tour.status !== "published") return null;
  return loadPropertyGraph(tour.propertyId);
}

/** Rooms in tour order, limited to ones with something to show. */
export function navigableRooms(graph: Pick<PropertyGraph, "rooms" | "media">): RoomDTO[] {
  const withMedia = new Set(graph.media.filter((m) => m.roomId && m.status === "ready").map((m) => m.roomId));
  return graph.rooms.filter((r) => withMedia.has(r.id) || (r.description && r.description.trim().length > 0));
}

/** Cover photo: explicit choice → first exterior photo → first photo. */
export function pickCover(graph: Pick<PropertyGraph, "property" | "rooms" | "media">): MediaDTO | null {
  const photos = graph.media.filter((m) => (m.kind === "photo" || m.kind === "pano") && m.status === "ready");
  if (photos.length === 0) return null;
  const explicit = graph.property.coverMediaId && photos.find((m) => m.id === graph.property.coverMediaId);
  if (explicit) return explicit;
  const exterior = graph.rooms.find((r) => r.category === "exterior");
  if (exterior) {
    const cover = exterior.coverMediaId && photos.find((m) => m.id === exterior.coverMediaId);
    if (cover) return cover;
    const first = photos.find((m) => m.roomId === exterior.id && m.kind === "photo");
    if (first) return first;
  }
  return photos.find((m) => m.kind === "photo") ?? photos[0];
}

/** Photos of a room in display order, cover first. */
export function roomMedia(room: RoomDTO, all: MediaDTO[]): MediaDTO[] {
  const list = all.filter((m) => m.roomId === room.id && m.status === "ready");
  if (room.coverMediaId) {
    const idx = list.findIndex((m) => m.id === room.coverMediaId);
    if (idx > 0) list.unshift(...list.splice(idx, 1));
  }
  return list;
}

export interface DashboardProperty {
  id: string;
  name: string;
  tourTitle: string;
  address: string | null;
  updatedAt: number;
  slug: string;
  status: "draft" | "published";
  photoCount: number;
  roomCount: number;
  views: number;
  cover: MediaDTO | null;
}

export async function listDashboardProperties(ownerId: string): Promise<DashboardProperty[]> {
  const props = await db
    .select()
    .from(properties)
    .where(eq(properties.ownerId, ownerId))
    .orderBy(desc(properties.updatedAt));
  if (props.length === 0) return [];
  const ids = props.map((p) => p.id);

  const [tourRows, photoRows, roomCounts] = await Promise.all([
    db.select().from(tours).where(inArray(tours.propertyId, ids)),
    db
      .select()
      .from(media)
      .where(and(inArray(media.propertyId, ids), inArray(media.kind, ["photo", "pano"]), eq(media.status, "ready")))
      .orderBy(asc(media.sortOrder), asc(media.createdAt)),
    db
      .select({ propertyId: rooms.propertyId, n: sql<number>`count(*)` })
      .from(rooms)
      .where(inArray(rooms.propertyId, ids))
      .groupBy(rooms.propertyId),
  ]);

  const tourIds = tourRows.map((t) => t.id);
  const viewRows = tourIds.length
    ? await db
        .select({ tourId: analyticsEvents.tourId, n: sql<number>`count(*)` })
        .from(analyticsEvents)
        .where(and(inArray(analyticsEvents.tourId, tourIds), eq(analyticsEvents.eventType, "tour_viewed")))
        .groupBy(analyticsEvents.tourId)
    : [];

  return props.map((p) => {
    const tour = tourRows.find((t) => t.propertyId === p.id);
    const photos = photoRows.filter((m) => m.propertyId === p.id);
    const coverRow = photos.find((m) => m.id === p.coverMediaId) ?? photos.find((m) => m.aiCategory === "exterior") ?? photos[0];
    return {
      id: p.id,
      name: p.name,
      tourTitle: p.tourTitle,
      address: p.address,
      updatedAt: p.updatedAt.getTime(),
      slug: tour?.slug ?? "",
      status: tour?.status ?? "draft",
      photoCount: photos.length,
      roomCount: Number(roomCounts.find((r) => r.propertyId === p.id)?.n ?? 0),
      views: Number(viewRows.find((v) => v.tourId === tour?.id)?.n ?? 0),
      cover: coverRow ? toMediaDTO(coverRow) : null,
    };
  });
}
