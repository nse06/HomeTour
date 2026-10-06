import type { PropertyGraph } from "@/lib/data/types";

export const EDITOR_STEPS = [
  { slug: "property", label: "Property", short: "Details" },
  { slug: "floor-plan", label: "Floor plan", short: "Plan" },
  { slug: "photos", label: "Photos", short: "Photos" },
  { slug: "rooms", label: "Rooms", short: "Rooms" },
  { slug: "tour", label: "Hotspots", short: "Hotspots" },
  { slug: "publish", label: "Publish", short: "Publish" },
] as const;

export type StepSlug = (typeof EDITOR_STEPS)[number]["slug"];

/** Which steps look "done" — drives the check marks and the resume redirect. */
export function stepCompletion(graph: PropertyGraph): Record<StepSlug, boolean> {
  const photos = graph.media.filter((m) => m.kind !== "video" || m.src.video);
  const assigned = photos.filter((m) => m.roomId);
  const plannedFloors = graph.floors.filter((f) => f.planType !== "none");
  const placeable = graph.rooms.filter((r) => assigned.some((m) => m.roomId === r.id));
  return {
    property: Boolean(graph.property.name),
    "floor-plan": plannedFloors.length > 0,
    photos: photos.length > 0,
    rooms: photos.length > 0 && assigned.length === photos.length && graph.rooms.length > 0,
    tour: placeable.length > 0 && placeable.some((r) => r.hotspot !== null),
    publish: graph.tour.status === "published",
  };
}

/** Where to drop someone returning to a tour. */
export function resumeStep(graph: PropertyGraph): StepSlug {
  const done = stepCompletion(graph);
  if (graph.media.length === 0) return done["floor-plan"] ? "photos" : "floor-plan";
  if (!done.rooms) return "rooms";
  if (!done.tour && done["floor-plan"]) return "tour";
  return done.publish ? "publish" : "tour";
}
