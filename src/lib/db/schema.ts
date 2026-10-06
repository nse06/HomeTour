import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/* ------------------------------------------------------------------ */
/* JSON column shapes                                                  */
/* ------------------------------------------------------------------ */

export type VariantName = "thumb" | "sm" | "md" | "lg" | "xl" | "pano" | "panoSm" | "poster" | "video";

export interface MediaVariant {
  key: string;
  width: number;
  height: number;
  bytes?: number;
}

export type MediaVariants = Partial<Record<VariantName, MediaVariant>>;

/** Normalized (0..1) shapes relative to the floor-plan surface. */
export type RoomRegion =
  | { type: "rect"; x: number; y: number; w: number; h: number }
  | { type: "polygon"; points: [number, number][] };

export interface TourCta {
  enabled: boolean;
  label: string;
  type: "url" | "email" | "phone";
  value: string;
}

export interface TourSettings {
  accentColor?: string;
  showBranding?: boolean;
  showContact?: boolean;
  cta?: TourCta;
  noindex?: boolean;
}

/* ------------------------------------------------------------------ */
/* Tables                                                              */
/* ------------------------------------------------------------------ */

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
};

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  /** Null for guest accounts until they save their work with an email. */
  email: text("email").unique(),
  passwordHash: text("password_hash"),
  name: text("name"),
  isGuest: integer("is_guest", { mode: "boolean" }).notNull().default(true),
  plan: text("plan", { enum: ["free", "pro", "business"] }).notNull().default("free"),
  ...timestamps,
});

