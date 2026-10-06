/**
 * Room/area taxonomy shared by the AI classifier, the organizer, the editor and the viewer.
 * Order of ROOM_CATEGORIES is the natural walkthrough order used to sequence a tour.
 */

export interface RoomCategory {
  id: string;
  label: string;
  icon: RoomIconKey;
  /** Lower-case keywords used for filename hints (no AI required). */
  keywords: string[];
}

export const ROOM_ICON_KEYS = [
  "house",
  "door",
  "sofa",
  "chef",
  "dining",
  "bed-double",
  "bed",
  "bath",
  "shower",
  "briefcase",
  "washer",
  "layers",
  "car",
  "sun",
  "fence",
  "trees",
  "waves",
  "sparkles",
  "armchair",
  "dumbbell",
  "wine",
  "tv",
  "baby",
  "book",
  "coffee",
  "music",
  "party",
  "building",
  "hotel",
  "mountain",
  "gamepad",
  "flower",
  "flame",
  "lamp",
  "box",
] as const;

export type RoomIconKey = (typeof ROOM_ICON_KEYS)[number];

export const ROOM_CATEGORIES: RoomCategory[] = [
  {
    id: "exterior",
    label: "Exterior",
    icon: "house",
    keywords: ["exterior", "front", "facade", "outside", "curb", "street", "elevation", "driveway", "aerial", "drone"],
  },
  {
    id: "entryway",
    label: "Entryway",
    icon: "door",
    keywords: ["entry", "entryway", "foyer", "entrance", "hallway", "hall", "mudroom", "vestibule", "lobby"],
  },
  {
    id: "living_room",
    label: "Living Room",
    icon: "sofa",
    keywords: ["living", "lounge", "family", "greatroom", "sitting"],
  },
  { id: "kitchen", label: "Kitchen", icon: "chef", keywords: ["kitchen", "pantry", "kitchenette"] },
  { id: "dining_room", label: "Dining Room", icon: "dining", keywords: ["dining", "breakfast", "dinette"] },
  {
    id: "primary_bedroom",
    label: "Primary Bedroom",
    icon: "bed-double",
    keywords: ["primary", "master", "owner", "owners", "mainbed"],
  },
  { id: "bedroom", label: "Bedroom", icon: "bed", keywords: ["bedroom", "bed", "guestroom", "nursery", "kids", "bunk"] },
  {
    id: "bathroom",
    label: "Bathroom",
    icon: "bath",
    keywords: ["bath", "bathroom", "ensuite", "shower", "powder", "wc", "toilet", "restroom", "lavatory", "vanity"],
  },
  { id: "office", label: "Office", icon: "briefcase", keywords: ["office", "study", "workspace", "den", "library"] },
  { id: "laundry", label: "Laundry", icon: "washer", keywords: ["laundry", "utility", "washer", "dryer"] },
  { id: "basement", label: "Basement", icon: "layers", keywords: ["basement", "cellar", "lowerlevel", "rec"] },
  { id: "garage", label: "Garage", icon: "car", keywords: ["garage", "carport", "parking", "workshop"] },
  {
    id: "patio",
    label: "Patio",
    icon: "sun",
    keywords: ["patio", "deck", "terrace", "porch", "veranda", "pergola", "outdoor", "rooftop"],
  },
  { id: "balcony", label: "Balcony", icon: "fence", keywords: ["balcony", "lanai"] },
  { id: "yard", label: "Yard", icon: "trees", keywords: ["yard", "garden", "backyard", "lawn", "landscape", "grounds"] },
  { id: "pool", label: "Pool", icon: "waves", keywords: ["pool", "spa", "hottub", "jacuzzi"] },
  { id: "other", label: "Other", icon: "sparkles", keywords: [] },
];

export const ROOM_CATEGORY_IDS = ROOM_CATEGORIES.map((c) => c.id);

const byId = new Map(ROOM_CATEGORIES.map((c, i) => [c.id, { ...c, order: i }]));

export function getCategory(id: string | null | undefined): RoomCategory & { order: number } {
  return byId.get(id ?? "other") ?? byId.get("other")!;
}

export function isRoomCategory(id: string): boolean {
  return byId.has(id);
}

export function categoryOrder(id: string | null | undefined): number {
  return getCategory(id).order;
}

/** "Bedroom" → "Bedroom 2" when taken, etc. Case-insensitive. */
export function uniqueRoomName(base: string, existing: Iterable<string>): string {
  const taken = new Set([...existing].map((n) => n.trim().toLowerCase()));
  if (!taken.has(base.toLowerCase())) return base;
  for (let i = 2; i < 100; i++) {
    const candidate = `${base} ${i}`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
  return `${base} ${Date.now() % 1000}`;
}

/**
 * Room nouns win over modifiers: "Master Bath" is a bathroom, "Master Suite" a primary bedroom.
 * Checked in this priority order; primary/bedroom are resolved last.
 */
const NAME_PRIORITY = [
  "bathroom",
  "kitchen",
  "dining_room",
  "living_room",
  "office",
  "laundry",
  "garage",
  "pool",
  "balcony",
  "patio",
  "yard",
  "basement",
  "entryway",
  "exterior",
];
const PRIMARY_MODIFIERS = ["primary", "master", "owner", "owners", "mainbed"];
const BEDROOM_NOUNS = ["bedroom", "bed", "suite", "guestroom", "nursery", "bunk", "kids"];

/** Category guess from a room name or photo filename ("Master Suite" → primary_bedroom). */
export function categoryFromName(name: string): string | null {
  const tokens = tokenize(name);
  if (tokens.length === 0) return null;
  for (const id of NAME_PRIORITY) {
    const cat = getCategory(id);
    if (tokens.some((t) => cat.keywords.includes(t))) return id;
  }
  const hasPrimary = tokens.some((t) => PRIMARY_MODIFIERS.includes(t));
  const hasBedroom = tokens.some((t) => BEDROOM_NOUNS.includes(t));
  if (hasPrimary && (hasBedroom || tokens.length <= 2)) return "primary_bedroom";
  if (hasBedroom) return "bedroom";
  return null;
}

/** Lower-cased word tokens, also joining adjacent pairs ("great room" → "greatroom"). */
export function tokenize(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/\.[a-z0-9]{2,5}$/, "")
    .split(/[^a-z]+/)
    .filter(Boolean);
  const pairs = words.slice(1).map((w, i) => words[i] + w);
  return [...words, ...pairs];
}
