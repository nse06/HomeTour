/* eslint-disable @next/next/no-img-element -- pre-generated variants */
"use client";

import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Expand, Map as MapIcon, Play, Rotate3d, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { RoomIcon } from "@/components/room-icon";
import type { MediaDTO, RoomDTO } from "@/lib/data/types";
import { videoEmbed } from "@/lib/tour";
import { cn } from "@/lib/utils";

export function RoomPanel({
  room,
  index,
  total,
  items,
  prev,
  next,
  onClose,
  onNavigate,
  onOpenPhoto,
  onOpenPano,
  onPhotoView,
  footer,
}: {
  room: RoomDTO;
  index: number;
  total: number;
  items: MediaDTO[];
  prev: RoomDTO | null;
  next: RoomDTO | null;
  onClose: () => void;
  onNavigate: (room: RoomDTO) => void;
  onOpenPhoto: (photoIndex: number) => void;
  onOpenPano: (media: MediaDTO) => void;
  onPhotoView?: (media: MediaDTO) => void;
  footer?: React.ReactNode;
}) {
  const track = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [slide, setSlide] = useState(0);
  const embed = videoEmbed(room.videoUrl);

  useEffect(() => {
    setSlide(0);
    track.current?.scrollTo({ left: 0, behavior: "instant" as ScrollBehavior });
    panel.current?.scrollTo({ top: 0 });
    panel.current?.focus({ preventScroll: true });
  }, [room.id]);

  useEffect(() => {
    if (items[slide]) onPhotoView?.(items[slide]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slide, room.id]);

  const go = (delta: number) => {
    const el = track.current;
    if (!el) return;
    const target = Math.max(0, Math.min(items.length - 1, slide + delta));
    el.scrollTo({ left: target * el.clientWidth, behavior: "smooth" });
  };

  return (
    <>
      <div className="fixed inset-0 z-40 hidden bg-black/30 backdrop-blur-[2px] animate-fade-in md:block" onClick={onClose} aria-hidden="true" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={room.name}
        tabIndex={-1}
        className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-surface outline-none animate-slide-in-up md:inset-y-0 md:left-auto md:right-0 md:w-[min(760px,62vw)] md:animate-slide-in-right md:shadow-float"
      >
        {/* Gallery */}
        <div className="relative shrink-0 bg-ink">
          <div
            ref={track}
            className="scrollbar-none flex aspect-[4/3] snap-x snap-mandatory overflow-x-auto md:aspect-[3/2]"
            onScroll={(e) => {
              const el = e.currentTarget;
              const i = Math.round(el.scrollLeft / el.clientWidth);
              if (i !== slide) setSlide(i);
            }}
          >
            {items.length === 0 ? (
              <div className="flex w-full shrink-0 items-center justify-center text-white/50">
                <RoomIcon icon={room.icon} className="h-10 w-10" />
              </div>
            ) : (
              items.map((m, i) => (
                <div key={m.id} className="relative h-full w-full shrink-0 snap-center">
                  {m.kind === "video" && m.src.video ? (
                    <video src={m.src.video} poster={m.src.poster} controls playsInline preload="none" className="h-full w-full bg-black object-contain" />
                  ) : (
                    <button
                      type="button"
                      className="group absolute inset-0 h-full w-full cursor-zoom-in"
                      onClick={() => (m.kind === "pano" ? onOpenPano(m) : onOpenPhoto(i))}
                      aria-label={m.kind === "pano" ? "Open 360° view" : `Open photo ${i + 1} full screen`}
                    >
                      <img
                        src={m.src.lg ?? m.src.md ?? m.src.sm}
                        srcSet={m.srcSet || undefined}
                        sizes="(min-width: 768px) 62vw, 100vw"
                        alt={m.caption ?? `${room.name} photo ${i + 1}`}
                        loading={i === 0 ? "eager" : "lazy"}
                        fetchPriority={i === 0 ? "high" : "auto"}
                        decoding="async"
                        draggable={false}
                        className="h-full w-full object-cover"
                        style={m.blur ? { backgroundImage: `url("${m.blur}")`, backgroundSize: "cover" } : undefined}
                      />
                      {m.kind === "pano" ? (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                          <span className="inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2.5 text-sm font-semibold text-ink shadow-lift">
                            <Rotate3d className="h-4 w-4" />
                            Explore in 360°
                          </span>
                        </span>
                      ) : (
                        <span className="absolute bottom-3 right-3 hidden rounded-full bg-black/45 p-2 text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 md:block">
                          <Expand className="h-4 w-4" />
                        </span>
                      )}
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/50 to-transparent p-3 sm:p-4">
            <span className="pointer-events-auto rounded-full bg-black/40 px-3 py-1.5 text-xs font-medium text-white backdrop-blur">
              {items.length ? `${slide + 1} / ${items.length}` : "No photos"}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-ink shadow-soft transition-colors hover:bg-white"
              aria-label="Close room"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {items.length > 1 ? (
            <>
              <button
                type="button"
                onClick={() => go(-1)}
                className={cn(
                  "absolute left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow-soft transition-opacity md:flex",
                  slide === 0 && "pointer-events-none opacity-0",
                )}
                aria-label="Previous photo"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                className={cn(
                  "absolute right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow-soft transition-opacity md:flex",
                  slide === items.length - 1 && "pointer-events-none opacity-0",
                )}
                aria-label="Next photo"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5 md:hidden">
                {items.map((m, i) => (
                  <span key={m.id} className={cn("h-1.5 rounded-full bg-white transition-all", i === slide ? "w-4 opacity-100" : "w-1.5 opacity-50")} />
                ))}
              </div>
            </>
          ) : null}
        </div>

        {items.length > 1 ? (
          <div className="scrollbar-none hidden shrink-0 gap-2 overflow-x-auto px-6 pt-4 md:flex">
            {items.map((m, i) => (
              <button
                key={m.id}
                type="button"
                onClick={() => track.current?.scrollTo({ left: i * track.current.clientWidth, behavior: "smooth" })}
                className={cn(
                  "relative aspect-[4/3] w-24 shrink-0 overflow-hidden rounded-lg ring-2 transition-all",
                  i === slide ? "ring-ink" : "ring-transparent opacity-70 hover:opacity-100",
                )}
                aria-label={`Show photo ${i + 1}`}
              >
                <img src={m.src.thumb ?? m.src.poster} alt="" loading="lazy" className="h-full w-full object-cover" />
                {m.kind === "pano" ? <Rotate3d className="absolute right-1 top-1 h-3.5 w-3.5 text-white drop-shadow" /> : null}
                {m.kind === "video" ? <Play className="absolute right-1 top-1 h-3.5 w-3.5 fill-white text-white drop-shadow" /> : null}
              </button>
            ))}
          </div>
        ) : null}

        {/* Content */}
        <div className="flex-1 shrink-0 px-5 pb-8 pt-6 sm:px-8">
          <p className="text-[13px] font-medium uppercase tracking-[0.14em] text-ink-4">
            Room {index + 1} of {total}
          </p>
          <h2 className="mt-2 font-display text-[40px] leading-[1.02] text-ink sm:text-5xl">{room.name}</h2>
          {room.description ? <p className="mt-4 max-w-prose text-[17px] leading-relaxed text-ink-2">{room.description}</p> : null}
          {room.features.length ? (
            <ul className="mt-5 flex flex-wrap gap-2">
              {room.features.map((f) => (
                <li key={f} className="rounded-full bg-sunken px-3 py-1.5 text-[13px] font-medium text-ink-2">
                  {f}
                </li>
              ))}
            </ul>
          ) : null}
          {items.some((m) => m.kind === "pano") ? (
            <button
              type="button"
              onClick={() => onOpenPano(items.find((m) => m.kind === "pano")!)}
              className="mt-6 flex w-full items-center gap-4 rounded-2xl bg-canvas p-4 text-left ring-1 ring-line transition-colors hover:bg-sunken"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ink text-white">
                <Rotate3d className="h-5 w-5" />
              </span>
              <span>
                <span className="block font-semibold text-ink">360° view</span>
                <span className="text-sm text-ink-3">Look around the {room.name.toLowerCase()} as if you were standing in it</span>
              </span>
            </button>
          ) : null}
          {embed ? (
            <div className="mt-6 overflow-hidden rounded-2xl bg-black ring-1 ring-line">
              {embed.kind === "iframe" ? (
                <iframe
                  src={embed.src}
                  title={`${room.name} video`}
                  className="aspect-video w-full"
                  allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              ) : (
                <video src={embed.src} controls playsInline preload="metadata" className="aspect-video w-full" />
              )}
            </div>
          ) : null}
          {footer}
        </div>

        {/* Room navigation */}
        <nav className="sticky bottom-0 mt-auto grid grid-cols-2 gap-2 border-t border-line bg-surface/95 p-3 backdrop-blur-xl sm:p-4" aria-label="Rooms">
          {prev ? (
            <button
              type="button"
              onClick={() => onNavigate(prev)}
              className="flex min-w-0 items-center gap-2 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-sunken"
            >
              <ArrowLeft className="h-4 w-4 shrink-0 text-ink-3" />
              <span className="min-w-0">
                <span className="block text-[11px] font-medium uppercase tracking-wider text-ink-4">Previous</span>
                <span className="block truncate text-[15px] font-semibold text-ink">{prev.name}</span>
              </span>
            </button>
          ) : (
            <button type="button" onClick={onClose} className="flex items-center gap-2 rounded-2xl px-3 py-3 text-left text-ink-2 transition-colors hover:bg-sunken">
              <MapIcon className="h-4 w-4 text-ink-3" />
              <span className="text-[15px] font-semibold">Floor plan</span>
            </button>
          )}
          {next ? (
            <button
              type="button"
              onClick={() => onNavigate(next)}
              className="flex min-w-0 items-center justify-end gap-2 rounded-2xl bg-ink px-4 py-3 text-right text-white transition-colors hover:bg-ink-2"
            >
              <span className="min-w-0">
                <span className="block text-[11px] font-medium uppercase tracking-wider text-white/60">Next room</span>
                <span className="block truncate text-[15px] font-semibold">{next.name}</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="flex items-center justify-end gap-2 rounded-2xl bg-ink px-4 py-3 text-right text-white transition-colors hover:bg-ink-2"
            >
              <span className="text-[15px] font-semibold">Finish tour</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </nav>
      </div>
    </>
  );
}
