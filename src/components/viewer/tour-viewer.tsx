/* eslint-disable @next/next/no-img-element -- pre-generated variants */
"use client";

import { ArrowRight, ChevronRight, ExternalLink, Mail, Phone, Play, Rotate3d, Share2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { LogoMark } from "@/components/logo";
import { Photo } from "@/components/media/photo";
import { RoomIcon } from "@/components/room-icon";
import { HotspotPin } from "@/components/tour/hotspot-pin";
import { PlanSurface } from "@/components/tour/plan-surface";
import { getSessionId, trackClient, trackOncePerSession } from "@/lib/analytics/client";
import { navigableRooms, pickCover, roomMedia } from "@/lib/data/derive";
import { PROPERTY_TYPE_LABELS, type MediaDTO, type PropertyGraph, type RoomDTO } from "@/lib/data/types";
import { ctaHref, propertyFacts, roomSlugs } from "@/lib/tour";
import { cn, formatCount, formatNumber, pluralize, telHref } from "@/lib/utils";
import { Lightbox } from "./lightbox";
import { PanoViewer } from "./pano-viewer";
import { RoomPanel } from "./room-panel";

export type ViewerMode = "public" | "embed" | "preview";

export function TourViewer({
  graph,
  mode,
  shareUrl,
  initialRoom,
}: {
  graph: PropertyGraph;
  mode: ViewerMode;
  shareUrl: string;
  initialRoom?: string | null;
}) {
  const { property, tour } = graph;
  const settings = tour.settings ?? {};
  const rooms = useMemo(() => navigableRooms(graph), [graph]);
  const slugs = useMemo(() => roomSlugs(rooms), [rooms]);
  const bySlug = useMemo(() => new Map([...slugs].map(([id, slug]) => [slug, id])), [slugs]);
  const cover = useMemo(() => pickCover(graph), [graph]);
  const floors = graph.floors.filter((f) => f.planType !== "none" && rooms.some((r) => r.floorId === f.id && r.hotspot));
  const [floorId, setFloorId] = useState(floors[0]?.id ?? null);
  const [activeId, setActiveId] = useState<string | null>(initialRoom ? (bySlug.get(initialRoom) ?? null) : null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ index: number } | null>(null);
  const [pano, setPano] = useState<MediaDTO | null>(null);
  const seenPhotos = useRef(new Set<string>());
  const startedAt = useRef<number>(0);
  const track = mode !== "preview";
  const accent = settings.accentColor;

  const source = useMemo(() => {
    if (mode === "embed") return "embed";
    if (typeof window === "undefined") return "direct";
    const src = new URLSearchParams(window.location.search).get("src");
    return src && ["qr", "share", "link", "embed"].includes(src) ? src : "direct";
  }, [mode]);

  const active = rooms.find((r) => r.id === activeId) ?? null;
  const activeIndex = active ? rooms.indexOf(active) : -1;
  const activeItems = useMemo(() => (active ? roomMedia(active, graph.media) : []), [active, graph.media]);
  const floor = floors.find((f) => f.id === floorId) ?? floors[0] ?? null;
  const offPlan = rooms.filter((r) => !r.hotspot || !floors.some((f) => f.id === r.floorId));

  // Analytics: one view per tab session, plus time spent on leave.
  useEffect(() => {
    if (!track) return;
    startedAt.current = Date.now();
    getSessionId();
    trackOncePerSession(mode === "embed" ? "embed_viewed" : "tour_viewed", `view:${tour.id}`, { tourId: tour.id, source });
    if (mode === "embed") trackOncePerSession("tour_viewed", `view:${tour.id}`, { tourId: tour.id, source });
    let sent = false;
    const end = () => {
      if (sent || !startedAt.current) return;
      sent = true;
      trackClient("tour_session_end", { tourId: tour.id, source, value: Date.now() - startedAt.current });
    };
    const onHide = () => document.visibilityState === "hidden" && end();
    window.addEventListener("pagehide", end);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("pagehide", end);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [track, mode, tour.id, source]);

  // URL state: ?room=kitchen is shareable and the back button closes the room.
  useEffect(() => {
    const onPop = () => {
      const slug = new URLSearchParams(window.location.search).get("room");
      setActiveId(slug ? (bySlug.get(slug) ?? null) : null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [bySlug]);

  const openRoom = useCallback(
    (room: RoomDTO | null, opts: { replace?: boolean } = {}) => {
      setActiveId(room?.id ?? null);
      setLightbox(null);
      const url = new URL(window.location.href);
      if (room) url.searchParams.set("room", slugs.get(room.id) ?? room.id);
      else url.searchParams.delete("room");
      if (opts.replace) window.history.replaceState(null, "", url);
      else window.history.pushState(null, "", url);
      if (room) {
        if (room.floorId && floors.some((f) => f.id === room.floorId)) setFloorId(room.floorId);
        if (track) trackClient("room_viewed", { tourId: tour.id, roomId: room.id, source });
      }
    },
    [slugs, floors, track, tour.id, source],
  );

  // Keyboard: ←/→ between rooms, Esc closes.
  useEffect(() => {
    if (!active || lightbox || pano) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "Escape") openRoom(null);
      if (e.key === "ArrowRight" && rooms[activeIndex + 1]) openRoom(rooms[activeIndex + 1], { replace: true });
      if (e.key === "ArrowLeft" && rooms[activeIndex - 1]) openRoom(rooms[activeIndex - 1], { replace: true });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, activeIndex, rooms, lightbox, pano, openRoom]);

  // Lock page scroll while the room sheet is open on phones.
  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    if (window.matchMedia("(max-width: 767px)").matches) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [active]);

  const onPhotoView = (m: MediaDTO) => {
    if (!track || seenPhotos.current.has(m.id)) return;
    seenPhotos.current.add(m.id);
    trackClient("photo_viewed", { tourId: tour.id, roomId: m.roomId ?? undefined, mediaId: m.id, source });
  };

  async function share() {
    const url = `${shareUrl}?src=share`;
    if (track) trackClient("tour_shared", { tourId: tour.id, source, meta: { method: "navigator" in globalThis && "share" in navigator ? "native" : "copy" } });
    try {
      if (navigator.share) {
        await navigator.share({ title: property.tourTitle, url });
        return;
      }
    } catch {
      return;
    }
    await navigator.clipboard?.writeText(url);
    toast.success("Link copied");
  }

  const cta = settings.cta;
  const ctaLink = ctaHref(cta, property.tourTitle);
  const onCta = () => track && trackClient("lead_cta_clicked", { tourId: tour.id, source });
  const facts = propertyFacts(property);
  const brand = property.contactCompany || property.contactName;
  const showBranding = settings.showBranding !== false;
  const showContact = settings.showContact !== false && (property.contactName || property.contactEmail || property.contactPhone);
  const accentStyle = accent ? ({ "--color-accent": accent } as React.CSSProperties) : undefined;
  const embed = mode === "embed";

  const ctaButton = (variant: "light" | "dark", className?: string) =>
    ctaLink && cta ? (
      <a
        href={ctaLink}
        target={cta.type === "url" ? "_blank" : undefined}
        rel={cta.type === "url" ? "noopener" : undefined}
        onClick={onCta}
        className={cn(
          "inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-[15px] font-semibold transition-all active:scale-[0.98]",
          variant === "light" ? "bg-white text-ink hover:bg-white/90" : "bg-ink text-white hover:bg-ink-2",
          className,
        )}
        style={variant === "dark" && accent ? { backgroundColor: accent } : undefined}
      >
        {cta.label}
      </a>
    ) : null;

  return (
    <div className={cn("min-h-dvh bg-canvas", !embed && ctaLink && "pb-20 sm:pb-0")} style={accentStyle}>
      {/* HERO */}
      {embed ? (
        <header className="flex items-center justify-between gap-3 border-b border-line bg-surface px-4 py-3">
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold text-ink">{property.tourTitle}</h1>
            {facts.length ? <p className="truncate text-xs text-ink-3">{facts.join(" · ")}</p> : null}
          </div>
          <a
            href={`${shareUrl}?src=embed`}
            target="_blank"
            rel="noopener"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-sunken px-3 py-1.5 text-xs font-medium text-ink-2 hover:bg-line"
          >
            Full screen <ExternalLink className="h-3 w-3" />
          </a>
        </header>
      ) : (
        <section className="relative h-[56svh] min-h-[420px] w-full overflow-hidden bg-ink md:h-[70vh] md:max-h-[820px]">
          {cover ? <Photo media={cover} sizes="100vw" priority className="absolute inset-0 h-full w-full scale-[1.02] animate-fade-in" alt={property.tourTitle} /> : null}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-black/35" />
          <div className="absolute inset-x-0 top-0 mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 pt-4 sm:px-8 sm:pt-6">
            <div className="flex min-w-0 items-center gap-2.5 text-white">
              {brand ? (
                <span className="truncate text-sm font-semibold tracking-tight">{brand}</span>
              ) : (
                <span className="inline-flex items-center gap-2 text-sm font-semibold">
                  <LogoMark className="h-7 w-7" /> HomeTour
                </span>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => void share()}
                className="inline-flex h-10 items-center gap-2 rounded-full bg-white/15 px-4 text-sm font-medium text-white backdrop-blur-md transition-colors hover:bg-white/25"
              >
                <Share2 className="h-4 w-4" />
                <span className="hidden sm:inline">Share</span>
              </button>
              {ctaButton("light", "hidden sm:inline-flex h-10 text-sm")}
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 mx-auto max-w-7xl px-5 pb-8 text-white sm:px-8 sm:pb-14">
            {property.address ? (
              <p className="animate-fade-up text-[13px] font-medium uppercase tracking-[0.18em] text-white/75">{property.address}</p>
            ) : null}
            <h1 className="mt-3 max-w-4xl animate-fade-up font-display text-[42px] leading-[1.0] [animation-delay:80ms] sm:text-6xl lg:text-[80px]">
              {property.tourTitle}
            </h1>
            {facts.length ? (
              <p className="mt-4 flex animate-fade-up flex-wrap items-center gap-x-3 gap-y-1 text-[15px] text-white/85 [animation-delay:140ms] sm:text-base">
                {facts.map((f, i) => (
                  <span key={f} className="inline-flex items-center gap-3">
                    {i > 0 ? <span className="h-1 w-1 rounded-full bg-white/50" /> : null}
                    {f}
                  </span>
                ))}
              </p>
            ) : null}
            <div className="mt-7 flex animate-fade-up flex-wrap gap-3 [animation-delay:200ms]">
              {rooms[0] ? (
                <button
                  type="button"
                  onClick={() => openRoom(rooms[0])}
                  className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-[15px] font-semibold text-ink shadow-lift transition-transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Play className="h-4 w-4 fill-current" />
                  Start the tour
                </button>
              ) : null}
              <a
                href="#explore"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-white/15 px-6 text-[15px] font-medium text-white backdrop-blur-md transition-colors hover:bg-white/25"
              >
                {floors.length ? "Floor plan" : "All rooms"}
              </a>
            </div>
          </div>
        </section>
      )}

      {/* EXPLORE */}
      <section id="explore" className={cn("mx-auto max-w-7xl scroll-mt-4 px-4 sm:px-8", embed ? "py-4" : "py-10 sm:py-16")}>
        {!embed ? (
          <div className="mb-6 flex items-end justify-between gap-4 px-1">
            <div>
              <h2 className="font-display text-[34px] leading-none text-ink sm:text-[44px]">Explore the {property.propertyType === "venue" || property.propertyType === "hotel" ? "space" : "home"}</h2>
              <p className="mt-2 text-[15px] text-ink-3">
                {floors.length ? "Tap a room on the plan, or pick one from the list." : "Pick a room to see it."} {pluralize(rooms.length, "room")} ·{" "}
                {pluralize(graph.media.filter((m) => m.roomId).length, "photo")}
              </p>
            </div>
          </div>
        ) : null}

        {rooms.length === 0 ? (
          <div className="rounded-3xl bg-surface px-6 py-16 text-center ring-1 ring-line">
            <p className="font-semibold text-ink">This tour doesn&apos;t have any rooms yet.</p>
          </div>
        ) : floor ? (
          <div className={cn("grid gap-5 lg:gap-8", embed ? "lg:grid-cols-[minmax(0,1.7fr)_minmax(260px,1fr)]" : "lg:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]")}>
            <div className="min-w-0 rounded-[28px] bg-surface p-3 shadow-soft ring-1 ring-line sm:p-6">
              {floors.length > 1 ? (
                <div className="scrollbar-none mb-4 flex gap-1.5 overflow-x-auto">
                  {floors.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFloorId(f.id)}
                      className={cn(
                        "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                        f.id === floor.id ? "bg-ink text-white" : "bg-sunken text-ink-2 hover:bg-line",
                      )}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              ) : null}
              <div className="rounded-2xl bg-[#fbfaf7] p-1 sm:p-3">
                <PlanSurface floor={floor} rooms={rooms} activeRoomId={activeId} hoverRoomId={hoverId} priority={embed}>
                  {rooms
                    .filter((r) => r.floorId === floor.id && r.hotspot)
                    .map((room, i) => (
                      <HotspotPin
                        key={room.id}
                        delay={i * 380}
                        x={room.hotspot!.x}
                        y={room.hotspot!.y}
                        icon={room.icon}
                        label={room.name}
                        active={room.id === activeId || room.id === hoverId}
                        labelMode="auto"
                        accent={accent}
                        onClick={() => openRoom(room)}
                      />
                    ))}
                </PlanSurface>
              </div>
              {offPlan.length ? (
                <div className="mt-4 flex flex-wrap items-center gap-2 px-1">
                  <span className="text-[13px] text-ink-4">Also explore</span>
                  {offPlan.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => openRoom(r)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-sunken px-3 py-1.5 text-[13px] font-medium text-ink-2 transition-colors hover:bg-line hover:text-ink"
                    >
                      <RoomIcon icon={r.icon} className="h-3.5 w-3.5" />
                      {r.name}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <RoomList rooms={rooms} media={graph.media} activeId={activeId} onOpen={openRoom} onHover={setHoverId} />
          </div>
        ) : (
          <RoomGrid rooms={rooms} media={graph.media} onOpen={openRoom} />
        )}
      </section>

      {/* ABOUT */}
      {!embed && (property.description || property.amenities.length || facts.length || property.neighborhood) ? (
        <section className="mx-auto grid max-w-7xl gap-10 px-5 pb-16 sm:px-8 lg:grid-cols-[1.4fr_1fr] lg:gap-16">
          <div>
            <h2 className="font-display text-[34px] text-ink sm:text-[44px]">About</h2>
            {property.description ? <p className="mt-4 whitespace-pre-line text-lg leading-relaxed text-ink-2">{property.description}</p> : null}
            {property.amenities.length ? (
              <ul className="mt-6 flex flex-wrap gap-2">
                {property.amenities.map((a) => (
                  <li key={a} className="rounded-full bg-surface px-3.5 py-1.5 text-sm text-ink-2 ring-1 ring-line">
                    {a}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <dl className="grid grid-cols-2 gap-px self-start overflow-hidden rounded-3xl bg-line ring-1 ring-line">
            {[
              ["Type", PROPERTY_TYPE_LABELS[property.propertyType]],
              ["Bedrooms", formatCount(property.bedrooms)],
              ["Bathrooms", formatCount(property.bathrooms)],
              ["Square feet", property.squareFeet ? formatNumber(property.squareFeet) : null],
              ["Year built", property.yearBuilt ? String(property.yearBuilt) : null],
              ["Neighborhood", property.neighborhood],
            ]
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="bg-surface p-5">
                  <dt className="text-[13px] text-ink-4">{k}</dt>
                  <dd className="mt-1 text-lg font-semibold text-ink">{v}</dd>
                </div>
              ))}
          </dl>
        </section>
      ) : null}

      {/* CONTACT */}
      {!embed && (showContact || ctaLink) ? (
        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-8">
          <div className="flex flex-col gap-6 rounded-[28px] bg-ink p-7 text-white sm:flex-row sm:items-center sm:justify-between sm:p-10">
            <div>
              <p className="text-[13px] font-medium uppercase tracking-[0.16em] text-white/50">Interested?</p>
              <p className="mt-2 font-display text-3xl sm:text-4xl">{property.contactName ? `Talk to ${property.contactName}` : "Get in touch"}</p>
              {property.contactCompany ? <p className="mt-1 text-white/60">{property.contactCompany}</p> : null}
              {showContact ? (
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[15px] text-white/85">
                  {property.contactPhone ? (
                    <a href={telHref(property.contactPhone)} className="inline-flex items-center gap-2 hover:text-white">
                      <Phone className="h-4 w-4" /> {property.contactPhone}
                    </a>
                  ) : null}
                  {property.contactEmail ? (
                    <a href={`mailto:${property.contactEmail}`} className="inline-flex items-center gap-2 hover:text-white">
                      <Mail className="h-4 w-4" /> {property.contactEmail}
                    </a>
                  ) : null}
                </div>
              ) : null}
            </div>
            {ctaButton("light", "h-12 px-7 text-base")}
          </div>
        </section>
      ) : null}

      {/* FOOTER */}
      {showBranding ? (
        <footer className={cn("flex justify-center px-4", embed ? "pb-4" : "pb-10")}>
          <a
            href="/?ref=tour"
            target={embed ? "_blank" : undefined}
            rel="noopener"
            className="inline-flex items-center gap-2 rounded-full bg-surface px-3.5 py-2 text-xs font-medium text-ink-3 ring-1 ring-line transition-colors hover:text-ink"
          >
            <LogoMark className="h-5 w-5" />
            Made with HomeTour
          </a>
        </footer>
      ) : null}

      {/* Sticky mobile CTA */}
      {!embed && ctaLink && !active ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/90 p-3 backdrop-blur-xl sm:hidden">{ctaButton("dark", "w-full")}</div>
      ) : null}

      {active ? (
        <RoomPanel
          room={active}
          index={activeIndex}
          total={rooms.length}
          items={activeItems}
          prev={rooms[activeIndex - 1] ?? null}
          next={rooms[activeIndex + 1] ?? null}
          onClose={() => openRoom(null)}
          onNavigate={(r) => openRoom(r, { replace: true })}
          onOpenPhoto={(i) => setLightbox({ index: i })}
          onOpenPano={(m) => setPano(m)}
          onPhotoView={onPhotoView}
          footer={!rooms[activeIndex + 1] && ctaLink ? <div className="mt-8">{ctaButton("dark")}</div> : null}
        />
      ) : null}
      {active && lightbox ? (
        <Lightbox
          items={activeItems.filter((m) => m.kind !== "video")}
          index={Math.min(lightbox.index, activeItems.filter((m) => m.kind !== "video").length - 1)}
          title={active.name}
          onClose={() => setLightbox(null)}
          onIndexChange={(i) => {
            const m = activeItems.filter((x) => x.kind !== "video")[i];
            if (m) onPhotoView(m);
          }}
        />
      ) : null}
      {pano ? (
        <PanoViewer
          src={(typeof window !== "undefined" && window.innerWidth < 900 ? pano.src.panoSm : pano.src.pano) ?? pano.src.pano ?? pano.src.xl ?? pano.src.lg!}
          title={active?.name}
          onClose={() => setPano(null)}
        />
      ) : null}
    </div>
  );
}

function RoomList({
  rooms,
  media,
  activeId,
  onOpen,
  onHover,
}: {
  rooms: RoomDTO[];
  media: MediaDTO[];
  activeId: string | null;
  onOpen: (r: RoomDTO) => void;
  onHover: (id: string | null) => void;
}) {
  return (
    <div className="self-start overflow-hidden rounded-[28px] bg-surface shadow-soft ring-1 ring-line lg:sticky lg:top-6">
      <p className="px-5 pb-2 pt-5 text-[13px] font-semibold uppercase tracking-[0.14em] text-ink-4">Explore</p>
      <ol className="pb-2">
        {rooms.map((room, i) => {
          const items = roomMedia(room, media);
          const thumb = items.find((m) => m.kind !== "video") ?? items[0];
          const has360 = items.some((m) => m.kind === "pano");
          return (
            <li key={room.id}>
              <button
                type="button"
                onClick={() => onOpen(room)}
                onMouseEnter={() => onHover(room.id)}
                onMouseLeave={() => onHover(null)}
                className={cn("flex w-full items-center gap-3.5 px-3 py-2 text-left transition-colors sm:px-4", room.id === activeId ? "bg-sunken" : "hover:bg-sunken/60")}
              >
                <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-sunken">
                  {thumb?.src.thumb || thumb?.src.poster ? (
                    <img src={thumb.src.thumb ?? thumb.src.poster} alt="" loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center">
                      <RoomIcon icon={room.icon} className="h-5 w-5 text-ink-3" />
                    </span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-ink">
                    <span className="mr-2 text-ink-4 tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                    {room.name}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-[13px] text-ink-3">
                    {pluralize(items.filter((m) => m.kind !== "video").length, "photo")}
                    {has360 ? (
                      <span className="inline-flex items-center gap-0.5">
                        · <Rotate3d className="h-3 w-3" /> 360°
                      </span>
                    ) : null}
                    {items.some((m) => m.kind === "video") || room.videoUrl ? " · Video" : ""}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-ink-4" />
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function RoomGrid({ rooms, media, onOpen }: { rooms: RoomDTO[]; media: MediaDTO[]; onOpen: (r: RoomDTO) => void }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {rooms.map((room) => {
        const items = roomMedia(room, media);
        const thumb = items.find((m) => m.kind !== "video");
        return (
          <button
            key={room.id}
            type="button"
            onClick={() => onOpen(room)}
            className="group overflow-hidden rounded-[24px] bg-surface text-left shadow-soft ring-1 ring-line transition-shadow hover:shadow-lift"
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-sunken">
              {thumb ? <Photo media={thumb} sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="h-full w-full transition-transform duration-700 group-hover:scale-[1.03]" /> : null}
            </div>
            <div className="flex items-center justify-between p-5">
              <div>
                <p className="text-lg font-semibold tracking-tight text-ink">{room.name}</p>
                <p className="text-sm text-ink-3">{pluralize(items.length, "photo")}</p>
              </div>
              <ArrowRight className="h-5 w-5 text-ink-3 transition-transform group-hover:translate-x-0.5" />
            </div>
          </button>
        );
      })}
    </div>
  );
}
