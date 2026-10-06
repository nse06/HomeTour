"use client";

import { Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { RoomIcon } from "@/components/room-icon";
import { LAYOUT_WIDTH, layoutColor } from "@/components/tour/layout-surface";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import type { FloorDTO, RoomDTO } from "@/lib/data/types";
import { clamp, cn } from "@/lib/utils";
import { useEditor, useEditorApi } from "./store";

type Rect = { x: number; y: number; w: number; h: number };
type Handle = "nw" | "ne" | "sw" | "se";

const QUICK_ROOMS = ["Living Room", "Kitchen", "Dining Room", "Primary Bedroom", "Bedroom", "Bathroom", "Office", "Patio"];
const SNAP = 0.01;
const snap = (v: number) => Math.round(v / SNAP) * SNAP;

/** Finds an empty spot for a new box on a 4×3 grid of slots. */
function freeSlot(existing: Rect[], aspect: number): Rect {
  const w = 0.22;
  const h = Math.min(0.3, 0.22 * aspect);
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      const r = { x: 0.03 + col * 0.24, y: 0.04 + row * (h + 0.04), w, h };
      if (r.y + r.h > 0.98) continue;
      const overlaps = existing.some((e) => r.x < e.x + e.w && r.x + r.w > e.x && r.y < e.y + e.h && r.y + r.h > e.y);
      if (!overlaps) return r;
    }
  }
  return { x: 0.39, y: 0.35, w, h };
}

const center = (r: Rect) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

/** Truncates a label to roughly `maxChars` characters, or hides it when there's no room. */
function fitLabel(name: string, maxChars: number): string | null {
  const n = Math.floor(maxChars);
  if (n < 3) return null;
  return name.length <= n ? name : `${name.slice(0, n - 1).trimEnd()}…`;
}

