"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { createStore, useStore, type StoreApi } from "zustand";
import { api, ApiError, uploadFile } from "@/lib/api-client";
import type {
  FloorDTO,
  MediaDTO,
  PropertyDTO,
  PropertyGraph,
  RoomDTO,
  RoomRegion,
  TourDTO,
  TourSettings,
} from "@/lib/data/types";

export interface UploadItem {
  id: string;
  file: File;
  name: string;
  previewUrl: string | null;
  status: "queued" | "uploading" | "processing" | "done" | "error";
  progress: number;
  error?: string;
  mediaId?: string;
  roomId?: string | null;
}

export type RoomPatch = Partial<{
  name: string;
  category: string;
  icon: string;
  description: string | null;
  features: string[];
  floorId: string | null;
  hotspot: { x: number; y: number } | null;
  region: RoomRegion | null;
  coverMediaId: string | null;
  videoUrl: string | null;
}>;

export interface EditorState {
  graph: PropertyGraph;
  pending: number;
  savedAt: number | null;
  uploads: UploadItem[];

  resync(): Promise<void>;
  setGraph(graph: PropertyGraph): void;
  updateProperty(patch: Partial<PropertyDTO>): Promise<void>;

  addFloor(name: string): Promise<FloorDTO | null>;
  updateFloor(id: string, patch: Partial<Pick<FloorDTO, "name" | "planType" | "aspectRatio">>): Promise<void>;
  deleteFloor(id: string): Promise<void>;
  uploadFloorPlan(floorId: string, file: Blob, filename: string, onProgress?: (f: number) => void): Promise<boolean>;

  enqueueUploads(files: File[], roomId?: string | null): void;
  clearFinishedUploads(): void;
  updateMedia(id: string, patch: { caption?: string | null; kind?: "photo" | "pano" }): Promise<void>;
  moveMedia(ids: string[], roomId: string | null): Promise<void>;
  reorderMedia(orderedIds: string[]): Promise<void>;
  deleteMedia(ids: string[]): Promise<void>;
  upsertMedia(items: MediaDTO[]): void;

  addRoom(input: { name: string; category?: string; icon?: string; floorId?: string | null; hotspot?: { x: number; y: number } | null; region?: RoomRegion | null }): Promise<RoomDTO | null>;
  updateRoom(id: string, patch: RoomPatch): Promise<void>;
  deleteRoom(id: string): Promise<void>;
  mergeRoom(sourceId: string, targetId: string): Promise<void>;
  reorderRooms(orderedIds: string[]): Promise<void>;

  updateTour(patch: { slug?: string; settings?: Partial<TourSettings> }): Promise<boolean>;
  setPublished(publish: boolean): Promise<boolean>;
}

const UPLOAD_CONCURRENCY = 3;

function fail(err: unknown, fallback = "Couldn't save that change.") {
  const message = err instanceof ApiError ? err.message : fallback;
  toast.error(message);
}

