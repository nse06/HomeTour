/* eslint-disable @next/next/no-img-element -- local object-URL previews */
"use client";

import { AlertCircle, ArrowRight, ImagePlus, Rotate3d, Trash2, Upload, X } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { Button, buttonClasses } from "@/components/ui/button";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/menu";
import { ProgressBar } from "@/components/ui/misc";
import { pluralize } from "@/lib/utils";
import { Dropzone } from "./dropzone";
import { MediaThumb } from "./media-thumb";
import { OrganizePanel } from "./organize-panel";
import { useEditor, type UploadItem } from "./store";

const ACCEPT = "image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif,video/mp4,video/quicktime,video/webm";

export function PhotosStep() {
  const property = useEditor((s) => s.graph.property);
  const media = useEditor((s) => s.graph.media);
  const uploads = useEditor((s) => s.uploads);
  const enqueue = useEditor((s) => s.enqueueUploads);
  const clearFinished = useEditor((s) => s.clearFinishedUploads);
  const deleteMedia = useEditor((s) => s.deleteMedia);
  const updateMedia = useEditor((s) => s.updateMedia);

  const sorted = useMemo(() => [...media].sort((a, b) => a.createdAt - b.createdAt), [media]);
  const inFlight = uploads.filter((u) => u.status !== "done");
  const active = uploads.filter((u) => u.status === "queued" || u.status === "uploading" || u.status === "processing");
  const totalProgress = uploads.length
    ? (uploads.reduce((sum, u) => sum + (u.status === "done" || u.status === "error" ? 1 : u.progress * 0.9), 0) / uploads.length) * 100
    : 0;

  const onFiles = (files: File[]) => {
    const accepted = files.filter((f) => /^(image|video)\//.test(f.type) || /\.(jpe?g|png|webp|heic|mov|mp4)$/i.test(f.name));
    if (accepted.length) enqueue(accepted);
  };

  const empty = sorted.length === 0 && inFlight.length === 0;

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-4xl text-ink">Photos</h1>
          <p className="mt-2 max-w-xl text-[15px] text-ink-3">
            Add every photo you have, in any order. We&apos;ll sort them into rooms next — you can always change things.
          </p>
        </div>
        {sorted.length ? <p className="text-sm text-ink-3">{pluralize(sorted.length, "item")} uploaded</p> : null}
      </div>

      <Dropzone accept={ACCEPT} onFiles={onFiles} label="Upload photos" className={empty ? "mt-8 px-6 py-16 text-center sm:py-24" : "mt-8 px-6 py-6"}>
        {empty ? (
          <div className="mx-auto flex max-w-md flex-col items-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-sunken">
              <ImagePlus className="h-7 w-7 text-ink-2" strokeWidth={1.75} />
            </div>
            <h2 className="mt-6 text-2xl font-semibold tracking-tight text-ink">Drop your property photos here</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-3">
              JPG, PNG or WebP photos — plus videos and 360° panoramas if you have them. Select dozens at once.
            </p>
            <span className={buttonClasses("primary", "lg", "mt-7")}>
              <Upload className="h-4 w-4" />
              Choose photos
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-3 text-[15px] text-ink-2">
            <ImagePlus className="h-5 w-5" strokeWidth={1.75} />
            <span>
              <span className="font-semibold text-ink">Add more photos</span> — drop them here or click to browse
            </span>
          </div>
        )}
      </Dropzone>

      {uploads.length ? (
        <div className="mt-5 flex items-center gap-4 rounded-2xl bg-surface px-4 py-3 ring-1 ring-line">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ink">
              {active.length
                ? `Uploading ${uploads.length - active.length} of ${uploads.length}…`
                : `${uploads.filter((u) => u.status === "done").length} uploaded${uploads.some((u) => u.status === "error") ? ` · ${uploads.filter((u) => u.status === "error").length} failed` : ""}`}
            </p>
            <ProgressBar value={totalProgress} className="mt-2" />
          </div>
          {!active.length ? (
            <Button variant="ghost" size="sm" onClick={clearFinished}>
              Dismiss
            </Button>
          ) : null}
        </div>
      ) : null}

      {!empty ? (
        <div className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 lg:grid-cols-6">
          {inFlight.map((u) => (
            <UploadTile key={u.id} item={u} />
          ))}
          {sorted.map((m) => (
            <MediaThumb key={m.id} media={m}>
              <div className="absolute bottom-1.5 right-1.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 pointer-coarse:opacity-100">
                <Menu>
                  <MenuTrigger asChild>
                    <button
                      type="button"
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-ink shadow-sm"
                      aria-label="Photo options"
                    >
                      ···
                    </button>
                  </MenuTrigger>
                  <MenuContent>
                    {m.kind === "photo" || m.kind === "pano" ? (
                      <MenuItem icon={<Rotate3d />} onSelect={() => void updateMedia(m.id, { kind: m.kind === "pano" ? "photo" : "pano" })}>
                        {m.kind === "pano" ? "Treat as a normal photo" : "This is a 360° photo"}
                      </MenuItem>
                    ) : null}
                    <MenuItem icon={<Trash2 />} destructive onSelect={() => void deleteMedia([m.id])}>
                      Delete
                    </MenuItem>
                  </MenuContent>
                </Menu>
              </div>
            </MediaThumb>
          ))}
        </div>
      ) : null}

      {sorted.length > 0 && active.length === 0 ? <OrganizePanel className="mt-10" /> : null}

      <div className="mt-10 flex justify-between">
        <Link href={`/app/p/${property.id}/floor-plan`} className={buttonClasses("ghost", "md")}>
          Back
        </Link>
        <Link
          href={`/app/p/${property.id}/rooms`}
          className={buttonClasses(sorted.length ? "secondary" : "ghost", "md", sorted.length ? undefined : "pointer-events-none opacity-40")}
        >
          Organize manually
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function UploadTile({ item }: { item: UploadItem }) {
  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-sunken ring-1 ring-black/5">
      {item.previewUrl ? <img src={item.previewUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" /> : null}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/30 p-3 text-center backdrop-blur-[1px]">
        {item.status === "error" ? (
          <>
            <AlertCircle className="h-5 w-5 text-danger" />
            <p className="line-clamp-3 text-[11px] font-medium leading-tight text-danger">{item.error}</p>
          </>
        ) : (
          <>
            <div className="h-1.5 w-3/4 overflow-hidden rounded-full bg-white/70">
              <div
                className="h-full rounded-full bg-ink transition-[width] duration-200"
                style={{ width: `${item.status === "processing" ? 100 : Math.round(item.progress * 100)}%` }}
              />
            </div>
            <p className="text-[11px] font-medium text-ink-2">
              {item.status === "queued" ? "Waiting…" : item.status === "processing" ? "Optimizing…" : `${Math.round(item.progress * 100)}%`}
            </p>
          </>
        )}
      </div>
      {item.status === "error" ? <X className="absolute right-1.5 top-1.5 h-4 w-4 text-danger" /> : null}
    </div>
  );
}
