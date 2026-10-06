"use client";

import { Plus } from "lucide-react";
import { useState, type ReactNode } from "react";
import { RoomIcon } from "@/components/room-icon";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/field";
import type { RoomDTO } from "@/lib/data/types";
import { ROOM_CATEGORIES } from "@/lib/rooms";
import { useEditor } from "./store";

export function AddRoomDialog({ trigger, onCreated }: { trigger: ReactNode; onCreated?: (room: RoomDTO) => void }) {
  const addRoom = useEditor((s) => s.addRoom);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function create(roomName: string, category?: string) {
    if (!roomName.trim()) return;
    setBusy(true);
    const room = await addRoom({ name: roomName.trim(), category });
    setBusy(false);
    if (room) {
      onCreated?.(room);
      setOpen(false);
      setName("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title="Add a room" description="Name it anything — “Guest suite”, “Rooftop”, “Ballroom”.">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void create(name);
          }}
        >
          <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Room name" maxLength={80} />
          <Button type="submit" loading={busy} disabled={!name.trim()}>
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </form>
        <p className="mb-2 mt-6 text-xs font-medium uppercase tracking-wide text-ink-4">Or pick one</p>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {ROOM_CATEGORIES.filter((c) => c.id !== "other").map((c) => (
            <button
              key={c.id}
              type="button"
              disabled={busy}
              onClick={() => void create(c.label, c.id)}
              className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-ink-2 ring-1 ring-line transition-colors hover:bg-sunken hover:text-ink"
            >
              <RoomIcon icon={c.icon} className="h-4 w-4 text-ink-3" />
              {c.label}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
