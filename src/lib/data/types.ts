/**
 * Client-safe data shapes. Server code maps DB rows to these (with public URLs resolved);
 * client components import only these types.
 */
import type { MediaKind, PropertyType, RoomRegion, TourCta, TourSettings } from "@/lib/db/schema";

export type { MediaKind, PropertyType, RoomRegion, TourCta, TourSettings };

export interface MediaSources {
  thumb?: string;
  sm?: string;
  md?: string;
  lg?: string;
  xl?: string;
  pano?: string;
  panoSm?: string;
  video?: string;
  poster?: string;
}

export interface MediaAi {
  category: string | null;
  confidence: number | null;
  features: string[];
  caption: string | null;
  quality: number | null;
  duplicateOf: string | null;
  source: "ai" | "filename" | "mock" | null;
}

export interface MediaDTO {
  id: string;
  kind: MediaKind;
  status: "processing" | "ready" | "error";
  roomId: string | null;
  sortOrder: number;
  width: number | null;
  height: number | null;
  blur: string | null;
  caption: string | null;
  filename: string | null;
  src: MediaSources;
  /** "url 320w, url 640w, …" for <img srcset>. */
  srcSet: string;
  roomAssignedBy: "user" | "ai" | null;
  ai: MediaAi | null;
  createdAt: number;
}

export interface RoomDTO {
  id: string;
  floorId: string | null;
  name: string;
  category: string;
  icon: string;
  description: string | null;
  descriptionSource: "user" | "ai" | null;
  features: string[];
  sortOrder: number;
  hotspot: { x: number; y: number } | null;
  region: RoomRegion | null;
  coverMediaId: string | null;
  videoUrl: string | null;
}

export interface FloorDTO {
  id: string;
  name: string;
  sortOrder: number;
  planType: "none" | "image" | "layout";
  planMediaId: string | null;
  aspectRatio: number;
  plan: MediaDTO | null;
}

export interface PropertyDTO {
  id: string;
  name: string;
  tourTitle: string;
  address: string | null;
  propertyType: PropertyType;
  description: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  squareFeet: number | null;
  yearBuilt: number | null;
  neighborhood: string | null;
  amenities: string[];
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactCompany: string | null;
  coverMediaId: string | null;
  updatedAt: number;
}

export interface TourDTO {
  id: string;
  slug: string;
  status: "draft" | "published";
  publishedAt: number | null;
  settings: TourSettings;
}

/** Everything the editor or the viewer needs for one property, normalized. */
export interface PropertyGraph {
  property: PropertyDTO;
  floors: FloorDTO[];
  rooms: RoomDTO[];
  /** Photos, panoramas and videos (floor plans live on floors). */
  media: MediaDTO[];
  tour: TourDTO;
}

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  house: "House",
  apartment: "Apartment",
  condo: "Condo",
  vacation_rental: "Vacation rental",
  hotel: "Hotel",
  venue: "Venue",
  other: "Other",
};
