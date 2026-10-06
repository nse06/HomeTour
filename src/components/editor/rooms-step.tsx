/* eslint-disable @next/next/no-img-element -- pre-generated variants */
"use client";

import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove, rectSortingStrategy, SortableContext, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Copy,
  FolderInput,
  Image as ImageIcon,
  ImagePlus,
  Merge,
  MoreHorizontal,
  Plus,
  Rotate3d,
  Star,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button, buttonClasses } from "@/components/ui/button";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuSub, MenuSubContent, MenuSubTrigger, MenuTrigger } from "@/components/ui/menu";
import { EmptyState } from "@/components/ui/misc";
import type { MediaDTO, RoomDTO } from "@/lib/data/types";
import { cn, pluralize } from "@/lib/utils";
import { AddRoomDialog } from "./add-room-dialog";
import { AiChip } from "./ai-chip";
import { IconPicker } from "./icon-picker";
import { MediaThumb } from "./media-thumb";
import { useEditor } from "./store";

const UNSORTED = "unsorted";
type Containers = Record<string, string[]>;

function buildContainers(rooms: RoomDTO[], media: MediaDTO[]): Containers {
  const out: Containers = { [UNSORTED]: [] };
  for (const r of rooms) out[r.id] = [];
  const sorted = [...media].sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt - b.createdAt);
  for (const m of sorted) {
    const key = m.roomId && out[m.roomId] ? m.roomId : UNSORTED;
    out[key].push(m.id);
  }
  return out;
}

