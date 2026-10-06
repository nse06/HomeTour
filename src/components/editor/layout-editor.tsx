"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { RoomIcon } from "@/components/room-icon";
import { LAYOUT_WIDTH, layoutColor } from "@/components/tour/layout-surface";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import type { FloorDTO, RoomDTO } from "@/lib/data/types";
import { clamp, cn } from "@/lib/utils";
import { useEditor } from "./store";

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

export function LayoutEditor({ floor }: { floor: FloorDTO }) {
  const rooms = useEditor((s) => s.graph.rooms);
  const addRoom = useEditor((s) => s.addRoom);
  const updateRoom = useEditor((s) => s.updateRoom);
  const deleteRoom = useEditor((s) => s.deleteRoom);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ id: string; mode: "move" | Handle; start: { x: number; y: number }; rect: Rect } | null>(null);
  const [live, setLive] = useState<Record<string, Rect>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [name, setName] = useState("");

  const aspect = floor.aspectRatio;
  const height = LAYOUT_WIDTH / aspect;
  const boxed = rooms.filter((r) => r.floorId === floor.id && r.region?.type === "rect");
  const unboxed = rooms.filter((r) => !(r.region?.type === "rect") && (!r.floorId || r.floorId === floor.id));
  const rectOf = (r: RoomDTO): Rect => live[r.id] ?? (r.region?.type === "rect" ? r.region : { x: 0, y: 0, w: 0.2, h: 0.2 });

  const toUnits = (e: { clientX: number; clientY: number }) => {
    const box = svgRef.current!.getBoundingClientRect();
    return { x: (e.clientX - box.left) / box.width, y: (e.clientY - box.top) / box.height };
  };

  async function createBox(roomName: string) {
    const trimmed = roomName.trim();
    if (!trimmed) return;
    const rect = freeSlot(boxed.map(rectOf), aspect);
    const room = await addRoom({ name: trimmed, floorId: floor.id, region: { type: "rect", ...rect }, hotspot: center(rect) });
    if (room) setSelected(room.id);
    setName("");
  }

  async function boxExisting(room: RoomDTO) {
    const rect = freeSlot(boxed.map(rectOf), aspect);
    await updateRoom(room.id, { floorId: floor.id, region: { type: "rect", ...rect }, hotspot: center(rect) });
    setSelected(room.id);
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

      <div className="overflow-hidden rounded-3xl bg-surface p-2 ring-1 ring-line sm:p-3">
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
                  strokeWidth={isSel ? 3 : 2}
                  className="cursor-move"
                  onPointerDown={(e) => onPointerDown(e, room, "move")}
                />
                <text
                  x={px.x + px.w / 2}
                  y={px.y + px.h / 2 + 5}
                  textAnchor="middle"
                  fontSize="16"
                  fontWeight="600"
                  fill="#4f4a43"
                  className="pointer-events-none"
                >
                  {room.name}
                </text>
                {isSel
                  ? (["nw", "ne", "sw", "se"] as Handle[]).map((h) => (
                      <rect
                        key={h}
                        x={(h.includes("w") ? px.x : px.x + px.w) - 9}
                        y={(h.includes("n") ? px.y : px.y + px.h) - 9}
                        width="18"
                        height="18"
                        rx="5"
                        fill="#ffffff"
                        stroke="#151412"
                        strokeWidth="2"
                        className={h === "nw" || h === "se" ? "cursor-nwse-resize" : "cursor-nesw-resize"}
                        onPointerDown={(e) => onPointerDown(e, room, h)}
                      />
                    ))
                  : null}
              </g>
            );
          })}
          {boxed.length === 0 ? (
            <text x={LAYOUT_WIDTH / 2} y={height / 2} textAnchor="middle" fontSize="18" fill="#a7a299">
              Add your first room above — then drag and resize the boxes
            </text>
          ) : null}
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