export function LayoutEditor({ floor }: { floor: FloorDTO }) {
  const rooms = useEditor((s) => s.graph.rooms);
  const addRoom = useEditor((s) => s.addRoom);
  const updateRoom = useEditor((s) => s.updateRoom);
  const deleteRoom = useEditor((s) => s.deleteRoom);
  const editorApi = useEditorApi();
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ id: string; mode: "move" | Handle; start: { x: number; y: number }; rect: Rect } | null>(null);
  // Boxes whose create request is still in flight, so rapid taps don't land on the same slot.
  const inFlight = useRef<Rect[]>([]);
  const [live, setLive] = useState<Record<string, Rect>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [name, setName] = useState("");
  // SVG units per CSS pixel: keeps labels and handles a constant on-screen size on any screen.
  const [k, setK] = useState(1);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0) setK(LAYOUT_WIDTH / entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const aspect = floor.aspectRatio;
  const height = LAYOUT_WIDTH / aspect;
  const boxed = rooms.filter((r) => r.floorId === floor.id && r.region?.type === "rect");
  const unboxed = rooms.filter((r) => !(r.region?.type === "rect") && (!r.floorId || r.floorId === floor.id));
  const rectOf = (r: RoomDTO): Rect => live[r.id] ?? (r.region?.type === "rect" ? r.region : { x: 0, y: 0, w: 0.2, h: 0.2 });

  const toUnits = (e: { clientX: number; clientY: number }) => {
    const box = svgRef.current!.getBoundingClientRect();
    return { x: (e.clientX - box.left) / box.width, y: (e.clientY - box.top) / box.height };
  };

  /** Reserves a free slot against the latest store state plus boxes still being created. */
  function reserveSlot(): Rect {
    const current = editorApi
      .getState()
      .graph.rooms.filter((r) => r.floorId === floor.id && r.region?.type === "rect")
      .map(rectOf);
    const rect = freeSlot([...current, ...inFlight.current], aspect);
    inFlight.current.push(rect);
    return rect;
  }

  const release = (rect: Rect) => {
    inFlight.current = inFlight.current.filter((r) => r !== rect);
  };

  async function createBox(roomName: string) {
    const trimmed = roomName.trim();
    if (!trimmed) return;
    setName("");
    const rect = reserveSlot();
    try {
      const room = await addRoom({ name: trimmed, floorId: floor.id, region: { type: "rect", ...rect }, hotspot: center(rect) });
      if (room) setSelected(room.id);
    } finally {
      release(rect);
    }
  }

  async function boxExisting(room: RoomDTO) {
    const rect = reserveSlot();
    try {
      await updateRoom(room.id, { floorId: floor.id, region: { type: "rect", ...rect }, hotspot: center(rect) });
      setSelected(room.id);
    } finally {
      release(rect);
    }
  }

  function onPointerDown(e: ReactPointerEvent, room: RoomDTO, mode: "move" | Handle) {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    drag.current = { id: room.id, mode, start: toUnits(e), rect: rectOf(room) };
    setSelected(room.id);
  }

  function onPointerMove(e: ReactPointerEvent) {
    const d = drag.current;
    if (!d) return;
    const p = toUnits(e);
    const dx = p.x - d.start.x;
    const dy = p.y - d.start.y;
    const r = d.rect;
    let next: Rect;
    if (d.mode === "move") {
      next = { ...r, x: clamp(snap(r.x + dx), 0, 1 - r.w), y: clamp(snap(r.y + dy), 0, 1 - r.h) };
    } else {
      const min = 0.06;
      let { x, y, w, h } = r;
      if (d.mode.includes("e")) w = clamp(snap(r.w + dx), min, 1 - r.x);
      if (d.mode.includes("s")) h = clamp(snap(r.h + dy), min, 1 - r.y);
      if (d.mode.includes("w")) {
        x = clamp(snap(r.x + dx), 0, r.x + r.w - min);
        w = r.x + r.w - x;
      }
      if (d.mode.includes("n")) {
        y = clamp(snap(r.y + dy), 0, r.y + r.h - min);
        h = r.y + r.h - y;
      }
      next = { x, y, w, h };
    }
    setLive((l) => ({ ...l, [d.id]: next }));
  }

  function onPointerUp() {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const rect = live[d.id];
    if (rect) {
      void updateRoom(d.id, { region: { type: "rect", ...rect }, hotspot: center(rect), floorId: floor.id });
      setLive((l) => {
        const { [d.id]: _, ...rest } = l;
        return rest;
      });
    }
  }

  const selectedRoom = boxed.find((r) => r.id === selected) ?? null;

  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-surface p-4 ring-1 ring-line sm:p-5">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void createBox(name);
          }}
        >
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Room name, e.g. Kitchen" maxLength={80} />
          <Button type="submit" disabled={!name.trim()}>
            <Plus className="h-4 w-4" />
            Add room
          </Button>
        </form>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {QUICK_ROOMS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => void createBox(q)}
              className="rounded-full bg-canvas px-3 py-1.5 text-[13px] text-ink-2 ring-1 ring-line transition-colors hover:bg-sunken hover:text-ink"
            >
              + {q}
            </button>
          ))}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-3xl bg-surface p-2 ring-1 ring-line sm:p-3">
        {boxed.length === 0 ? (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center px-8 text-center text-sm text-ink-4">
            Add your first room above — then drag and resize the boxes
          </p>
        ) : null}
        <svg
          ref={svgRef}
          viewBox={`0 0 ${LAYOUT_WIDTH} ${height}`}
          className="block w-full touch-none select-none"
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerDown={() => setSelected(null)}
          role="application"
          aria-label="Layout canvas. Drag rooms to move them, drag corners to resize."
        >
          <defs>
            <pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="#d9d4ca" />
            </pattern>
          </defs>
          <rect width={LAYOUT_WIDTH} height={height} rx="14" fill="#fbfaf7" />
          <rect width={LAYOUT_WIDTH} height={height} fill="url(#dots)" />
          {boxed.map((room, i) => {
            const r = rectOf(room);
            const color = layoutColor(i);
            const isSel = room.id === selected;
            const px = { x: r.x * LAYOUT_WIDTH, y: r.y * height, w: r.w * LAYOUT_WIDTH, h: r.h * height };
            const fontSize = 13 * k;
            const label = fitLabel(room.name, (px.w - 10 * k) / (fontSize * 0.56));
            const handle = 14 * k;
            const hit = 36 * k;
            return (
              <g key={room.id}>
                <rect
                  x={px.x}
                  y={px.y}
                  width={px.w}
                  height={px.h}
                  rx="10"
                  fill={color.fill}
                  stroke={isSel ? "#151412" : color.stroke}
                  strokeWidth={(isSel ? 2 : 1.25) * k}
                  className="cursor-move"
                  onPointerDown={(e) => onPointerDown(e, room, "move")}
                />
                {label && px.h > fontSize * 1.6 ? (
                  <text
                    x={px.x + px.w / 2}
                    y={px.y + px.h / 2 + fontSize * 0.35}
                    textAnchor="middle"
                    fontSize={fontSize}
                    fontWeight="600"
                    fill="#4f4a43"
                    className="pointer-events-none"
                  >
                    {label}
                  </text>
                ) : null}
                {isSel
                  ? (["nw", "ne", "sw", "se"] as Handle[]).map((h) => {
                      const cx = h.includes("w") ? px.x : px.x + px.w;
                      const cy = h.includes("n") ? px.y : px.y + px.h;
                      return (
                        <g
                          key={h}
                          className={h === "nw" || h === "se" ? "cursor-nwse-resize" : "cursor-nesw-resize"}
                          onPointerDown={(e) => onPointerDown(e, room, h)}
                        >
                          {/* Generous invisible hit area so corners are easy to grab with a finger. */}
                          <rect x={cx - hit / 2} y={cy - hit / 2} width={hit} height={hit} fill="transparent" />
                          <rect
                            x={cx - handle / 2}
                            y={cy - handle / 2}
                            width={handle}
                            height={handle}
                            rx={4 * k}
                            fill="#ffffff"
                            stroke="#151412"
                            strokeWidth={1.5 * k}
                          />
                        </g>
                      );
                    })
                  : null}
              </g>
            );
          })}
        </svg>
      </div>

      {selectedRoom ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-surface px-4 py-3 ring-1 ring-line">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sunken">
            <RoomIcon icon={selectedRoom.icon} className="h-4 w-4" />
          </span>
          <Input
            key={selectedRoom.id}
            defaultValue={selectedRoom.name}
            maxLength={80}
            className="h-9 max-w-xs"
            aria-label="Room name"
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v && v !== selectedRoom.name) void updateRoom(selectedRoom.id, { name: v });
            }}
          />
          <p className="hidden text-sm text-ink-3 sm:block">Drag to move · corners to resize</p>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto text-danger hover:bg-danger-soft hover:text-danger"
            onClick={() => {
              void updateRoom(selectedRoom.id, { region: null, hotspot: null });
              setSelected(null);
            }}
          >
            <Trash2 className="h-4 w-4" />
            Remove box
          </Button>
          {selectedRoom.description === null ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-ink-3"
              onClick={() => {
                if (confirm(`Delete “${selectedRoom.name}”? Its photos stay in your library.`)) {
                  void deleteRoom(selectedRoom.id);
                  setSelected(null);
                }
              }}
            >
              Delete room
            </Button>
          ) : null}
        </div>
      ) : null}

      {unboxed.length ? (
        <div className="rounded-2xl bg-surface p-4 ring-1 ring-line">
          <p className="text-sm font-medium text-ink-2">Rooms not on the layout yet</p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {unboxed.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => void boxExisting(r)}
                className={cn("inline-flex items-center gap-1.5 rounded-full bg-canvas px-3 py-1.5 text-[13px] text-ink-2 ring-1 ring-line hover:bg-sunken")}
              >
                <Plus className="h-3.5 w-3.5" />
                {r.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
