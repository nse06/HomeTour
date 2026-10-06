"use client";

import type { RoomDTO } from "@/lib/data/types";
import { cn } from "@/lib/utils";

export const LAYOUT_WIDTH = 1000;

const FILLS = ["#f3e9e3", "#e8eee6", "#e6ecf2", "#f2ecdf", "#ede8f1", "#e3efed", "#f3e8ec", "#eceee4"];
const STROKES = ["#dcc6b9", "#c6d3c2", "#c3cfdc", "#d9cdb2", "#cfc4d9", "#bdd5d1", "#dbc3cc", "#cfd2bd"];

export function layoutColor(index: number) {
  return { fill: FILLS[index % FILLS.length], stroke: STROKES[index % STROKES.length] };
}

/**
 * Renders rooms drawn as rectangles ("no floor plan" mode) as a clean, architectural-ish map.
 * Purely visual — hotspots are layered on top by the caller.
 */
export function LayoutSurface({
  rooms,
  aspectRatio,
  activeRoomId,
  className,
  showLabels = true,
}: {
  rooms: RoomDTO[];
  aspectRatio: number;
  activeRoomId?: string | null;
  className?: string;
  showLabels?: boolean;
}) {
  const height = LAYOUT_WIDTH / aspectRatio;
  const boxes = rooms.flatMap((r) => (r.region?.type === "rect" ? [{ room: r, rect: r.region }] : []));
  return (
    <div className={cn("relative h-full w-full", className)} aria-hidden="true">
      <svg viewBox={`0 0 ${LAYOUT_WIDTH} ${height}`} className="absolute inset-0 h-full w-full">
        <rect x="0" y="0" width={LAYOUT_WIDTH} height={height} rx="18" fill="#fbfaf7" />
        {boxes.map(({ room, rect }, i) => {
          const color = layoutColor(i);
          const active = room.id === activeRoomId;
          return (
            <rect
              key={room.id}
              x={rect.x * LAYOUT_WIDTH}
              y={rect.y * height}
              width={rect.w * LAYOUT_WIDTH}
              height={rect.h * height}
              rx="10"
              fill={color.fill}
              stroke={active ? "#151412" : color.stroke}
              strokeWidth={active ? 2 : 1.25}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </svg>
      {/* Labels are HTML (not SVG text) so they stay legible at any rendered size; a container
          query hides them in boxes too narrow to hold one. Top-left keeps them clear of the pin. */}
      {showLabels
        ? boxes.map(({ room, rect }) => (
            <div
              key={room.id}
              className="@container absolute overflow-hidden"
              style={{ left: `${rect.x * 100}%`, top: `${rect.y * 100}%`, width: `${rect.w * 100}%`, height: `${rect.h * 100}%` }}
            >
              <span className="hidden truncate px-2 pt-1.5 text-[9.5px] font-semibold uppercase tracking-[0.12em] text-[#6e685f] @min-[60px]:block @min-[150px]:text-[11px]">
                {room.name}
              </span>
            </div>
          ))
        : null}
    </div>
  );
}
