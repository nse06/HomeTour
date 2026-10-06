"use client";

import { Plus } from "lucide-react";
import type { FloorDTO } from "@/lib/data/types";
import { cn } from "@/lib/utils";
import { useEditor } from "./store";

/** Floor switcher for multi-level homes. Hidden entirely for single-floor tours unless editable. */
export function FloorTabs({
  activeId,
  onChange,
  editable = true,
}: {
  activeId: string;
  onChange: (id: string) => void;
  editable?: boolean;
}) {
  const floors = useEditor((s) => s.graph.floors);
  const addFloor = useEditor((s) => s.addFloor);
  if (!editable && floors.length < 2) return null;

  return (
    <div className="scrollbar-none flex items-center gap-1.5 overflow-x-auto">
      {floors.map((f: FloorDTO) => (
        <button
          key={f.id}
          type="button"
          onClick={() => onChange(f.id)}
          className={cn(
            "shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors",
            f.id === activeId ? "bg-ink text-white" : "bg-surface text-ink-2 ring-1 ring-line hover:bg-sunken",
          )}
        >
          {f.name}
        </button>
      ))}
      {editable ? (
        <button
          type="button"
          onClick={async () => {
            const name = prompt("Name this floor", floors.length === 1 ? "Upper floor" : `Floor ${floors.length + 1}`);
            if (!name?.trim()) return;
            const floor = await addFloor(name.trim());
            if (floor) onChange(floor.id);
          }}
          className="inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-medium text-ink-3 transition-colors hover:bg-sunken hover:text-ink"
        >
          <Plus className="h-3.5 w-3.5" />
          Add floor
        </button>
      ) : null}
    </div>
  );
}
