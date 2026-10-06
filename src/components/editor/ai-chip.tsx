/* eslint-disable @next/next/no-img-element -- pre-generated variants */
"use client";

import { Copy, Sparkles } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { MediaDTO, RoomDTO } from "@/lib/data/types";
import { getCategory } from "@/lib/rooms";
import { cn } from "@/lib/utils";

/**
 * The AI's suggestion for a photo, always shown as a suggestion: e.g. "Kitchen · 94%".
 * Opens the full analysis (likely room, confidence, detected features).
 */
export function AiChip({
  media,
  rooms,
  onMove,
  className,
}: {
  media: MediaDTO;
  rooms: RoomDTO[];
  onMove: (roomId: string) => void;
  className?: string;
}) {
  const ai = media.ai;
  if (!ai?.category) return null;
  const pct = ai.confidence !== null ? Math.round(ai.confidence * 100) : null;
  const label = getCategory(ai.category).label;
  const fromFilename = ai.source === "filename";
  const matching = rooms.filter((r) => r.category === ai.category && r.id !== media.roomId);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className={cn(
            "inline-flex max-w-full items-center gap-1 truncate rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur transition-colors hover:bg-black/70",
            className,
          )}
          aria-label={`AI suggestion: ${label}${pct !== null ? `, ${pct}% confidence` : ""}`}
        >
          {fromFilename ? null : <Sparkles className="h-3 w-3 shrink-0" />}
          <span className="truncate">{label}</span>
          {pct !== null && !fromFilename ? <span className="text-white/70">{pct}%</span> : null}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="relative aspect-[16/10] overflow-hidden rounded-t-2xl bg-sunken">
          {media.src.sm ? <img src={media.src.sm} alt="" className="h-full w-full object-cover" /> : null}
        </div>
        <div className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-4">Likely</p>
              <p className="text-lg font-semibold text-ink">{label}</p>
            </div>
            {pct !== null && !fromFilename ? (
              <div className="text-right">
                <p className="text-xs font-medium uppercase tracking-wide text-ink-4">Confidence</p>
                <p className="text-lg font-semibold tabular-nums text-ink">{pct}%</p>
              </div>
            ) : null}
          </div>
          {ai.features.length ? (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-4">Detected</p>
              <ul className="mt-1 space-y-0.5 text-sm text-ink-2">
                {ai.features.map((f) => (
                  <li key={f}>• {f}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {ai.duplicateOf ? (
            <p className="flex items-center gap-1.5 rounded-xl bg-warning-soft px-3 py-2 text-xs text-warning">
              <Copy className="h-3.5 w-3.5" /> Looks almost identical to another photo.
            </p>
          ) : null}
          <p className="text-xs text-ink-4">
            {fromFilename
              ? "Guessed from the file name — please double-check."
              : ai.source === "mock"
                ? "Demo AI suggestion (mock provider)."
                : "AI suggestion — you have the final say."}
          </p>
          {matching.length ? (
            <div className="flex flex-wrap gap-1.5 border-t border-line pt-3">
              {matching.slice(0, 3).map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => onMove(r.id)}
                  className="rounded-full bg-sunken px-2.5 py-1 text-xs font-medium text-ink-2 hover:bg-line"
                >
                  Move to {r.name}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
