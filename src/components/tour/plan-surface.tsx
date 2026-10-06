/* eslint-disable @next/next/no-img-element -- pre-generated variants */
"use client";

import { forwardRef, type ReactNode } from "react";
import type { FloorDTO, RoomDTO } from "@/lib/data/types";
import { cn } from "@/lib/utils";
import { LayoutSurface } from "./layout-surface";

export function surfaceAspect(floor: FloorDTO): number {
  if (floor.planType === "image" && floor.plan?.width && floor.plan?.height) return floor.plan.width / floor.plan.height;
  return floor.aspectRatio || 1.5;
}

/**
 * A floor's navigation surface (uploaded plan image or sketched layout) at its true aspect
 * ratio, so normalized hotspot coordinates line up exactly. Children render on top.
 */
export const PlanSurface = forwardRef<
  HTMLDivElement,
  {
    floor: FloorDTO;
    rooms: RoomDTO[];
    activeRoomId?: string | null;
    hoverRoomId?: string | null;
    children?: ReactNode;
    className?: string;
    priority?: boolean;
    showRegions?: boolean;
    sizes?: string;
  } & React.HTMLAttributes<HTMLDivElement>
>(function PlanSurface(
  { floor, rooms, activeRoomId, hoverRoomId, children, className, priority, showRegions = true, sizes = "(min-width: 1024px) 60vw, 100vw", style, ...rest },
  ref,
) {
  const aspect = surfaceAspect(floor);
  const onFloor = rooms.filter((r) => r.floorId === floor.id);
  const isImage = floor.planType === "image" && floor.plan;
  const highlight = onFloor.filter((r) => r.region && (r.id === activeRoomId || r.id === hoverRoomId));

  return (
    <div ref={ref} className={cn("relative w-full select-none", className)} style={{ aspectRatio: aspect, ...style }} {...rest}>
      {isImage ? (
        <img
          src={floor.plan!.src.lg ?? floor.plan!.src.md}
          srcSet={floor.plan!.srcSet || undefined}
          sizes={sizes}
          alt={`${floor.name} floor plan`}
          draggable={false}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          className="absolute inset-0 h-full w-full rounded-[inherit] object-contain"
        />
      ) : (
        <div className="absolute inset-0">
          <LayoutSurface rooms={onFloor} aspectRatio={aspect} activeRoomId={activeRoomId} />
        </div>
      )}
      {isImage && showRegions && highlight.length ? (
        <svg viewBox="0 0 1 1" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
          {highlight.map((r) =>
            r.region?.type === "rect" ? (
              <rect
                key={r.id}
                x={r.region.x}
                y={r.region.y}
                width={r.region.w}
                height={r.region.h}
                fill="rgb(200 85 61 / 0.12)"
                stroke="rgb(200 85 61 / 0.7)"
                strokeWidth="0.004"
                vectorEffect="non-scaling-stroke"
              />
            ) : r.region?.type === "polygon" ? (
              <polygon
                key={r.id}
                points={r.region.points.map(([x, y]) => `${x},${y}`).join(" ")}
                fill="rgb(200 85 61 / 0.12)"
                stroke="rgb(200 85 61 / 0.7)"
                vectorEffect="non-scaling-stroke"
              />
            ) : null,
          )}
        </svg>
      ) : null}
      {children}
    </div>
  );
});
