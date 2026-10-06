"use client";

import { ROOM_ICONS, RoomIcon } from "@/components/room-icon";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { RoomIconKey } from "@/lib/rooms";
import { cn } from "@/lib/utils";

export function IconPicker({
  value,
  onChange,
  size = "md",
}: {
  value: string;
  onChange: (icon: RoomIconKey) => void;
  size?: "sm" | "md";
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex shrink-0 items-center justify-center rounded-full bg-sunken text-ink ring-1 ring-line transition-colors hover:bg-line",
            size === "sm" ? "h-8 w-8" : "h-10 w-10",
          )}
          aria-label="Change room icon"
        >
          <RoomIcon icon={value} className={size === "sm" ? "h-4 w-4" : "h-[18px] w-[18px]"} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[296px] p-3" align="start">
        <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-ink-4">Icon</p>
        <div className="grid grid-cols-7 gap-1">
          {(Object.keys(ROOM_ICONS) as RoomIconKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-xl transition-colors",
                key === value ? "bg-ink text-white" : "text-ink-2 hover:bg-sunken",
              )}
              aria-label={key}
              aria-pressed={key === value}
            >
              <RoomIcon icon={key} className="h-[18px] w-[18px]" />
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
