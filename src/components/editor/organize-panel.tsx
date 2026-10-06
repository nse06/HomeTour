"use client";

import { ArrowRight, Check, Copy, LayoutGrid, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button, buttonClasses } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/misc";
import { api, ApiError } from "@/lib/api-client";
import type { MediaDTO, PropertyGraph } from "@/lib/data/types";
import { cn, pluralize } from "@/lib/utils";
import { useChrome } from "./editor-chrome";
import { useEditor } from "./store";

interface Summary {
  rooms: number;
  roomsCreated: number;
  photosAssigned: number;
  duplicates: number;
  unassigned: number;
}

type Phase = { name: "idle" } | { name: "running"; done: number; total: number; label: string } | { name: "done"; summary: Summary };

const BATCH = 6;

/**
 * "Upload → AI organizes": classifies photos in small batches (live progress, no request
 * timeouts), then asks the server to build the suggested tour structure.
 */
export function OrganizePanel({ className }: { className?: string }) {
  const { ai } = useChrome();
  const property = useEditor((s) => s.graph.property);
  const media = useEditor((s) => s.graph.media);
  const uploads = useEditor((s) => s.uploads);
  const upsertMedia = useEditor((s) => s.upsertMedia);
  const setGraph = useEditor((s) => s.setGraph);
  const [phase, setPhase] = useState<Phase>({ name: "idle" });
  const autoRan = useRef(false);

  const photos = media.filter((m) => m.kind === "photo" || m.kind === "pano");
  const unanalyzed = photos.filter((m) => !m.ai);
  const unassigned = media.filter((m) => !m.roomId);

  async function run() {
    const ids = unanalyzed.map((m) => m.id);
    setPhase({ name: "running", done: 0, total: ids.length, label: ids.length ? "Looking at your photos…" : "Building your tour…" });
    try {
      for (let i = 0; i < ids.length; i += BATCH) {
        const chunk = ids.slice(i, i + BATCH);
        const res = await api.post<{ media: MediaDTO[] }>(`/api/properties/${property.id}/ai/classify`, { mediaIds: chunk, start: i === 0 });
        upsertMedia(res.media);
        setPhase({ name: "running", done: Math.min(ids.length, i + chunk.length), total: ids.length, label: "Looking at your photos…" });
      }
      setPhase((p) => (p.name === "running" ? { ...p, label: "Building your tour…" } : p));
      const res = await api.post<{ summary: Summary; graph: PropertyGraph }>(`/api/properties/${property.id}/ai/organize`);
      setGraph(res.graph);
      setPhase({ name: "done", summary: res.summary });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Sorting stopped unexpectedly. Your photos are safe — try again.");
      setPhase({ name: "idle" });
    }
  }

  // The magic moment: as soon as a fresh batch of uploads finishes, start organizing.
  const uploadedNow = uploads.length > 0 && uploads.every((u) => u.status === "done" || u.status === "error");
  useEffect(() => {
    if (uploadedNow && !autoRan.current && unanalyzed.length > 0 && phase.name === "idle") {
      autoRan.current = true;
      void run();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadedNow, unanalyzed.length, phase.name]);

  const smart = ai.available;

  if (phase.name === "running") {
    const pct = phase.total ? (phase.done / phase.total) * 92 : 96;
    return (
      <div className={cn("overflow-hidden rounded-3xl bg-ink p-7 text-white sm:p-9", className)} aria-live="polite">
        <div className="flex items-center gap-3">
          <span className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
            <Sparkles className="h-5 w-5 animate-pulse text-[#e9a58f]" />
          </span>
          <div>
            <p className="text-lg font-semibold">{phase.label}</p>
            <p className="text-sm text-white/60">
              {phase.total ? `${phase.done} of ${pluralize(phase.total, "photo")}` : "Grouping photos into rooms"}
            </p>
          </div>
        </div>
        <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-white transition-[width] duration-500" style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  }

  if (phase.name === "done") {
    const s = phase.summary;
    return (
      <div className={cn("rounded-3xl bg-ink p-7 text-white sm:p-9", className)}>
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
            <Check className="h-5 w-5 text-[#9fd8b5]" />
          </span>
          <p className="font-display text-3xl">We&apos;ve built your tour.</p>
        </div>
        <p className="mt-4 text-white/70">
          {pluralize(s.photosAssigned, "photo")} organized into {pluralize(s.rooms, "room")}
          {s.duplicates ? ` · ${pluralize(s.duplicates, "possible duplicate")} flagged` : ""}
          {s.unassigned ? ` · ${s.unassigned} still need a room` : ""}. Take a quick look and fix anything that&apos;s off.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={`/app/p/${property.id}/rooms`} className={buttonClasses("glass", "md")}>
            Review rooms
            <ArrowRight className="h-4 w-4" />
          </Link>
          {s.duplicates ? (
            <span className="inline-flex items-center gap-1.5 text-sm text-white/60">
              <Copy className="h-4 w-4" /> Duplicates are marked, never deleted
            </span>
          ) : null}
        </div>
      </div>
    );
  }

  if (photos.length === 0) return null;
  const needsWork = unanalyzed.length > 0 || unassigned.length > 0;

  return (
    <div className={cn("flex flex-col gap-5 rounded-3xl bg-surface p-7 ring-1 ring-line sm:flex-row sm:items-center sm:p-8", className)}>
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent-soft">
        {smart ? <Sparkles className="h-6 w-6 text-accent" /> : <LayoutGrid className="h-6 w-6 text-accent" />}
      </span>
      <div className="flex-1">
        <p className="text-lg font-semibold tracking-tight text-ink">
          {needsWork ? `Sort ${pluralize(photos.length, "photo")} into rooms` : "Your photos are sorted"}
        </p>
        <p className="mt-1 text-[15px] text-ink-3">
          {smart
            ? "We'll look at every photo, figure out which room it shows, flag duplicates and pick the best cover shots. You review everything after."
            : "We'll group photos using their file names as hints. You can drag anything into the right room next."}
        </p>
      </div>
      <Button size="lg" variant={needsWork ? "primary" : "secondary"} onClick={() => void run()}>
        {smart ? <Sparkles className="h-4 w-4" /> : null}
        {needsWork ? (smart ? "Organize with AI" : "Sort photos") : "Re-organize"}
      </Button>
    </div>
  );
}
