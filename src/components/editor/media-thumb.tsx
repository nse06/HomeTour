/* eslint-disable @next/next/no-img-element -- pre-generated variants */
"use client";

import { Check, Film, Rotate3d } from "lucide-react";
import type { MediaDTO } from "@/lib/data/types";
import { cn } from "@/lib/utils";

/** Square-ish thumbnail used across the editor. */
export function MediaThumb({
  media,
  className,
  selected,
  onSelectToggle,
  children,
  aspect = "aspect-[4/3]",
}: {
  media: MediaDTO;
  className?: string;
  selected?: boolean;
  onSelectToggle?: () => void;
  children?: React.ReactNode;
  aspect?: string;
}) {
  const src = media.src.sm ?? media.src.thumb ?? media.src.poster;
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl bg-sunken ring-1 ring-black/5",
        aspect,
        selected && "ring-[3px] ring-ink",
        className,
      )}
    >
      {src ? (
        <img
          src={src}
          alt={media.caption ?? media.filename ?? ""}
          loading="lazy"
          decoding="async"
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover"
          style={media.blur ? { backgroundImage: `url("${media.blur}")`, backgroundSize: "cover" } : undefined}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-ink-4">
          <Film className="h-6 w-6" />
        </div>
      )}
      <div className="pointer-events-none absolute left-1.5 top-1.5 flex gap-1">
        {media.kind === "pano" ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
            <Rotate3d className="h-3 w-3" />
            360°
          </span>
        ) : null}
        {media.kind === "video" ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
            <Film className="h-3 w-3" />
            Video
          </span>
        ) : null}
      </div>
      {onSelectToggle ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelectToggle();
          }}
          className={cn(
            "absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full ring-2 transition-all",
            selected
              ? "bg-ink text-white ring-white"
              : "bg-white/70 text-transparent ring-white/90 opacity-0 group-hover:opacity-100 focus:opacity-100 pointer-coarse:opacity-100",
          )}
          aria-label={selected ? "Deselect photo" : "Select photo"}
          aria-pressed={selected}
        >
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </button>
      ) : null}
      {children}
    </div>
  );
}