export function RoomsStep() {
  const property = useEditor((s) => s.graph.property);
  const rooms = useEditor((s) => s.graph.rooms);
  const media = useEditor((s) => s.graph.media);
  const moveMedia = useEditor((s) => s.moveMedia);
  const reorderMedia = useEditor((s) => s.reorderMedia);
  const deleteMedia = useEditor((s) => s.deleteMedia);
  const reorderRooms = useEditor((s) => s.reorderRooms);

  const ordered = useMemo(() => [...rooms].sort((a, b) => a.sortOrder - b.sortOrder), [rooms]);
  const byId = useMemo(() => new Map(media.map((m) => [m.id, m])), [media]);
  const [items, setItems] = useState<Containers>(() => buildContainers(rooms, media));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!activeId) setItems(buildContainers(rooms, media));
  }, [rooms, media, activeId]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const findContainer = (id: string): string | undefined => {
    if (id.startsWith("c:")) return id.slice(2);
    return Object.keys(items).find((key) => items[key].includes(id));
  };

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragOver({ active, over }: DragOverEvent) {
    if (!over) return;
    const from = findContainer(String(active.id));
    const to = findContainer(String(over.id));
    if (!from || !to || from === to) return;
    setItems((prev) => {
      const fromItems = prev[from].filter((id) => id !== active.id);
      const overIndex = prev[to].indexOf(String(over.id));
      const index = overIndex >= 0 ? overIndex : prev[to].length;
      const toItems = [...prev[to].slice(0, index), String(active.id), ...prev[to].slice(index)];
      return { ...prev, [from]: fromItems, [to]: toItems };
    });
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    const id = String(active.id);
    setActiveId(null);
    if (!over) return;
    const container = findContainer(id);
    const overContainer = findContainer(String(over.id));
    if (!container || !overContainer) return;
    let list = items[overContainer];
    const oldIndex = list.indexOf(id);
    const newIndex = list.indexOf(String(over.id));
    if (container === overContainer && oldIndex >= 0 && newIndex >= 0 && oldIndex !== newIndex) {
      list = arrayMove(list, oldIndex, newIndex);
      setItems((prev) => ({ ...prev, [overContainer]: list }));
    }
    const original = byId.get(id);
    const targetRoom = overContainer === UNSORTED ? null : overContainer;
    void (async () => {
      if ((original?.roomId ?? null) !== targetRoom) await moveMedia([id], targetRoom);
      if (targetRoom) await reorderMedia(list);
    })();
  }

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const moveRoom = (roomId: string, delta: number) => {
    const ids = ordered.map((r) => r.id);
    const i = ids.indexOf(roomId);
    const j = i + delta;
    if (j < 0 || j >= ids.length) return;
    void reorderRooms(arrayMove(ids, i, j));
  };

  const activeMedia = activeId ? byId.get(activeId) : null;
  const unsorted = items[UNSORTED] ?? [];
  const total = media.length;

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-4xl text-ink">Your tour</h1>
          <p className="mt-2 text-[15px] text-ink-3">
            {pluralize(ordered.length, "room")} · {pluralize(total, "photo")}. Drag photos between rooms, rename anything, and set the order
            visitors will walk through.
          </p>
        </div>
        <AddRoomDialog
          trigger={
            <Button variant="secondary">
              <Plus className="h-4 w-4" />
              Add room
            </Button>
          }
        />
      </div>

      {total === 0 ? (
        <EmptyState
          className="mt-10 rounded-3xl bg-surface ring-1 ring-line"
          icon={<ImagePlus />}
          title="No photos yet"
          action={
            <Link href={`/app/p/${property.id}/photos`} className={buttonClasses("primary", "md")}>
              Upload photos
            </Link>
          }
        >
          Add your photos first — we&apos;ll help sort them into rooms.
        </EmptyState>
      ) : (
        <DndContext
          id="rooms-board" // a stable id keeps dnd-kit's generated aria ids identical on server and client
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
          {unsorted.length ? (
            <Section
              containerId={UNSORTED}
              ids={unsorted}
              byId={byId}
              rooms={ordered}
              selected={selected}
              onToggle={toggle}
              header={
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-warning-soft text-warning">
                    <FolderInput className="h-[18px] w-[18px]" />
                  </span>
                  <div>
                    <p className="font-semibold text-ink">Needs a room</p>
                    <p className="text-sm text-ink-3">Drag these into a room below, or select them and choose “Move”.</p>
                  </div>
                </div>
              }
              tone="warning"
            />
          ) : null}

          <div className="mt-6 space-y-5">
            {ordered.map((room, index) => (
              <Section
                key={room.id}
                containerId={room.id}
                ids={items[room.id] ?? []}
                byId={byId}
                rooms={ordered}
                selected={selected}
                onToggle={toggle}
                room={room}
                header={<RoomHeader room={room} index={index} count={(items[room.id] ?? []).length} rooms={ordered} onMove={moveRoom} />}
              />
            ))}
          </div>

          <DragOverlay>
            {activeMedia ? (
              <div className="w-36 rotate-2 overflow-hidden rounded-xl shadow-float ring-2 ring-white">
                <MediaThumb media={activeMedia} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {selected.size ? (
        <div className="fixed inset-x-0 bottom-5 z-40 flex justify-center px-4">
          <div className="flex animate-slide-in-up items-center gap-2 rounded-full bg-ink py-2 pl-5 pr-2 text-white shadow-float">
            <span className="text-sm font-medium">{selected.size} selected</span>
            <Menu>
              <MenuTrigger asChild>
                <Button variant="glass" size="sm">
                  <FolderInput className="h-4 w-4" />
                  Move to…
                </Button>
              </MenuTrigger>
              <MenuContent align="center">
                {ordered.map((r) => (
                  <MenuItem
                    key={r.id}
                    onSelect={() => {
                      void moveMedia([...selected], r.id);
                      setSelected(new Set());
                    }}
                  >
                    {r.name}
                  </MenuItem>
                ))}
              </MenuContent>
            </Menu>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10 hover:text-white"
              onClick={() => {
                if (confirm(`Delete ${pluralize(selected.size, "photo")}? This can't be undone.`)) {
                  void deleteMedia([...selected]);
                  setSelected(new Set());
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" className="text-white hover:bg-white/10 hover:text-white" onClick={() => setSelected(new Set())} aria-label="Clear selection">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mt-10 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <Link href={`/app/p/${property.id}/photos`} className={buttonClasses("ghost", "md")}>
          Back to photos
        </Link>
        <Link href={`/app/p/${property.id}/tour`} className={buttonClasses("primary", "md")}>
          Place rooms on the plan
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function RoomHeader({
  room,
  index,
  count,
  rooms,
  onMove,
}: {
  room: RoomDTO;
  index: number;
  count: number;
  rooms: RoomDTO[];
  onMove: (id: string, delta: number) => void;
}) {
  const updateRoom = useEditor((s) => s.updateRoom);
  const deleteRoom = useEditor((s) => s.deleteRoom);
  const mergeRoom = useEditor((s) => s.mergeRoom);
  const [name, setName] = useState(room.name);
  useEffect(() => setName(room.name), [room.name]);

  return (
    <div className="flex items-center gap-3">
      <IconPicker value={room.icon} onChange={(icon) => void updateRoom(room.id, { icon })} />
      <div className="min-w-0 flex-1">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => {
            const v = name.trim();
            if (v && v !== room.name) void updateRoom(room.id, { name: v });
            else setName(room.name);
          }}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          maxLength={80}
          aria-label="Room name"
          className="w-full rounded-lg bg-transparent px-1 py-0.5 text-lg font-semibold tracking-tight text-ink outline-none transition-colors hover:bg-sunken focus:bg-sunken"
        />
        <p className="px-1 text-sm text-ink-3">
          Stop {index + 1} · {pluralize(count, "photo")}
        </p>
      </div>
      <Menu>
        <MenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`${room.name} options`}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </MenuTrigger>
        <MenuContent>
          <MenuItem icon={<ArrowUp />} disabled={index === 0} onSelect={() => onMove(room.id, -1)}>
            Move earlier in tour
          </MenuItem>
          <MenuItem icon={<ArrowDown />} disabled={index === rooms.length - 1} onSelect={() => onMove(room.id, 1)}>
            Move later in tour
          </MenuItem>
          {rooms.length > 1 ? (
            <MenuSub>
              <MenuSubTrigger icon={<Merge />}>Merge into…</MenuSubTrigger>
              <MenuSubContent>
                {rooms
                  .filter((r) => r.id !== room.id)
                  .map((r) => (
                    <MenuItem key={r.id} onSelect={() => void mergeRoom(room.id, r.id)}>
                      {r.name}
                    </MenuItem>
                  ))}
              </MenuSubContent>
            </MenuSub>
          ) : null}
          <MenuSeparator />
          <MenuItem
            icon={<Trash2 />}
            destructive
            onSelect={() => {
              if (confirm(`Delete “${room.name}”? Its photos will move to “Needs a room”.`)) void deleteRoom(room.id);
            }}
          >
            Delete room
          </MenuItem>
        </MenuContent>
      </Menu>
    </div>
  );
}

function Section({
  containerId,
  ids,
  byId,
  rooms,
  selected,
  onToggle,
  header,
  room,
  tone,
}: {
  containerId: string;
  ids: string[];
  byId: Map<string, MediaDTO>;
  rooms: RoomDTO[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  header: React.ReactNode;
  room?: RoomDTO;
  tone?: "warning";
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `c:${containerId}` });
  return (
    <section
      ref={setNodeRef}
      className={cn(
        "rounded-3xl p-4 ring-1 transition-colors sm:p-5",
        tone === "warning" ? "mt-8 bg-warning-soft/40 ring-warning/20" : "bg-surface ring-line",
        isOver && "ring-2 ring-ink",
      )}
    >
      {header}
      <SortableContext items={ids} strategy={rectSortingStrategy}>
        <div className="mt-4 grid min-h-24 grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 lg:grid-cols-6">
          {ids.map((id) => {
            const m = byId.get(id);
            return m ? (
              <SortablePhoto key={id} media={m} room={room} rooms={rooms} selected={selected.has(id)} onToggle={() => onToggle(id)} />
            ) : null;
          })}
          {ids.length === 0 ? (
            <div className="col-span-full flex min-h-24 items-center justify-center rounded-xl border-2 border-dashed border-line text-sm text-ink-4">
              Drop photos here
            </div>
          ) : null}
        </div>
      </SortableContext>
    </section>
  );
}

function SortablePhoto({
  media,
  room,
  rooms,
  selected,
  onToggle,
}: {
  media: MediaDTO;
  room?: RoomDTO;
  rooms: RoomDTO[];
  selected: boolean;
  onToggle: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: media.id });
  const moveMedia = useEditor((s) => s.moveMedia);
  const updateRoom = useEditor((s) => s.updateRoom);
  const updateMedia = useEditor((s) => s.updateMedia);
  const deleteMedia = useEditor((s) => s.deleteMedia);
  const updateProperty = useEditor((s) => s.updateProperty);
  const isTourCover = useEditor((s) => s.graph.property.coverMediaId === media.id);
  const isCover = room && (room.coverMediaId === media.id);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("touch-manipulation", isDragging && "opacity-30")}
      {...attributes}
      {...listeners}
    >
      <MediaThumb media={media} selected={selected} onSelectToggle={onToggle}>
        <div className="absolute inset-x-1.5 bottom-1.5 flex items-end justify-between gap-1">
          <div className="flex min-w-0 flex-col items-start gap-1">
            {isTourCover ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-ink/85 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                <ImageIcon className="h-3 w-3" /> Tour cover
              </span>
            ) : isCover ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-ink">
                <Star className="h-3 w-3 fill-current" /> Cover
              </span>
            ) : null}
            {media.ai?.duplicateOf ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-warning px-1.5 py-0.5 text-[10px] font-semibold text-white">
                <Copy className="h-3 w-3" /> Duplicate?
              </span>
            ) : null}
            {media.roomAssignedBy !== "user" ? <AiChip media={media} rooms={rooms} onMove={(rid) => void moveMedia([media.id], rid)} /> : null}
          </div>
          <div onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
            <Menu>
              <MenuTrigger asChild>
                <button
                  type="button"
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-ink opacity-0 shadow-sm transition-opacity group-hover:opacity-100 focus:opacity-100 data-[state=open]:opacity-100 pointer-coarse:opacity-100"
                  aria-label="Photo options"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </MenuTrigger>
              <MenuContent>
                <MenuSub>
                  <MenuSubTrigger icon={<FolderInput />}>Move to…</MenuSubTrigger>
                  <MenuSubContent>
                    {rooms
                      .filter((r) => r.id !== media.roomId)
                      .map((r) => (
                        <MenuItem key={r.id} onSelect={() => void moveMedia([media.id], r.id)}>
                          {r.name}
                        </MenuItem>
                      ))}
                  </MenuSubContent>
                </MenuSub>
                {room && media.kind !== "video" ? (
                  <MenuItem icon={<Star />} onSelect={() => void updateRoom(room.id, { coverMediaId: media.id })}>
                    Use as room cover
                  </MenuItem>
                ) : null}
                {media.kind === "photo" ? (
                  isTourCover ? (
                    <MenuItem icon={<ImageIcon />} onSelect={() => void updateProperty({ coverMediaId: null })}>
                      Choose tour cover automatically
                    </MenuItem>
                  ) : (
                    <MenuItem icon={<ImageIcon />} onSelect={() => void updateProperty({ coverMediaId: media.id })}>
                      Use as tour cover
                    </MenuItem>
                  )
                ) : null}
                {media.kind === "photo" || media.kind === "pano" ? (
                  <MenuItem icon={<Rotate3d />} onSelect={() => void updateMedia(media.id, { kind: media.kind === "pano" ? "photo" : "pano" })}>
                    {media.kind === "pano" ? "Treat as a normal photo" : "This is a 360° photo"}
                  </MenuItem>
                ) : null}
                <MenuSeparator />
                <MenuItem icon={<Trash2 />} destructive onSelect={() => void deleteMedia([media.id])}>
                  Delete photo
                </MenuItem>
              </MenuContent>
            </Menu>
          </div>
        </div>
      </MediaThumb>
    </div>
  );
}
