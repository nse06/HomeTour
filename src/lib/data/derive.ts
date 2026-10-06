import type { MediaDTO, PropertyGraph, RoomDTO } from "./types";

/** Pure, client-safe derivations shared by the viewer and the server. */

/** Rooms in tour order, limited to ones with something to show. */
export function navigableRooms(graph: Pick<PropertyGraph, "rooms" | "media">): RoomDTO[] {
  const withMedia = new Set(graph.media.filter((m) => m.roomId && m.status === "ready").map((m) => m.roomId));
  return [...graph.rooms]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .filter((r) => withMedia.has(r.id) || (r.description && r.description.trim().length > 0));
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