function createEditorStore(initial: PropertyGraph) {
  return createStore<EditorState>()((set, get) => {
    const pid = () => get().graph.property.id;

    /** Runs a server call with the saving indicator; on failure shows a toast and resyncs. */
    async function save<T>(fn: () => Promise<T>, opts: { resyncOnError?: boolean } = { resyncOnError: true }): Promise<T | null> {
      set((s) => ({ pending: s.pending + 1 }));
      try {
        const result = await fn();
        set({ savedAt: Date.now() });
        return result;
      } catch (err) {
        fail(err);
        if (opts.resyncOnError) await get().resync();
        return null;
      } finally {
        set((s) => ({ pending: Math.max(0, s.pending - 1) }));
      }
    }

    const patchGraph = (fn: (g: PropertyGraph) => PropertyGraph) => set((s) => ({ graph: fn(s.graph) }));

    function pump() {
      const { uploads } = get();
      const active = uploads.filter((u) => u.status === "uploading" || u.status === "processing").length;
      const next = uploads.filter((u) => u.status === "queued").slice(0, Math.max(0, UPLOAD_CONCURRENCY - active));
      for (const item of next) void runUpload(item);
    }

    const setUpload = (id: string, patch: Partial<UploadItem>) =>
      set((s) => ({ uploads: s.uploads.map((u) => (u.id === id ? { ...u, ...patch } : u)) }));

    async function runUpload(item: UploadItem) {
      setUpload(item.id, { status: "uploading", progress: 0 });
      try {
        const query = new URLSearchParams({ filename: item.name });
        if (item.roomId) query.set("roomId", item.roomId);
        const { media } = await uploadFile<{ media: MediaDTO }>(`/api/properties/${pid()}/media?${query}`, item.file, {
          onProgress: (f) => setUpload(item.id, { progress: f, status: f >= 1 ? "processing" : "uploading" }),
        });
        let final = media;
        if (media.kind === "video") {
          const poster = await captureVideoPoster(item.file).catch(() => null);
          if (poster) {
            const res = await uploadFile<{ media: MediaDTO }>(`/api/media/${media.id}/poster?filename=poster.jpg`, poster).catch(() => null);
            if (res) final = res.media;
          }
        }
        get().upsertMedia([final]);
        setUpload(item.id, { status: "done", progress: 1, mediaId: final.id });
        set({ savedAt: Date.now() });
      } catch (err) {
        setUpload(item.id, { status: "error", error: err instanceof ApiError ? err.message : "Upload failed." });
      } finally {
        pump();
      }
    }

    return {
      graph: initial,
      pending: 0,
      savedAt: null,
      uploads: [],

      setGraph(graph) {
        set({ graph, savedAt: Date.now() });
      },

      async resync() {
        try {
          const graph = await api.get<PropertyGraph>(`/api/properties/${pid()}`);
          set({ graph });
        } catch {
          /* keep local state */
        }
      },

      async updateProperty(patch) {
        patchGraph((g) => ({ ...g, property: { ...g.property, ...patch } }));
        await save(() => api.patch(`/api/properties/${pid()}`, patch));
      },

      async addFloor(name) {
        const res = await save(() => api.post<{ floor: FloorDTO }>(`/api/properties/${pid()}/floors`, { name }));
        if (!res) return null;
        patchGraph((g) => ({ ...g, floors: [...g.floors, res.floor] }));
        return res.floor;
      },

      async updateFloor(id, patch) {
        patchGraph((g) => ({ ...g, floors: g.floors.map((f) => (f.id === id ? { ...f, ...patch } : f)) }));
        const res = await save(() => api.patch<{ floor: FloorDTO }>(`/api/floors/${id}`, patch));
        if (res) patchGraph((g) => ({ ...g, floors: g.floors.map((f) => (f.id === id ? res.floor : f)) }));
      },

      async deleteFloor(id) {
        patchGraph((g) => ({
          ...g,
          floors: g.floors.filter((f) => f.id !== id),
          rooms: g.rooms.map((r) => (r.floorId === id ? { ...r, floorId: null, hotspot: null, region: null } : r)),
        }));
        await save(() => api.del(`/api/floors/${id}`));
      },

      async uploadFloorPlan(floorId, file, filename, onProgress) {
        const res = await save(
          () =>
            uploadFile<{ floor: FloorDTO }>(`/api/floors/${floorId}/plan?filename=${encodeURIComponent(filename)}`, file, {
              method: "PUT",
              onProgress,
            }),
          { resyncOnError: false },
        );
        if (!res) return false;
        patchGraph((g) => ({ ...g, floors: g.floors.map((f) => (f.id === floorId ? res.floor : f)) }));
        return true;
      },

      enqueueUploads(files, roomId = null) {
        const items: UploadItem[] = files.map((file) => ({
          id: crypto.randomUUID(),
          file,
          name: file.name,
          previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
          status: "queued",
          progress: 0,
          roomId,
        }));
        set((s) => ({ uploads: [...s.uploads, ...items] }));
        pump();
      },

      clearFinishedUploads() {
        for (const u of get().uploads) if (u.status === "done" && u.previewUrl) URL.revokeObjectURL(u.previewUrl);
        set((s) => ({ uploads: s.uploads.filter((u) => u.status !== "done") }));
      },

      upsertMedia(items) {
        patchGraph((g) => {
          const byId = new Map(g.media.map((m) => [m.id, m]));
          for (const m of items) byId.set(m.id, m);
          return { ...g, media: [...byId.values()] };
        });
      },

      async updateMedia(id, patch) {
        if (patch.caption !== undefined) {
          patchGraph((g) => ({ ...g, media: g.media.map((m) => (m.id === id ? { ...m, caption: patch.caption ?? null } : m)) }));
        }
        const res = await save(() => api.patch<{ media: MediaDTO }>(`/api/media/${id}`, patch));
        if (res) get().upsertMedia([res.media]);
      },

      async moveMedia(ids, roomId) {
        patchGraph((g) => {
          const base = Math.max(-1, ...g.media.filter((m) => m.roomId === roomId).map((m) => m.sortOrder)) + 1;
          const order = new Map(ids.map((id, i) => [id, base + i]));
          return {
            ...g,
            media: g.media.map((m) =>
              order.has(m.id) ? { ...m, roomId, roomAssignedBy: roomId ? "user" : null, sortOrder: order.get(m.id)! } : m,
            ),
          };
        });
        await save(() => api.post(`/api/properties/${pid()}/media/bulk`, { action: "move", ids, roomId }));
      },

      async reorderMedia(orderedIds) {
        const order = new Map(orderedIds.map((id, i) => [id, i]));
        patchGraph((g) => ({ ...g, media: g.media.map((m) => (order.has(m.id) ? { ...m, sortOrder: order.get(m.id)! } : m)) }));
        await save(() => api.post(`/api/properties/${pid()}/media/bulk`, { action: "reorder", ids: orderedIds }));
      },

      async deleteMedia(ids) {
        const gone = new Set(ids);
        patchGraph((g) => ({
          ...g,
          media: g.media.filter((m) => !gone.has(m.id)),
          rooms: g.rooms.map((r) => (r.coverMediaId && gone.has(r.coverMediaId) ? { ...r, coverMediaId: null } : r)),
        }));
        await save(() => api.post(`/api/properties/${pid()}/media/bulk`, { action: "delete", ids }));
      },

      async addRoom(input) {
        const res = await save(() => api.post<{ room: RoomDTO }>(`/api/properties/${pid()}/rooms`, input));
        if (!res) return null;
        patchGraph((g) => ({ ...g, rooms: [...g.rooms, res.room] }));
        return res.room;
      },

      async updateRoom(id, patch) {
        patchGraph((g) => ({
          ...g,
          rooms: g.rooms.map((r) =>
            r.id === id
              ? {
                  ...r,
                  ...patch,
                  ...(patch.description !== undefined ? { descriptionSource: patch.description ? ("user" as const) : null } : {}),
                }
              : r,
          ),
        }));
        await save(() => api.patch<{ room: RoomDTO }>(`/api/rooms/${id}`, patch));
      },

      async deleteRoom(id) {
        patchGraph((g) => ({
          ...g,
          rooms: g.rooms.filter((r) => r.id !== id),
          media: g.media.map((m) => (m.roomId === id ? { ...m, roomId: null, roomAssignedBy: null } : m)),
        }));
        await save(() => api.del(`/api/rooms/${id}`));
      },

      async mergeRoom(sourceId, targetId) {
        const res = await save(() => api.post<{ room: RoomDTO }>(`/api/rooms/${sourceId}/merge`, { targetId }));
        if (res) await get().resync();
      },

      async reorderRooms(orderedIds) {
        const order = new Map(orderedIds.map((id, i) => [id, i]));
        patchGraph((g) => ({
          ...g,
          rooms: [...g.rooms.map((r) => (order.has(r.id) ? { ...r, sortOrder: order.get(r.id)! } : r))].sort(
            (a, b) => a.sortOrder - b.sortOrder,
          ),
        }));
        await save(() => api.post(`/api/properties/${pid()}/rooms/reorder`, { ids: orderedIds }));
      },

      async updateTour(patch) {
        const res = await save(() => api.patch<{ tour: TourDTO }>(`/api/properties/${pid()}/tour`, patch), { resyncOnError: false });
        if (!res) return false;
        patchGraph((g) => ({ ...g, tour: res.tour }));
        return true;
      },

      async setPublished(publish) {
        const res = await save(() => api.post<{ tour: TourDTO }>(`/api/properties/${pid()}/publish`, { publish }), {
          resyncOnError: false,
        });
        if (!res) return false;
        patchGraph((g) => ({ ...g, tour: res.tour }));
        return true;
      },
    };
  });
}