export const sessions = sqliteTable(
  "sessions",
  {
    /** SHA-256 of the session token; the raw token only lives in the cookie. */
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const PROPERTY_TYPES = ["house", "apartment", "condo", "vacation_rental", "hotel", "venue", "other"] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const properties = sqliteTable(
  "properties",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    tourTitle: text("tour_title").notNull(),
    address: text("address"),
    propertyType: text("property_type", { enum: PROPERTY_TYPES }).notNull().default("house"),
    description: text("description"),
    bedrooms: real("bedrooms"),
    bathrooms: real("bathrooms"),
    squareFeet: integer("square_feet"),
    yearBuilt: integer("year_built"),
    neighborhood: text("neighborhood"),
    amenities: text("amenities", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .$defaultFn(() => []),
    contactName: text("contact_name"),
    contactEmail: text("contact_email"),
    contactPhone: text("contact_phone"),
    contactCompany: text("contact_company"),
    /** Explicit cover photo; falls back to the best exterior/first photo. */
    coverMediaId: text("cover_media_id"),
    ...timestamps,
  },
  (t) => [index("properties_owner_idx").on(t.ownerId)],
);

export const floors = sqliteTable(
  "floors",
  {
    id: text("id").primaryKey(),
    propertyId: text("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    /** "image": uploaded floor plan, "layout": simple room-rectangle canvas, "none": not set yet. */
    planType: text("plan_type", { enum: ["none", "image", "layout"] }).notNull().default("none"),
    planMediaId: text("plan_media_id"),
    /** width / height of the navigation surface (image dims, or layout canvas). */
    aspectRatio: real("aspect_ratio").notNull().default(1.5),
    ...timestamps,
  },
  (t) => [index("floors_property_idx").on(t.propertyId)],
);

export const rooms = sqliteTable(
  "rooms",
  {
    id: text("id").primaryKey(),
    propertyId: text("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    floorId: text("floor_id").references(() => floors.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    /** One of ROOM_CATEGORIES ids; free text so new categories need no migration. */
    category: text("category").notNull().default("other"),
    icon: text("icon").notNull().default("sparkles"),
    description: text("description"),
    descriptionSource: text("description_source", { enum: ["user", "ai"] }),
    features: text("features", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .$defaultFn(() => []),
    sortOrder: integer("sort_order").notNull().default(0),
    /** Normalized hotspot position on its floor's plan; null = not placed. */
    hotspotX: real("hotspot_x"),
    hotspotY: real("hotspot_y"),
    region: text("region", { mode: "json" }).$type<RoomRegion | null>(),
    coverMediaId: text("cover_media_id"),
    /** Optional YouTube/Vimeo/hosted video link. */
    videoUrl: text("video_url"),
    ...timestamps,
  },
  (t) => [index("rooms_property_idx").on(t.propertyId)],
);

export const MEDIA_KINDS = ["photo", "pano", "video", "floorplan"] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

export const media = sqliteTable(
  "media",
  {
    id: text("id").primaryKey(),
    propertyId: text("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    roomId: text("room_id").references(() => rooms.id, { onDelete: "set null" }),
    kind: text("kind", { enum: MEDIA_KINDS }).notNull(),
    status: text("status", { enum: ["processing", "ready", "error"] }).notNull().default("ready"),
    /** Storage key of the untouched original (never served publicly). */
    originalKey: text("original_key"),
    variants: text("variants", { mode: "json" })
      .$type<MediaVariants>()
      .notNull()
      .$defaultFn(() => ({})),
    width: integer("width"),
    height: integer("height"),
    mimeType: text("mime_type"),
    sizeBytes: integer("size_bytes"),
    originalFilename: text("original_filename"),
    /** SHA-256 of original bytes: dedupes uploads and keys the AI cache. */
    contentHash: text("content_hash"),
    /** 64-bit difference hash (hex) for near-duplicate detection. */
    dhash: text("dhash"),
    blurDataUrl: text("blur_data_url"),
    caption: text("caption"),
    sortOrder: integer("sort_order").notNull().default(0),
    /** Who put this photo in its room: the user (sticky) or the AI (re-organizable). */
    roomAssignedBy: text("room_assigned_by", { enum: ["user", "ai"] }),
    durationSec: real("duration_sec"),

    // AI analysis (suggestions only — never authoritative).
    aiCategory: text("ai_category"),
    aiConfidence: real("ai_confidence"),
    aiFeatures: text("ai_features", { mode: "json" }).$type<string[]>(),
    aiCaption: text("ai_caption"),
    aiQuality: integer("ai_quality"),
    aiDuplicateOf: text("ai_duplicate_of"),
    aiSource: text("ai_source", { enum: ["ai", "filename", "mock"] }),
    aiModel: text("ai_model"),
    aiAnalyzedAt: integer("ai_analyzed_at", { mode: "timestamp_ms" }),

    ...timestamps,
  },
  (t) => [
    index("media_property_idx").on(t.propertyId),
    index("media_room_idx").on(t.roomId),
    index("media_hash_idx").on(t.contentHash),
  ],
);

export const tours = sqliteTable(
  "tours",
  {
    id: text("id").primaryKey(),
    propertyId: text("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    status: text("status", { enum: ["draft", "published"] }).notNull().default("draft"),
    publishedAt: integer("published_at", { mode: "timestamp_ms" }),
    settings: text("settings", { mode: "json" })
      .$type<TourSettings>()
      .notNull()
      .$defaultFn(() => ({})),
    ...timestamps,
  },
  (t) => [uniqueIndex("tours_slug_idx").on(t.slug), uniqueIndex("tours_property_idx").on(t.propertyId)],
);

export const analyticsEvents = sqliteTable(
  "analytics_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    eventType: text("event_type").notNull(),
    tourId: text("tour_id"),
    propertyId: text("property_id"),
    userId: text("user_id"),
    roomId: text("room_id"),
    mediaId: text("media_id"),
    /** Anonymous per-tab session id (no cookies, no IPs). */
    sessionId: text("session_id"),
    /** Traffic source: direct | qr | embed | share | preview … */
    source: text("source"),
    /** Numeric payload, e.g. session duration in ms. */
    value: real("value"),
    meta: text("meta", { mode: "json" }).$type<Record<string, string | number | boolean>>(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [
    index("events_tour_idx").on(t.tourId, t.createdAt),
    index("events_type_idx").on(t.eventType, t.createdAt),
  ],
);

export const aiUsage = sqliteTable(
  "ai_usage",
  {
    id: text("id").primaryKey(),
    userId: text("user_id"),
    propertyId: text("property_id"),
    purpose: text("purpose", { enum: ["classify", "describe", "organize"] }).notNull(),
    model: text("model").notNull(),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    costUsd: real("cost_usd").notNull().default(0),
    items: integer("items").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [index("ai_usage_property_idx").on(t.propertyId)],
);

/** Content-addressed cache so identical photos are never analyzed twice. */
export const aiCache = sqliteTable("ai_cache", {
  key: text("key").primaryKey(),
  result: text("result", { mode: "json" }).$type<unknown>().notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type User = typeof users.$inferSelect;
export type Property = typeof properties.$inferSelect;
export type Floor = typeof floors.$inferSelect;
export type Room = typeof rooms.$inferSelect;
export type Media = typeof media.$inferSelect;
export type Tour = typeof tours.$inferSelect;
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
