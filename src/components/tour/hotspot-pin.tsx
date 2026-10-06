"use client";

import { RoomIcon } from "@/components/room-icon";
import { cn } from "@/lib/utils";

/**
 * A clickable room marker on a floor plan. Positioned by normalized (0..1) coordinates
 * relative to its parent, which must be `position: relative` with the plan's aspect ratio.
 */
export function HotspotPin({
  x,
  y,
  icon,
  label,
  active = false,
  dimmed = false,
  labelMode = "auto",
  pulse = true,
  onClick,
  onPointerDown,
  className,
  accent,
  number,
}: {
  x: number;
  y: number;
  icon: string;
  label: string;
  active?: boolean;
  dimmed?: boolean;
  /** auto: label on ≥sm screens or when active; always; never. */
  labelMode?: "auto" | "always" | "never";
  pulse?: boolean;
  onClick?: () => void;
  onPointerDown?: (e: React.PointerEvent<HTMLButtonElement>) => void;
  className?: string;
  accent?: string;
  number?: number;
}) {
  const showLabel = labelMode === "always" || (labelMode === "auto" && active);
  return (
    <button
      type="button"
      onClick={onClick}
      onPointerDown={onPointerDown}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "group absolute z-10 -translate-x-1/2 -translate-y-1/2 touch-none outline-none",
        active ? "z-20" : "",
        dimmed && !active ? "opacity-55" : "",
        className,
      )}
      style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
    >
      {pulse ? (
        <span
          className="absolute inset-0 rounded-full animate-pulse-ring"
          style={{ backgroundColor: accent ?? "var(--color-accent)", opacity: active ? 0.5 : 0.35 }}
          aria-hidden="true"
        />
      ) : null}
      <span
        className={cn(
          "relative flex h-9 w-9 items-center justify-center rounded-full shadow-[0_2px_8px_rgb(0_0_0/0.18)] ring-1 transition-all duration-300 ease-out sm:h-10 sm:w-10",
          "group-hover:scale-110 group-focus-visible:ring-2 group-focus-visible:ring-ink",
          active ? "scale-110 bg-ink text-white ring-white/30" : "bg-white text-ink ring-black/10",
        )}
      >
        {number !== undefined ? (
          <span className="text-[13px] font-semibold tabular-nums">{number}</span>
        ) : (
          <RoomIcon icon={icon} className="h-[17px] w-[17px]" />
        )}
      </span>
      <span
        className={cn(
          "pointer-events-none absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-medium shadow-[0_2px_6px_rgb(0_0_0/0.12)] transition-all duration-200",
          active ? "bg-ink text-white" : "bg-white/95 text-ink",
          showLabel
            ? "opacity-100"
            : labelMode === "never"
              ? "opacity-0 group-hover:opacity-100"
              : "opacity-0 group-hover:opacity-100 sm:opacity-100",
        )}
      >
        {label}
      </span>
    </button>
  );
}
