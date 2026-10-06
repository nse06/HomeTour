/* eslint-disable @next/next/no-img-element -- pre-generated variants */
"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { MediaDTO } from "@/lib/data/types";

/** Full-screen photo viewer: swipe (scroll-snap), arrow keys, counter. */
export function Lightbox({
  items,
  index,
  title,
  onClose,
  onIndexChange,
}: {
  items: MediaDTO[];
  index: number;
  title: string;
  onClose: () => void;
  onIndexChange?: (i: number) => void;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(index);

  useEffect(() => {
    const el = track.current;
    if (el) el.scrollTo({ left: index * el.clientWidth, behavior: "instant" as ScrollBehavior });
  }, [index]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", key);
    };
  });

  function go(delta: number) {
    const el = track.current;
    if (!el) return;
    const next = Math.max(0, Math.min(items.length - 1, current + delta));
    el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black/95 animate-fade-in" role="dialog" aria-modal="true" aria-label={`${title} photos`}>
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <p className="text-sm text-white/80">
          {title} · {current + 1} / {items.length}
        </p>
        <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Close photos">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div
        ref={track}
        className="scrollbar-none flex flex-1 snap-x snap-mandatory overflow-x-auto"
        onScroll={(e) => {
          const el = e.currentTarget;
          const i = Math.round(el.scrollLeft / el.clientWidth);
          if (i !== current) {
            setCurrent(i);
            onIndexChange?.(i);
          }
        }}
      >
        {items.map((m, i) => (
          <figure key={m.id} className="flex h-full w-full shrink-0 snap-center flex-col items-center justify-center px-2 pb-6 sm:px-16">
            <img
              src={m.src.xl ?? m.src.lg ?? m.src.md ?? m.src.poster}
              srcSet={m.srcSet || undefined}
              sizes="100vw"
              alt={m.caption ?? `${title} photo ${i + 1}`}
              loading={Math.abs(i - index) <= 1 ? "eager" : "lazy"}
              className="max-h-full max-w-full select-none object-contain"
              draggable={false}
            />
            {m.caption ? <figcaption className="mt-3 text-sm text-white/70">{m.caption}</figcaption> : null}
          </figure>
        ))}
      </div>
      {items.length > 1 ? (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            disabled={current === 0}
            className="absolute left-4 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-0 sm:flex"
            aria-label="Previous photo"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            disabled={current === items.length - 1}
            className="absolute right-4 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-0 sm:flex"
            aria-label="Next photo"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      ) : null}
    </div>
  );
}
