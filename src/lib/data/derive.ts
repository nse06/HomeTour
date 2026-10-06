import type { MediaDTO, PropertyGraph, RoomDTO } from "./types";

/** Pure, client-safe derivations shared by the viewer and the server. */

/** Rooms in tour order, limited to ones with something to show. */
export function navigableRooms(graph: Pick<PropertyGraph, "rooms" | "media">): RoomDTO[] {
  const withMedia = new Set(graph.media.filter((m) => m.roomId && m.status === "ready").map((m) => m.roomId));
  return [...graph.rooms]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .filter((r) => withMedia.has(r.id) || (r.description && r.description.trim().length > 0));
}

type CoverMedia = { id: string; kind: string; status: string; roomId: string | null };
type CoverRoom = { id: string; category: string; sortOrder: number; coverMediaId: string | null };

/**
 * Cover photo: explicit choice → the exterior room's cover → the opening room's cover →
 * first photo. Works on DTOs and raw rows alike.
 */
export function pickCoverFrom<M extends CoverMedia>(propertyCoverId: string | null, rooms: CoverRoom[], media: M[]): M | null {
  const photos = media.filter((m) => (m.kind === "photo" || m.kind === "pano") && m.status === "ready");
  if (photos.length === 0) return null;
  const explicit = propertyCoverId && photos.find((m) => m.id === propertyCoverId);
  if (explicit) return explicit;
  // Panoramas are distorted when shown flat, so room-derived covers stick to regular photos.
  const roomCover = (room: CoverRoom) =>
    (room.coverMediaId && photos.find((m) => m.id === room.coverMediaId && m.kind === "photo")) ||
    photos.find((m) => m.roomId === room.id && m.kind === "photo");
  const exterior = rooms.find((r) => r.category === "exterior");
  const fromExterior = exterior && roomCover(exterior);
  if (fromExterior) return fromExterior;
  for (const room of [...rooms].sort((a, b) => a.sortOrder - b.sortOrder)) {
    const cover = roomCover(room);
    if (cover) return cover;
  }
  return photos.find((m) => m.kind === "photo") ?? photos[0];
}

export function pickCover(graph: Pick<PropertyGraph, "property" | "rooms" | "media">): MediaDTO | null {
  return pickCoverFrom(graph.property.coverMediaId, graph.rooms, graph.media);
}

/** Photos of a room in display order, cover first. */
export function roomMedia(room: RoomDTO, all: MediaDTO[]): MediaDTO[] {
  const list = all.filter((m) => m.roomId === room.id && m.status === "ready").sort((a, b) => a.sortOrder - b.sortOrder);
  if (room.coverMediaId) {
    const idx = list.findIndex((m) => m.id === room.coverMediaId);
    if (idx > 0) list.unshift(...list.splice(idx, 1));
  }
  return list;
}

/** Strips editor-only fields before a graph is sent to anonymous visitors. */
export function toPublicGraph(graph: PropertyGraph): PropertyGraph {
  return {
    ...graph,
    media: graph.media.map((m) => ({ ...m, filename: null, ai: null, roomAssignedBy: null })),
    floors: graph.floors.map((f) => (f.plan ? { ...f, plan: { ...f.plan, filename: null, ai: null } } : f)),
  };
}
