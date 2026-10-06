"use client";

import { Building, Building2, Hotel, House, PartyPopper, Sparkles, TreePalm, type LucideIcon } from "lucide-react";
import type { PropertyType } from "@/lib/data/types";
import { PROPERTY_TYPE_LABELS } from "@/lib/data/types";
import { cn } from "@/lib/utils";

const ICONS: Record<PropertyType, LucideIcon> = {
  house: House,
  apartment: Building,
  condo: Building2,
  vacation_rental: TreePalm,
  hotel: Hotel,
  venue: PartyPopper,
  other: Sparkles,
};

export function PropertyTypePicker({
  value,
  onChange,
  name,
}: {
  value: PropertyType;
  onChange: (value: PropertyType) => void;
  name?: string;
}) {
  return (
    <div role="radiogroup" aria-label="Property type" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {(Object.keys(PROPERTY_TYPE_LABELS) as PropertyType[]).map((type) => {
        const Icon = ICONS[type];
        const selected = value === type;
        return (
          <label
            key={type}
            className={cn(
              "flex cursor-pointer items-center gap-2.5 rounded-xl px-3.5 py-3 text-[14px] font-medium ring-1 transition-all",
              selected ? "bg-ink text-white ring-ink" : "bg-surface text-ink-2 ring-line-strong hover:ring-ink-4",
            )}
          >
            <input
              type="radio"
              name={name}
              value={type}
              checked={selected}
              onChange={() => onChange(type)}
              className="sr-only"
            />
            <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            {PROPERTY_TYPE_LABELS[type]}
          </label>
        );
      })}
    </div>
  );
}
