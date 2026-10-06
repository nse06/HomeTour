/** Product funnel: tells us whether people actually get from landing → published → viewed. */
export const FUNNEL_STEPS = [
  { type: "landing_view", label: "Landing page views" },
  { type: "create_started", label: "Started creating" },
  { type: "property_created", label: "Property created" },
  { type: "floorplan_uploaded", label: "Floor plan added" },
  { type: "photos_uploaded", label: "Photos uploaded" },
  { type: "ai_processing_started", label: "AI sorting started" },
  { type: "ai_processing_completed", label: "AI sorting completed" },
  { type: "tour_edited", label: "Tour edited" },
  { type: "tour_published", label: "Tour published" },
  { type: "tour_shared", label: "Tour shared" },
  { type: "tour_viewed", label: "Tour viewed" },
  { type: "room_viewed", label: "Room viewed" },
  { type: "lead_cta_clicked", label: "Lead CTA clicked" },
] as const;

export const EVENT_TYPES = [
  ...FUNNEL_STEPS.map((s) => s.type),
  "photo_viewed",
  "tour_session_end",
  "embed_viewed",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

/** Events a browser may send to /api/events (everything else is recorded server-side). */
export const CLIENT_EVENT_TYPES = new Set<EventType>([
  "landing_view",
  "create_started",
  "tour_shared",
  "tour_viewed",
  "room_viewed",
  "photo_viewed",
  "lead_cta_clicked",
  "tour_session_end",
  "embed_viewed",
]);

/** Viewer events must reference a tour. */
export const TOUR_EVENT_TYPES = new Set<EventType>([
  "tour_viewed",
  "room_viewed",
  "photo_viewed",
  "lead_cta_clicked",
  "tour_session_end",
  "embed_viewed",
]);

export const TRAFFIC_SOURCES = ["direct", "qr", "embed", "share", "link"] as const;
export type TrafficSource = (typeof TRAFFIC_SOURCES)[number];

export function isEventType(value: string): value is EventType {
  return (EVENT_TYPES as readonly string[]).includes(value);
}