/** Grabs a frame ~1s into a video so the gallery has a poster (no server-side ffmpeg). */
async function captureVideoPoster(file: File): Promise<Blob | null> {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = url;
    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error("decode"));
      setTimeout(() => reject(new Error("timeout")), 8000);
    });
    video.currentTime = Math.min(1, (video.duration || 2) / 2);
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve();
      setTimeout(resolve, 3000);
    });
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 1280 / (video.videoWidth || 1280));
    canvas.width = Math.round((video.videoWidth || 1280) * scale);
    canvas.height = Math.round((video.videoHeight || 720) * scale);
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", 0.85));
  } finally {
    URL.revokeObjectURL(url);
  }
}

const EditorContext = createContext<StoreApi<EditorState> | null>(null);

export function EditorProvider({ graph, children }: { graph: PropertyGraph; children: ReactNode }) {
  const [store] = useState(() => createEditorStore(graph));
  return <EditorContext.Provider value={store}>{children}</EditorContext.Provider>;
}

export function useEditor<T>(selector: (s: EditorState) => T): T {
  const store = useContext(EditorContext);
  if (!store) throw new Error("useEditor must be used inside <EditorProvider>");
  return useStore(store, selector);
}

export function useEditorApi(): StoreApi<EditorState> {
  const store = useContext(EditorContext);
  if (!store) throw new Error("useEditorApi must be used inside <EditorProvider>");
  return store;
}
