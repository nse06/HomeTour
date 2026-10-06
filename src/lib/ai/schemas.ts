import { z } from "zod/v4";
import { ROOM_CATEGORY_IDS } from "@/lib/rooms";

/** One photo's analysis. Bounds are enforced client-side by the SDK (the API ignores them). */
export const PhotoAnalysisSchema = z.object({
  index: z.number().int(),
  category: z.enum(ROOM_CATEGORY_IDS as [string, ...string[]]),
  confidence: z.number(),
  image_type: z.enum(["interior", "exterior", "detail", "aerial", "floor_plan", "other"]),
  is_panorama: z.boolean(),
  features: z.array(z.string()),
  caption: z.string(),
  quality: z.number().int(),
});

export const ClassifyBatchSchema = z.object({ photos: z.array(PhotoAnalysisSchema) });
export type PhotoAnalysis = z.infer<typeof PhotoAnalysisSchema>;

export const RoomDescriptionSchema = z.object({
  room_id: z.string(),
  description: z.string(),
  features: z.array(z.string()),
});

export const DescribeBatchSchema = z.object({ rooms: z.array(RoomDescriptionSchema) });
export type RoomDescription = z.infer<typeof RoomDescriptionSchema>;

/** Normalized result stored on media rows. */
export interface StoredAnalysis {
  category: string;
  confidence: number;
  features: string[];
  caption: string;
  quality: number;
  isPanorama: boolean;
  imageType: string;
}

export function normalizeAnalysis(a: PhotoAnalysis): StoredAnalysis {
  const clamp01 = (n: number) => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));
  return {
    category: a.category,
    confidence: clamp01(a.confidence > 1 ? a.confidence / 100 : a.confidence),
    features: a.features
      .map((f) => f.trim())
      .filter(Boolean)
      .slice(0, 6)
      .map((f) => f.charAt(0).toLowerCase() + f.slice(1)),
    caption: a.caption.trim().slice(0, 140),
    quality: Math.max(0, Math.min(100, Math.round(a.quality))),
    isPanorama: a.is_panorama,
    imageType: a.image_type,
  };
}
