import { and, eq, inArray, isNull, sum } from "drizzle-orm";
import { db } from "@/lib/db";
import { aiCache, aiUsage, media, type Media } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { newId } from "@/lib/ids";
import { toAiJpeg } from "@/lib/media/process";
import { storage } from "@/lib/storage";
import { analyzeByFilename } from "./filename";
import { CLASSIFY_PROMPT_VERSION } from "./prompts";
import { estimateCostUsd } from "./pricing";
import { AiError, getProvider, type ClassifyImage } from "./providers";
import type { StoredAnalysis } from "./schemas";

export const CLASSIFY_BATCH_SIZE = 6;

export class AiBudgetError extends Error {}

export interface ClassifyOutcome {
  analyzed: number;
  fromCache: number;
  fallback: number;
  failed: number;
  source: "ai" | "mock" | "filename";
}

export async function propertyAiSpend(propertyId: string): Promise<number> {
  const [row] = await db.select({ total: sum(aiUsage.costUsd) }).from(aiUsage).where(eq(aiUsage.propertyId, propertyId));
  return Number(row?.total ?? 0);
}

async function recordUsage(input: {
  userId: string;
  propertyId: string;
  purpose: "classify" | "describe";
  model: string;
  inputTokens: number;
  outputTokens: number;
  items: number;
}) {
  if (input.model === "mock") return;
  await db.insert(aiUsage).values({
    id: newId(),
    ...input,
    costUsd: estimateCostUsd(input.model, input.inputTokens, input.outputTokens),
  });
}

async function applyAnalysis(row: Media, analysis: StoredAnalysis, source: "ai" | "mock" | "filename", model: string | null) {
  await db
    .update(media)
    .set({
      aiCategory: analysis.category,
      aiConfidence: analysis.confidence,
      aiFeatures: analysis.features,
      aiCaption: analysis.caption,
      aiQuality: analysis.quality,
      aiSource: source,
      aiModel: model,
      aiAnalyzedAt: new Date(),
    })
    .where(eq(media.id, row.id));
}

/**
 * Analyzes photos that haven't been analyzed yet (or the given ids).
 * - Results are cached by content hash + model + prompt version: re-uploads cost nothing.
 * - Images are downscaled to ~768px JPEGs before sending.
 * - Batches of 6 share one request; a failed batch falls back to filename hints.
 * - Spending is capped per property (AI_MAX_SPEND_PER_PROPERTY_USD).
 */
export async function classifyPhotos(opts: { propertyId: string; userId: string; mediaIds?: string[]; force?: boolean }): Promise<ClassifyOutcome> {
  const provider = getProvider();
  const conditions = [eq(media.propertyId, opts.propertyId), inArray(media.kind, ["photo", "pano"]), eq(media.status, "ready")];
  if (opts.mediaIds?.length) conditions.push(inArray(media.id, opts.mediaIds));
  if (!opts.force) conditions.push(isNull(media.aiAnalyzedAt));
  const rows = await db.select().from(media).where(and(...conditions));

  const outcome: ClassifyOutcome = { analyzed: 0, fromCache: 0, fallback: 0, failed: 0, source: provider ? (provider.name === "mock" ? "mock" : "ai") : "filename" };
  if (rows.length === 0) return outcome;

  // No AI configured: filename hints only (free, instant, honest about being a guess).
  if (!provider) {
    for (const row of rows) {
      const guess = analyzeByFilename(row.originalFilename);
      if (guess) {
        await applyAnalysis(row, guess, "filename", null);
        outcome.fallback++;
      } else {
        await db.update(media).set({ aiAnalyzedAt: new Date(), aiSource: "filename" }).where(eq(media.id, row.id));
        outcome.failed++;
      }
    }
    return outcome;
  }

  const model = provider.name === "mock" ? "mock" : env.ai.classifyModel;
  const cacheKey = (row: Media) => `classify:${CLASSIFY_PROMPT_VERSION}:${model}:${row.contentHash}`;

  // 1. Cache hits.
  const keys = rows.filter((r) => r.contentHash).map(cacheKey);
  const cached = keys.length ? await db.select().from(aiCache).where(inArray(aiCache.key, keys)) : [];
  const cacheMap = new Map(cached.map((c) => [c.key, c.result as StoredAnalysis]));
  const pending: Media[] = [];
  for (const row of rows) {
    const hit = row.contentHash ? cacheMap.get(cacheKey(row)) : undefined;
    if (hit && !opts.force) {
      await applyAnalysis(row, hit, provider.name === "mock" ? "mock" : "ai", model);
      outcome.fromCache++;
      outcome.analyzed++;
    } else {
      pending.push(row);
    }
  }

  // 2. Budget guard (real model only).
  if (pending.length && provider.name === "anthropic") {
    const spent = await propertyAiSpend(opts.propertyId);
    if (spent >= env.ai.maxSpendPerPropertyUsd) {
      throw new AiBudgetError("This tour has used its AI budget. You can still sort photos by hand.");
    }
  }

  // 3. Batched analysis.
  const store = await storage();
  for (let i = 0; i < pending.length; i += CLASSIFY_BATCH_SIZE) {
    const batch = pending.slice(i, i + CLASSIFY_BATCH_SIZE);
    const images: ClassifyImage[] = [];
    for (const [j, row] of batch.entries()) {
      const variant = row.variants.md ?? row.variants.sm ?? row.variants.lg;
      const object = variant ? await store.get(variant.key) : null;
      if (!object) continue;
      images.push({ index: j + 1, filename: row.originalFilename ?? `photo-${j + 1}.jpg`, jpeg: await toAiJpeg(object.body) });
    }
    try {
      const { results, usage } = await provider.classify(images);
      await recordUsage({ userId: opts.userId, propertyId: opts.propertyId, purpose: "classify", ...usage, items: images.length });
      for (const [j, row] of batch.entries()) {
        const analysis = results.get(j + 1);
        if (!analysis) {
          const guess = analyzeByFilename(row.originalFilename);
          if (guess) await applyAnalysis(row, guess, "filename", null);
          outcome.failed++;
          continue;
        }
        await applyAnalysis(row, analysis, provider.name === "mock" ? "mock" : "ai", usage.model);
        if (row.contentHash) {
          await db
            .insert(aiCache)
            .values({ key: cacheKey(row), result: analysis })
            .onConflictDoUpdate({ target: aiCache.key, set: { result: analysis, createdAt: new Date() } });
        }
        outcome.analyzed++;
      }
    } catch (err) {
      console.warn("[ai] classify batch failed; using filename hints", err instanceof AiError ? err.message : err);
      for (const row of batch) {
        const guess = analyzeByFilename(row.originalFilename);
        if (guess) {
          await applyAnalysis(row, guess, "filename", null);
          outcome.fallback++;
        } else {
          outcome.failed++;
        }
      }
    }
  }
  return outcome;
}

export { recordUsage };
