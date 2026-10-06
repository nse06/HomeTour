/* eslint-disable @next/next/no-img-element -- pre-generated variants */
"use client";

import { MapPinOff, Sparkles, SquareDashed, Star, Trash2, Video } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { TagInput } from "@/components/ui/tag-input";
import { api, ApiError } from "@/lib/api-client";
import type { RoomDTO } from "@/lib/data/types";
import { getCategory, ROOM_CATEGORIES } from "@/lib/rooms";
import { cn, pluralize } from "@/lib/utils";
import { useChrome } from "./editor-chrome";
import { IconPicker } from "./icon-picker";
import { useEditor } from "./store";

export function RoomInspector({
  room,
  onStartDraw,
  drawing,
  onDeleted,
}: {
  room: RoomDTO;
  onStartDraw?: () => void;
  drawing?: boolean;
  onDeleted?: () => void;
}) {
  const { ai } = useChrome();
  const propertyId = useEditor((s) => s.graph.property.id);
  const media = useEditor((s) => s.graph.media);
  const floors = useEditor((s) => s.graph.floors);
  const updateRoom = useEditor((s) => s.updateRoom);
  const deleteRoom = useEditor((s) => s.deleteRoom);
  const upsertRooms = useEditor((s) => s.upsertRooms);
  const [name, setName] = useState(room.name);
  const [description, setDescription] = useState(room.description ?? "");
  const [videoUrl, setVideoUrl] = useState(room.videoUrl ?? "");
  const [writing, setWriting] = useState(false);

  useEffect(() => {
    setName(room.name);
    setDescription(room.description ?? "");
    setVideoUrl(room.videoUrl ?? "");
  }, [room.id, room.name, room.description, room.videoUrl]);

  const photos = media.filter((m) => m.roomId === room.id).sort((a, b) => a.sortOrder - b.sortOrder);
  const floor = floors.find((f) => f.id === room.floorId);
  const canDraw = floor?.planType === "image";

  async function writeWithAi() {
    setWriting(true);
    try {
      const res = await api.post<{ rooms: RoomDTO[] }>(`/api/properties/${propertyId}/ai/describe`, { roomIds: [room.id], force: true });
      if (res.rooms.length) {
        upsertRooms(res.rooms);
        toast.success("Description written — edit anything you like.");
      } else {
        toast.message("Add a photo to this room first.");
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't write a description right now.");
    } finally {
      setWriting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <IconPicker value={room.icon} onChange={(icon) => void updateRoom(room.id, { icon })} />
        <Input
          value={name}
          maxLength={80}
          aria-label="Room name"
          className="text-[17px] font-semibold"
          onChange={(e) => setName(e.target.value)}
          onBlur={() => {
            const v = name.trim();
            if (v && v !== room.name) void updateRoom(room.id, { name: v });
            else setName(room.name);
          }}
        />
      </div>

      <Field label="Room type" hint="Sets the default icon and the walkthrough order.">
        {(p) => (
          <Select
            {...p}
            value={room.category}
            onChange={(e) => {
              const category = e.target.value;
              void updateRoom(room.id, { category, icon: getCategory(category).icon });
            }}
          >
            {ROOM_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label htmlFor={`desc-${room.id}`} className="text-sm font-medium text-ink-2">
            Description
          </label>
          {room.descriptionSource === "ai" ? (
            <span className="inline-flex items-center gap-1 text-xs text-ink-4">
              <Sparkles className="h-3 w-3" /> AI draft
            </span>
          ) : null}
        </div>
        <Textarea
          id={`desc-${room.id}`}
          rows={4}
          maxLength={1200}
          value={description}
          placeholder="Bright kitchen with a large island and pendant lighting."
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => {
            if (description.trim() !== (room.description ?? "")) void updateRoom(room.id, { description: description.trim() || null });
          }}
        />
        {ai.available ? (
          <Button variant="secondary" size="sm" className="mt-2" loading={writing} disabled={photos.length === 0} onClick={() => void writeWithAi()}>
            {!writing ? <Sparkles className="h-4 w-4" /> : null}
            {room.description ? "Rewrite with AI" : "Write with AI"}
          </Button>
        ) : null}
        <p className="mt-2 text-xs text-ink-4">AI only describes what&apos;s visible in your photos and facts you&apos;ve entered.</p>
      </div>

      <div>
        <p className="mb-1.5 text-sm font-medium text-ink-2">Notable features</p>
        <TagInput value={room.features} max={8} placeholder="e.g. Kitchen island" onChange={(features) => void updateRoom(room.id, { features })} />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium text-ink-2">Photos</p>
          <Link href={`/app/p/${propertyId}/rooms`} className="text-xs font-medium text-ink-3 hover:text-ink">
            Manage
          </Link>
        </div>
        {photos.length ? (
          <div className="grid grid-cols-4 gap-1.5">
            {photos.map((m) => {
              const cover = room.coverMediaId ? room.coverMediaId === m.id : photos[0].id === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  title={cover ? "Cover photo" : "Use as cover"}
                  onClick={() => m.kind !== "video" && void updateRoom(room.id, { coverMediaId: m.id })}
                  className={cn("relative aspect-square overflow-hidden rounded-lg ring-2 transition-all", cover ? "ring-ink" : "ring-transparent hover:ring-line-strong")}
                >
                  {m.src.thumb || m.src.poster ? <img src={m.src.thumb ?? m.src.poster} alt="" className="h-full w-full object-cover" /> : null}
                  {cover ? <Star className="absolute right-1 top-1 h-3.5 w-3.5 fill-white text-white drop-shadow" /> : null}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="rounded-xl bg-sunken px-3 py-2.5 text-sm text-ink-3">No photos yet. Move some here from the Rooms step.</p>
        )}
        <p className="mt-1.5 text-xs text-ink-4">{pluralize(photos.length, "photo")} · tap one to make it the cover</p>
      </div>

      <Field label={<span className="inline-flex items-center gap-1.5"><Video className="h-3.5 w-3.5" /> Video link</span>} optional hint="YouTube, Vimeo or a direct .mp4 link.">
        {(p) => (
          <Input
            {...p}
            type="url"
            value={videoUrl}
            placeholder="https://youtube.com/watch?v=…"
            onChange={(e) => setVideoUrl(e.target.value)}
            onBlur={() => {
              const v = videoUrl.trim();
              if (v === (room.videoUrl ?? "")) return;
              if (v && !/^https:\/\//i.test(v)) {
                toast.error("Use a full https:// link.");
                return;
              }
              void updateRoom(room.id, { videoUrl: v || null });
            }}
          />
        )}
      </Field>

      <div className="flex flex-wrap gap-2 border-t border-line pt-5">
        {room.hotspot ? (
          <Button variant="ghost" size="sm" onClick={() => void updateRoom(room.id, { hotspot: null, floorId: room.region ? room.floorId : null })}>
            <MapPinOff className="h-4 w-4" />
            Remove from plan
          </Button>
        ) : null}
        {canDraw && onStartDraw ? (
          <Button variant={drawing ? "primary" : "ghost"} size="sm" onClick={onStartDraw}>
            <SquareDashed className="h-4 w-4" />
            {room.region ? "Redraw area" : "Draw area"}
          </Button>
        ) : null}
        {room.region && canDraw ? (
          <Button variant="ghost" size="sm" onClick={() => void updateRoom(room.id, { region: null })}>
            Clear area
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto text-danger hover:bg-danger-soft hover:text-danger"
          onClick={() => {
            if (confirm(`Delete “${room.name}”? Its photos stay in your library.`)) {
              void deleteRoom(room.id);
              onDeleted?.();
            }
          }}
        >
          <Trash2 className="h-4 w-4" />
          Delete room
        </Button>
      </div>
    </div>
  );
}
