import type { Floor, Media, Property, Room, Tour } from "@/lib/db/schema";
import { publicUrl } from "@/lib/storage";
import type { FloorDTO, MediaDTO, MediaSources, PropertyDTO, RoomDTO, TourDTO } from "./types";

const SRCSET_ORDER = ["thumb", "sm", "md", "lg", "xl"] as const;

export function toMediaDTO(m: Media): MediaDTO {
  const src: MediaSources = {};
  for (const [name, variant] of Object.entries(m.variants ?? {})) {
    if (variant) src[name as keyof MediaSources] = publicUrl(variant.key);
  }
  const seen = new Set<number>();
  const srcSet = SRCSET_ORDER.flatMap((name) => {
    const v = m.variants?.[name];
    if (!v || seen.has(v.width)) return [];
    seen.add(v.width);
    return [`${publicUrl(v.key)} ${v.width}w`];
  }).join(", ");

  const hasAi = m.aiAnalyzedAt !== null || m.aiCategory !== null;
  return {
    id: m.id,
    kind: m.kind,
    status: m.status,
    roomId: m.roomId,
    sortOrder: m.sortOrder,
    width: m.width,
    height: m.height,
    blur: m.blurDataUrl,
    caption: m.caption,
    filename: m.originalFilename,
    src,
    srcSet,
    roomAssignedBy: m.roomAssignedBy,
    ai: hasAi
      ? {
          category: m.aiCategory,
          confidence: m.aiConfidence,
          features: m.aiFeatures ?? [],
          caption: m.aiCaption,
          quality: m.aiQuality,
          duplicateOf: m.aiDuplicateOf,
          source: m.aiSource,
        }
      : null,
    createdAt: m.createdAt.getTime(),
  };
}

export function toRoomDTO(r: Room): RoomDTO {
  return {
    id: r.id,
    floorId: r.floorId,
    name: r.name,
    category: r.category,
    icon: r.icon,
    description: r.description,
    descriptionSource: r.descriptionSource,
    features: r.features ?? [],
    sortOrder: r.sortOrder,
    hotspot: r.hotspotX !== null && r.hotspotY !== null ? { x: r.hotspotX, y: r.hotspotY } : null,
    region: r.region ?? null,
    coverMediaId: r.coverMediaId,
    videoUrl: r.videoUrl,
  };
}

export function toFloorDTO(f: Floor, planMedia: Media | undefined): FloorDTO {
  return {
    id: f.id,
    name: f.name,
    sortOrder: f.sortOrder,
    planType: f.planType,
    planMediaId: f.planMediaId,
    aspectRatio: f.aspectRatio,
    plan: planMedia ? toMediaDTO(planMedia) : null,
  };
}

export function toPropertyDTO(p: Property): PropertyDTO {
  return {
    id: p.id,
    name: p.name,
    tourTitle: p.tourTitle,
    address: p.address,
    propertyType: p.propertyType,
    description: p.description,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    squareFeet: p.squareFeet,
    yearBuilt: p.yearBuilt,
    neighborhood: p.neighborhood,
    amenities: p.amenities ?? [],
    contactName: p.contactName,
    contactEmail: p.contactEmail,
    contactPhone: p.contactPhone,
    contactCompany: p.contactCompany,
    coverMediaId: p.coverMediaId,
    updatedAt: p.updatedAt.getTime(),
  };
}

export function toTourDTO(t: Tour): TourDTO {
  return {
    id: t.id,
    slug: t.slug,
    status: t.status,
    publishedAt: t.publishedAt?.getTime() ?? null,
    settings: t.settings ?? {},
  };
}
