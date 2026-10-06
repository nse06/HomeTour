import { categoryFromName, getCategory } from "@/lib/rooms";
import type { StoredAnalysis } from "./schemas";

/**
 * Zero-cost fallback when no AI is configured (or a call fails): many photo exports have
 * descriptive names ("kitchen-2.jpg", "Master Bath.jpeg"). Low confidence by design.
 */
export function analyzeByFilename(filename: string | null | undefined): StoredAnalysis | null {
  if (!filename) return null;
  const category = categoryFromName(filename);
  if (!category) return null;
  return {
    category,
    confidence: 0.5,
    features: [],
    caption: getCategory(category).label,
    quality: 50,
    isPanorama: false,
    imageType: category === "exterior" ? "exterior" : "interior",
  };
}
