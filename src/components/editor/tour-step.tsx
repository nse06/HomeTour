/* eslint-disable @next/next/no-img-element -- pre-generated variants */
"use client";

import { ArrowRight, Crosshair, LayoutGrid, MapPin, PenLine, Plus, Sparkles, Upload } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { toast } from "sonner";
import { RoomIcon } from "@/components/room-icon";
import { HotspotPin } from "@/components/tour/hotspot-pin";
import { PlanSurface } from "@/components/tour/plan-surface";
import { Button, buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { api, ApiError } from "@/lib/api-client";
import type { RoomDTO } from "@/lib/data/types";
import { clamp, cn, pluralize } from "@/lib/utils";
import { AddRoomDialog } from "./add-room-dialog";
import { useChrome } from "./editor-chrome";
import { FloorTabs } from "./floor-tabs";
import { RoomInspector } from "./room-inspector";
import { useEditor } from "./store";

type Point = { x: number; y: number };
type Rect = { x: number; y: number; w: number; h: number };

export function TourStep() {
  const { ai } = useChrome();
  const property = useEditor((s) => s.graph.property);
  const floors = useEditor((s) => s.graph.floors);
  const rooms = useEditor((s) => s.graph.rooms);
  const media = useEditor((s) => s.graph.media);
  const updateRoom = useEditor((s) => s.updateRoom);
  const upsertRooms = useEditor((s) => s.upsertRooms);

  const ordered = useMemo(() => [...rooms].sort((a, b) => a.sortOrder - b.sortOrder), [rooms]);
  const [floorId, setFloorId] = useState(floors[0]?.id ?? "");
  const [selectedId, setSelectedId] = useState<string | null>(ordered.find((r) => !r.hotspot)?.id ?? ordered[0]?.id ?? null);
  const [mode, setMode] = useState<"idle" | "place" | "draw">("idle");
  const [live, setLive] = useState<Record<string, Point>>({});
  const [draft, setDraft] = useState<Rect | null>(null);
  const [writingAll, setWritingAll] = useState(false);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; start: Point; origin: Point; moved: boolean } | null>(null);
  const drawStart = useRef<Point | null>(null);
  const nudgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const floor = floors.find((f) => f.id === floorId) ?? floors[0];
  const selected = ordered.find((r) => r.id === selectedId) ?? null;
  const photoCount = (id: string) => media.filter((m) => m.roomId === id).length;
  const thumbFor = (room: RoomDTO) => {
    const list = media.filter((m) => m.roomId === room.id);
    return (room.coverMediaId && list.find((m) => m.id === room.coverMediaId)) || list[0];
  };

  useEffect(() => {
    if (!selected || mode !== "idle") return;
    // Selecting an unplaced room on a usable plan arms placement.
    if (!selected.hotspot && floor && floor.planType !== "none") setMode("place");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  if (!floor) return null;
  const hasPlan = floor.planType !== "none";
  const pinned = ordered.filter((r) => r.floorId === floor.id && r.hotspot);
  const unplaced = ordered.filter((r) => !r.hotspot);
  const needDescriptions = ordered.filter((r) => !r.description && photoCount(r.id) > 0);

  const toNorm = (e: { clientX: number; clientY: number }): Point => {
    const box = surfaceRef.current!.getBoundingClientRect();
    return { x: clamp((e.clientX - box.left) / box.width, 0, 1), y: clamp((e.clientY - box.top) / box.height, 0, 1) };
  };

  function onPinDown(e: ReactPointerEvent, room: RoomDTO) {
    e.stopPropagation();
    e.preventDefault();
    surfaceRef.current?.setPointerCapture(e.pointerId);
    drag.current = { id: room.id, start: toNorm(e), origin: room.hotspot!, moved: false };
    setSelectedId(room.id);
    setMode("idle");
  }

  function onSurfaceDown(e: ReactPointerEvent) {
    if (!selected) return;
    const p = toNorm(e);
    if (mode === "draw") {
      surfaceRef.current?.setPointerCapture(e.pointerId);
      drawStart.current = p;
      setDraft({ x: p.x, y: p.y, w: 0, h: 0 });
      return;
    }
    if (mode === "place" || !selected.hotspot) {
      void updateRoom(selected.id, { hotspot: p, floorId: floor.id });
      setMode("idle");
      const next = unplaced.find((r) => r.id !== selected.id);
      if (next) toast.success(`${selected.name} placed. Next: ${next.name}`, { duration: 2200 });
    }
  }

  function onSurfaceMove(e: ReactPointerEvent) {
    const d = drag.current;
    if (d) {
      const p = toNorm(e);
      const dx = p.x - d.start.x;
      const dy = p.y - d.start.y;
      if (Math.abs(dx) + Math.abs(dy) > 0.004) d.moved = true;
      if (d.moved) setLive((l) => ({ ...l, [d.id]: { x: clamp(d.origin.x + dx, 0, 1), y: clamp(d.origin.y + dy, 0, 1) } }));
      return;
    }
    if (drawStart.current) {
      const p = toNorm(e);
      const s = drawStart.current;
      setDraft({ x: Math.min(s.x, p.x), y: Math.min(s.y, p.y), w: Math.abs(p.x - s.x), h: Math.abs(p.y - s.y) });
    }
  }

  function onSurfaceUp() {
    const d = drag.current;
    if (d) {
      drag.current = null;
      const pos = live[d.id];
      if (d.moved && pos) void updateRoom(d.id, { hotspot: pos, floorId: floor.id });
      setLive((l) => {
        const { [d.id]: _, ...rest } = l;
        return rest;
      });
      return;
    }
    if (drawStart.current && selected) {
      drawStart.current = null;
      if (draft && draft.w > 0.015 && draft.h > 0.015) {
        void updateRoom(selected.id, {
          region: { type: "rect", ...draft },
          floorId: floor.id,
          ...(selected.hotspot ? {} : { hotspot: { x: draft.x + draft.w / 2, y: draft.y + draft.h / 2 } }),
        });
      }
      setDraft(null);
      setMode("idle");
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    if (!selected?.hotspot || selected.floorId !== floor.id) return;
    const step = e.shiftKey ? 0.02 : 0.005;
    const delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!delta) return;
    e.preventDefault();
    const base = live[selected.id] ?? selected.hotspot;
    const next = { x: clamp(base.x + delta[0], 0, 1), y: clamp(base.y + delta[1], 0, 1) };
    setLive((l) => ({ ...l, [selected.id]: next }));
    if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
    nudgeTimer.current = setTimeout(() => {
      void updateRoom(selected.id, { hotspot: next });
      setLive((l) => {
        const { [selected.id]: _, ...rest } = l;
        return rest;
      });
    }, 500);
  }

  async function writeAll() {
    setWritingAll(true);
    try {
      const res = await api.post<{ rooms: RoomDTO[] }>(`/api/properties/${property.id}/ai/describe`, {});
      upsertRooms(res.rooms);
      toast.success(`Wrote ${pluralize(res.rooms.length, "description")}. Review and edit them on each room.`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't write descriptions right now.");
    } finally {
      setWritingAll(false);
    }
  }

  const hint =
    mode === "draw"
      ? `Drag on the plan to outline ${selected?.name}.`
      : selected && (!selected.hotspot || mode === "place")
        ? `Tap the plan where ${selected.name} is.`
        : selected
          ? `Drag the ${selected.name} marker to adjust. Arrow keys nudge it.`
          : "Select a room to place it.";

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:py-8">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-4xl text-ink">Place your rooms</h1>
          <p className="mt-1 text-[15px] text-ink-3">
            {pinned.length} of {pluralize(ordered.length, "room")} on the plan
            {unplaced.length ? ` · ${unplaced.length} to go` : " · all set"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {ai.available && needDescriptions.length ? (
            <Button variant="secondary" loading={writingAll} onClick={() => void writeAll()}>
              {!writingAll ? <Sparkles className="h-4 w-4" /> : null}
              Write {pluralize(needDescriptions.length, "description")}
            </Button>
          ) : null}
          <Link href={`/app/p/${property.id}/publish`} className={buttonClasses("primary", "md")}>
            Continue to publish
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {ordered.length === 0 ? (
        <EmptyState
          className="rounded-3xl bg-surface ring-1 ring-line"
          icon={<MapPin />}
          title="No rooms yet"
          action={
            <AddRoomDialog
              trigger={
                <Button>
                  <Plus className="h-4 w-4" />
                  Add a room
                </Button>
              }
              onCreated={(r) => setSelectedId(r.id)}
            />
          }
        >
          Rooms are created when you sort your photos — or add one by hand.
        </EmptyState>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)_340px] lg:gap-5">
          {/* LEFT: rooms */}
          <aside className="order-1 lg:order-none">
            <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:rounded-3xl lg:bg-surface lg:p-2 lg:ring-1 lg:ring-line">
              {ordered.map((room, i) => {
                const thumb = thumbFor(room);
                const active = room.id === selectedId;
                return (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(room.id);
                      setMode("idle");
                      if (room.floorId && room.floorId !== floor.id) setFloorId(room.floorId);
                    }}
                    className={cn(
                      "flex shrink-0 items-center gap-3 rounded-2xl p-2 pr-3 text-left transition-colors lg:w-full",
                      active ? "bg-ink text-white" : "bg-surface ring-1 ring-line hover:bg-sunken lg:bg-transparent lg:ring-0",
                    )}
                  >
                    <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-sunken">
                      {thumb?.src.thumb ? <img src={thumb.src.thumb} alt="" className="h-full w-full object-cover" /> : (
                        <span className="flex h-full w-full items-center justify-center"><RoomIcon icon={room.icon} className="h-4 w-4 text-ink-3" /></span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{room.name}</span>
                      <span className={cn("block text-xs", active ? "text-white/60" : "text-ink-4")}>
                        {i + 1}. {pluralize(photoCount(room.id), "photo")}
                      </span>
                    </span>
                    {room.hotspot ? (
                      <MapPin className={cn("h-4 w-4 shrink-0", active ? "text-white/70" : "text-success")} />
                    ) : (
                      <span className={cn("h-2 w-2 shrink-0 rounded-full", active ? "bg-white/50" : "bg-warning")} title="Not on plan" />
                    )}
                  </button>
                );
              })}
              <AddRoomDialog
                onCreated={(r) => setSelectedId(r.id)}
                trigger={
                  <button
                    type="button"
                    className="flex shrink-0 items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-medium text-ink-3 ring-1 ring-dashed ring-line-strong transition-colors hover:bg-sunken hover:text-ink lg:w-full lg:ring-0"
                  >
                    <Plus className="h-4 w-4" />
                    Add room
                  </button>
                }
              />
            </div>
          </aside>

          {/* CENTER: plan */}
          <section className="order-2 min-w-0 lg:order-none">
            <div className="rounded-3xl bg-surface p-3 ring-1 ring-line sm:p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <FloorTabs activeId={floor.id} onChange={setFloorId} editable={false} />
                <p className="flex items-center gap-1.5 text-[13px] text-ink-3">
                  <Crosshair className="h-3.5 w-3.5" />
                  {hasPlan ? hint : "No floor plan on this floor"}
                </p>
              </div>
              {hasPlan ? (
                <div
                  className={cn("rounded-2xl bg-[#fbfaf7] p-2 outline-none focus-visible:ring-2 focus-visible:ring-ink sm:p-4")}
                  tabIndex={0}
                  onKeyDown={onKeyDown}
                  aria-label="Floor plan editor"
                >
                  <PlanSurface
                    ref={surfaceRef}
                    floor={floor}
                    rooms={ordered}
                    activeRoomId={selectedId}
                    priority
                    className={cn("touch-none", mode !== "idle" || (selected && !selected.hotspot) ? "cursor-crosshair" : "cursor-default")}
                    onPointerDown={onSurfaceDown}
                    onPointerMove={onSurfaceMove}
                    onPointerUp={onSurfaceUp}
                    onPointerCancel={onSurfaceUp}
                  >
                    {pinned.map((room) => {
                      const pos = live[room.id] ?? room.hotspot!;
                      return (
                        <HotspotPin
                          key={room.id}
                          x={pos.x}
                          y={pos.y}
                          icon={room.icon}
                          label={room.name}
                          active={room.id === selectedId}
                          labelMode="always"
                          pulse={false}
                          className="cursor-grab active:cursor-grabbing"
                          onPointerDown={(e) => onPinDown(e, room)}
                        />
                      );
                    })}
                    {draft ? (
                      <div
                        className="pointer-events-none absolute rounded-md border-2 border-accent bg-accent/10"
                        style={{ left: `${draft.x * 100}%`, top: `${draft.y * 100}%`, width: `${draft.w * 100}%`, height: `${draft.h * 100}%` }}
                      />
                    ) : null}
                  </PlanSurface>
                </div>
              ) : (
                <div className="flex flex-col items-center rounded-2xl bg-[#fbfaf7] px-6 py-14 text-center">
                  <p className="font-semibold text-ink">This floor doesn&apos;t have a map yet</p>
                  <p className="mt-1 max-w-sm text-sm text-ink-3">
                    That&apos;s okay — visitors can still browse rooms from a list. Add a plan or sketch a layout to make rooms clickable.
                  </p>
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    <Link href={`/app/p/${property.id}/floor-plan`} className={buttonClasses("primary", "sm")}>
                      <Upload className="h-4 w-4" />
                      Upload a plan
                    </Link>
                    <Link href={`/app/p/${property.id}/floor-plan`} className={buttonClasses("secondary", "sm")}>
                      <PenLine className="h-4 w-4" />
                      Sketch a layout
                    </Link>
                  </div>
                </div>
              )}
              {hasPlan && floor.planType === "layout" ? (
                <div className="mt-3 flex justify-end">
                  <Link href={`/app/p/${property.id}/floor-plan`} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-3 hover:text-ink">
                    <LayoutGrid className="h-3.5 w-3.5" />
                    Edit layout boxes
                  </Link>
                </div>
              ) : null}
            </div>
            {hasPlan && unplaced.length ? (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-[13px] text-ink-3">Not placed yet:</span>
                {unplaced.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(r.id);
                      setMode("place");
                    }}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium ring-1 transition-colors",
                      r.id === selectedId ? "bg-ink text-white ring-ink" : "bg-surface text-ink-2 ring-line hover:bg-sunken",
                    )}
                  >
                    <RoomIcon icon={r.icon} className="h-3.5 w-3.5" />
                    {r.name}
                  </button>
                ))}
              </div>
            ) : null}
          </section>

          {/* RIGHT: inspector */}
          <aside className="order-3 lg:order-none">
            <div className="rounded-3xl bg-surface p-5 ring-1 ring-line lg:sticky lg:top-32">
              {selected ? (
                <RoomInspector
                  key={selected.id}
                  room={selected}
                  drawing={mode === "draw"}
                  onStartDraw={() => setMode(mode === "draw" ? "idle" : "draw")}
                  onDeleted={() => setSelectedId(ordered.find((r) => r.id !== selected.id)?.id ?? null)}
                />
              ) : (
                <p className="text-sm text-ink-3">Select a room to edit its details.</p>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
