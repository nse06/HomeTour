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
  const boxes = rooms.filter((r) => r.region?.type === "rect");
  return (
    <svg viewBox={`0 0 ${LAYOUT_WIDTH} ${height}`} className={cn("h-full w-full", className)} aria-hidden="true">
      <rect x="0" y="0" width={LAYOUT_WIDTH} height={height} rx="18" fill="#fbfaf7" />
      {boxes.map((room, i) => {
        if (room.region?.type !== "rect") return null;
        const { x, y, w, h } = room.region;
        const color = layoutColor(i);
        const active = room.id === activeRoomId;
        return (
          <g key={room.id}>
            <rect
              x={x * LAYOUT_WIDTH}
              y={y * height}
              width={w * LAYOUT_WIDTH}
              height={h * height}
              rx="10"
              fill={color.fill}
              stroke={active ? "#151412" : color.stroke}
              strokeWidth={active ? 3 : 2}
            />
            {showLabels ? (
              <text
                x={(x + w / 2) * LAYOUT_WIDTH}
                y={(y + h) * height - 16}
                textAnchor="middle"
                fontFamily="var(--font-inter), system-ui, sans-serif"
                fontSize="15"
                fontWeight="600"
                letterSpacing="1.5"
                fill="#6e685f"
              >
                {room.name.toUpperCase()}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
