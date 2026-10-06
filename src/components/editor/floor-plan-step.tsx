/* eslint-disable @next/next/no-img-element -- pre-generated variants */
"use client";

import { ArrowRight, FileImage, LayoutGrid, MoreHorizontal, PenLine, RefreshCcw, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button, buttonClasses } from "@/components/ui/button";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { ProgressBar } from "@/components/ui/misc";
import { pdfToPng } from "@/lib/pdf-to-image";
import { Dropzone } from "./dropzone";
import { FloorTabs } from "./floor-tabs";
import { LayoutEditor } from "./layout-editor";
import { useEditor } from "./store";

const ACCEPT = "image/png,image/jpeg,image/webp,application/pdf,.pdf";

export function FloorPlanStep() {
  const property = useEditor((s) => s.graph.property);
  const floors = useEditor((s) => s.graph.floors);
  const updateFloor = useEditor((s) => s.updateFloor);
  const deleteFloor = useEditor((s) => s.deleteFloor);
  const uploadFloorPlan = useEditor((s) => s.uploadFloorPlan);
  const [floorId, setFloorId] = useState(floors[0]?.id ?? "");
  const [busy, setBusy] = useState<{ label: string; progress: number } | null>(null);
  const replaceInput = useRef<HTMLInputElement>(null);

  const floor = floors.find((f) => f.id === floorId) ?? floors[0];
  if (!floor) return null;
  const next = `/app/p/${property.id}/photos`;

  async function handleFile(file: File) {
    try {
      let blob: Blob = file;
      let filename = file.name;
      if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
        setBusy({ label: "Converting PDF…", progress: 0.1 });
        blob = await pdfToPng(file);
        filename = file.name.replace(/\.pdf$/i, ".png");
      } else if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) {
        toast.error("Use a PNG, JPG, WebP or PDF floor plan.");
        return;
      }
      setBusy({ label: "Uploading floor plan…", progress: 0 });
      const ok = await uploadFloorPlan(floor.id, blob, filename, (p) => setBusy({ label: p >= 1 ? "Optimizing…" : "Uploading floor plan…", progress: p }));
      if (ok) toast.success("Floor plan added");
    } catch (err) {
      console.error(err);
      toast.error("We couldn't read that PDF. Try exporting it as an image.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:py-14">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-4xl text-ink">Floor plan</h1>
          <p className="mt-2 max-w-xl text-[15px] text-ink-3">
            Visitors navigate your tour by tapping rooms on this map. Upload one, or sketch simple room boxes — it doesn&apos;t need to be
            architecturally precise.
          </p>
        </div>
        <FloorTabs activeId={floor.id} onChange={setFloorId} />
      </div>

      {busy ? (
        <div className="mt-8 rounded-3xl bg-surface p-10 text-center ring-1 ring-line">
          <p className="font-medium text-ink">{busy.label}</p>
          <ProgressBar value={busy.progress * 100} className="mx-auto mt-4 max-w-sm" />
        </div>
      ) : floor.planType === "none" ? (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Dropzone accept={ACCEPT} multiple={false} onFiles={(f) => void handleFile(f[0])} label="Upload a floor plan" className="p-8 sm:p-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sunken">
              <FileImage className="h-6 w-6 text-ink-2" strokeWidth={1.75} />
            </div>
            <h2 className="mt-6 text-xl font-semibold tracking-tight text-ink">Upload a floor plan</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-3">Drop a PNG, JPG, WebP or PDF here, or click to browse. A clear photo of a printed plan works too.</p>
            <span className={buttonClasses("primary", "md", "mt-6")}>
              <Upload className="h-4 w-4" />
              Choose file
            </span>
          </Dropzone>
          <button
            type="button"
            onClick={() => void updateFloor(floor.id, { planType: "layout", aspectRatio: 1.5 })}
            className="rounded-3xl border-2 border-dashed border-line-strong bg-surface p-8 text-left transition-colors hover:border-ink-4 hover:bg-sunken/40 sm:p-10"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sunken">
              <LayoutGrid className="h-6 w-6 text-ink-2" strokeWidth={1.75} />
            </div>
            <h2 className="mt-6 text-xl font-semibold tracking-tight text-ink">No floor plan? Sketch a layout</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-3">
              Add labeled boxes for each room and arrange them roughly where they are. Takes about a minute.
            </p>
            <span className={buttonClasses("secondary", "md", "mt-6")}>
              <PenLine className="h-4 w-4" />
              Start sketching
            </span>
          </button>
        </div>
      ) : floor.planType === "image" && floor.plan ? (
        <div className="mt-8">
          <div className="relative overflow-hidden rounded-3xl bg-surface p-3 ring-1 ring-line sm:p-5">
            <img
              src={floor.plan.src.lg ?? floor.plan.src.md ?? floor.plan.src.sm}
              alt={`${floor.name} floor plan`}
              className="mx-auto max-h-[62vh] w-auto rounded-xl object-contain"
            />
            <div className="absolute right-4 top-4 flex gap-2">
              <input
                ref={replaceInput}
                type="file"
                accept={ACCEPT}
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) void handleFile(f);
                }}
              />
              <Menu>
                <MenuTrigger asChild>
                  <Button variant="glass" size="icon-sm" aria-label="Floor plan options">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </MenuTrigger>
                <MenuContent>
                  <MenuItem icon={<RefreshCcw />} onSelect={() => replaceInput.current?.click()}>
                    Replace floor plan
                  </MenuItem>
                  <MenuItem icon={<LayoutGrid />} onSelect={() => void updateFloor(floor.id, { planType: "layout", aspectRatio: 1.5 })}>
                    Sketch a layout instead
                  </MenuItem>
                  <MenuSeparator />
                  <MenuItem icon={<Trash2 />} destructive onSelect={() => void updateFloor(floor.id, { planType: "none" })}>
                    Remove floor plan
                  </MenuItem>
                  {floors.length > 1 ? (
                    <MenuItem
                      icon={<Trash2 />}
                      destructive
                      onSelect={() => {
                        if (confirm(`Delete ${floor.name}? Rooms keep their photos.`)) {
                          void deleteFloor(floor.id);
                          setFloorId(floors.find((f) => f.id !== floor.id)?.id ?? "");
                        }
                      }}
                    >
                      Delete this floor
                    </MenuItem>
                  ) : null}
                </MenuContent>
              </Menu>
            </div>
          </div>
          <p className="mt-3 text-center text-sm text-ink-3">Looks good? You&apos;ll place room markers on it after adding photos.</p>
        </div>
      ) : (
        <div className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-ink-3">Sketch mode — a simple map for navigation, not an architectural drawing.</p>
            <Button variant="ghost" size="sm" onClick={() => void updateFloor(floor.id, { planType: "none" })}>
              Upload a plan instead
            </Button>
          </div>
          <LayoutEditor floor={floor} />
        </div>
      )}

      <div className="mt-10 flex flex-col-reverse items-center justify-between gap-3 sm:flex-row">
        {floor.planType === "none" ? (
          <Link href={next} className="text-sm font-medium text-ink-3 underline-offset-4 hover:text-ink hover:underline">
            Skip — visitors can browse a room list instead
          </Link>
        ) : (
          <span />
        )}
        <Link href={next} className={buttonClasses("primary", "md")}>
          Continue to photos
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
