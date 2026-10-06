import type { Metadata } from "next";
import { navigableRooms, pickCover, roomMedia } from "@/lib/data/derive";
import type { PropertyGraph, PropertyType } from "@/lib/data/types";
import { propertyFacts } from "@/lib/tour";
import { pluralize } from "@/lib/utils";

const SCHEMA_TYPES: Record<PropertyType, string> = {
  house: "SingleFamilyResidence",
  apartment: "Apartment",
  condo: "Apartment",
  vacation_rental: "Accommodation",
  hotel: "Hotel",
  venue: "EventVenue",
  other: "Place",
};

const absolute = (origin: string, url: string) => (/^https?:\/\//.test(url) ? url : `${origin}${url}`);

export function tourDescription(graph: PropertyGraph): string {
  if (graph.property.description) return graph.property.description.slice(0, 155);
  const facts = propertyFacts(graph.property);
  const rooms = navigableRooms(graph);
  const lead = facts.length ? `${facts.slice(0, 3).join(" · ")}. ` : "";
  return `${lead}Explore ${pluralize(rooms.length, "room")} in an interactive walkthrough with a clickable floor plan and photo galleries.`.slice(0, 160);
}

export function tourMetadata(graph: PropertyGraph, path: string, origin: string): Metadata {
  const cover = pickCover(graph);
  const rawImage = cover?.src.lg ?? cover?.src.md;
  const image = rawImage ? absolute(origin, rawImage) : undefined;
  const title = graph.property.address ? `${graph.property.tourTitle} — ${graph.property.address}` : graph.property.tourTitle;
  const description = tourDescription(graph);
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `${origin}${path}` },
    robots: graph.tour.settings?.noindex ? { index: false, follow: false } : undefined,
    openGraph: {
      type: "website",
      title: graph.property.tourTitle,
      description,
      url: `${origin}${path}`,
      images: image ? [{ url: image, width: cover?.width ?? undefined, height: cover?.height ?? undefined, alt: graph.property.tourTitle }] : undefined,
    },
    twitter: { card: "summary_large_image", title: graph.property.tourTitle, description, images: image ? [image] : undefined },
  };
}

export function tourJsonLd(graph: PropertyGraph, path: string, origin: string) {
  const p = graph.property;
  const rooms = navigableRooms(graph);
  const images = rooms
    .flatMap((r) => roomMedia(r, graph.media).slice(0, 2))
    .filter((m) => m.kind === "photo" && m.src.lg)
    .slice(0, 8)
    .map((m) => absolute(origin, m.src.lg!));
  return {
    "@context": "https://schema.org",
    "@type": SCHEMA_TYPES[p.propertyType],
    name: p.tourTitle,
    description: tourDescription(graph),
    url: absolute(origin, path),
    image: images,
    ...(p.address ? { address: p.address } : {}),
    ...(p.bedrooms ? { numberOfBedrooms: p.bedrooms } : {}),
    ...(p.bathrooms ? { numberOfBathroomsTotal: p.bathrooms } : {}),
    ...(rooms.length ? { numberOfRooms: rooms.length } : {}),
    ...(p.squareFeet ? { floorSize: { "@type": "QuantitativeValue", value: p.squareFeet, unitCode: "FTK" } } : {}),
    ...(p.yearBuilt ? { yearBuilt: p.yearBuilt } : {}),
    ...(p.amenities.length
      ? { amenityFeature: p.amenities.map((a) => ({ "@type": "LocationFeatureSpecification", name: a, value: true })) }
      : {}),
  };
}
