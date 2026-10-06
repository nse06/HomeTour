import type { PropertyDTO, RoomDTO, TourCta } from "@/lib/data/types";
import { slugify } from "@/lib/slug";
import { formatCount, formatNumber, telHref } from "@/lib/utils";

/** Stable, readable per-room URL keys: ?room=kitchen, ?room=bedroom-2 … */
export function roomSlugs(rooms: RoomDTO[]): Map<string, string> {
  const used = new Set<string>();
  const out = new Map<string, string>();
  for (const r of rooms) {
    const base = slugify(r.name, 40);
    let slug = base;
    for (let i = 2; used.has(slug); i++) slug = `${base}-${i}`;
    used.add(slug);
    out.set(r.id, slug);
  }
  return out;
}

export type VideoEmbed = { kind: "iframe"; src: string } | { kind: "file"; src: string } | null;

/** YouTube / Vimeo links become privacy-friendly embeds; direct files play natively. */
export function videoEmbed(url: string | null | undefined): VideoEmbed {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}?rel=0` };
    if (host.endsWith("youtube.com")) {
      const id = u.searchParams.get("v") ?? u.pathname.match(/\/(?:embed|shorts|live)\/([\w-]+)/)?.[1];
      if (id) return { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${id}?rel=0` };
    }
    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const id = u.pathname.match(/(\d{5,})/)?.[1];
      if (id) return { kind: "iframe", src: `https://player.vimeo.com/video/${id}?dnt=1` };
    }
    if (/\.(mp4|webm|mov)(\?|$)/i.test(u.pathname)) return { kind: "file", src: url };
  } catch {
    /* invalid URL */
  }
  return null;
}

export function ctaHref(cta: TourCta | undefined, title: string): string | null {
  if (!cta?.enabled || !cta.value) return null;
  if (cta.type === "email") return `mailto:${cta.value}?subject=${encodeURIComponent(`Inquiry: ${title}`)}`;
  if (cta.type === "phone") return telHref(cta.value);
  return /^https?:\/\//i.test(cta.value) ? cta.value : `https://${cta.value}`;
}

export function propertyFacts(p: Pick<PropertyDTO, "bedrooms" | "bathrooms" | "squareFeet" | "yearBuilt">): string[] {
  const facts: string[] = [];
  const beds = formatCount(p.bedrooms);
  const baths = formatCount(p.bathrooms);
  if (beds) facts.push(`${beds} ${p.bedrooms === 1 ? "bed" : "beds"}`);
  if (baths) facts.push(`${baths} ${p.bathrooms === 1 ? "bath" : "baths"}`);
  if (p.squareFeet) facts.push(`${formatNumber(p.squareFeet)} sq ft`);
  if (p.yearBuilt) facts.push(`Built ${p.yearBuilt}`);
  return facts;
}
