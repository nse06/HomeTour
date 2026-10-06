import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { env } from "@/lib/env";
import { categoryFromName, getCategory } from "@/lib/rooms";
import { CLASSIFY_SYSTEM, DESCRIBE_SYSTEM } from "./prompts";
import {
  ClassifyBatchSchema,
  DescribeBatchSchema,
  normalizeAnalysis,
  type RoomDescription,
  type StoredAnalysis,
} from "./schemas";

export interface ClassifyImage {
  index: number;
  filename: string;
  jpeg: Buffer;
}

export interface DescribeRoomInput {
  roomId: string;
  name: string;
  category: string;
  /** Features already detected on the room's photos (grounding context). */
  detected: string[];
  images: Buffer[];
}

export interface ProviderUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export interface VisionProvider {
  name: "anthropic" | "mock";
  classify(images: ClassifyImage[]): Promise<{ results: Map<number, StoredAnalysis>; usage: ProviderUsage }>;
  describe(rooms: DescribeRoomInput[], facts: string): Promise<{ results: RoomDescription[]; usage: ProviderUsage }>;
}

export class AiError extends Error {}

/* ------------------------------------------------------------------ */
/* Anthropic                                                           */
/* ------------------------------------------------------------------ */

let client: Anthropic | null = null;
function anthropic(): Anthropic {
  client ??= new Anthropic({ maxRetries: 2, timeout: 120_000 });
  return client;
}

/** Request features differ by model generation; only send what a model accepts. */
export function modelCaps(model: string) {
  const current = /claude-(opus-5|sonnet-5-5|fable-5)/.test(model);
  return {
    effort: current || /claude-(opus-4-[5-8]|sonnet-5)/.test(model),
    serverFallbacks: current,
  };
}

const imageBlock = (jpeg: Buffer): Anthropic.ImageBlockParam => ({
  type: "image",
  source: { type: "base64", media_type: "image/jpeg", data: jpeg.toString("base64") },
});

export const anthropicProvider: VisionProvider = {
  name: "anthropic",

  async classify(images) {
    const model = env.ai.classifyModel;
    const content: Anthropic.ContentBlockParam[] = [];
    for (const img of images) {
      content.push({ type: "text", text: `Image ${img.index} (filename: ${img.filename.slice(0, 80)})` });
      content.push(imageBlock(img.jpeg));
    }
    content.push({ type: "text", text: `Analyze all ${images.length} images.` });

    const response = await anthropic().messages.parse({
      model,
      max_tokens: 1024 + images.length * 400,
      system: CLASSIFY_SYSTEM,
      messages: [{ role: "user", content }],
      output_config: { format: zodOutputFormat(ClassifyBatchSchema) },
    });
    if (response.stop_reason === "refusal") throw new AiError("The model declined to analyze these photos.");
    if (response.stop_reason === "max_tokens" || !response.parsed_output) throw new AiError("Incomplete analysis.");

    const results = new Map<number, StoredAnalysis>();
    for (const photo of response.parsed_output.photos) results.set(photo.index, normalizeAnalysis(photo));
    return {
      results,
      usage: { model: response.model, inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
    };
  },

  async describe(rooms, facts) {
    const model = env.ai.describeModel;
    const caps = modelCaps(model);
    const content: Anthropic.Beta.BetaContentBlockParam[] = [
      { type: "text", text: `Owner-provided facts (may be used):\n${facts || "(none)"}` },
    ];
    for (const room of rooms) {
      content.push({
        type: "text",
        text: `room_id: ${room.roomId}\nRoom name: ${room.name}\nDetected in photos: ${room.detected.join(", ") || "(nothing listed)"}`,
      });
      for (const jpeg of room.images) content.push(imageBlock(jpeg));
    }
    content.push({ type: "text", text: `Write descriptions for all ${rooms.length} rooms.` });

    const response = await anthropic().beta.messages.parse({
      model,
      max_tokens: 8000,
      system: DESCRIBE_SYSTEM,
      messages: [{ role: "user", content }],
      output_config: { format: betaZodOutputFormat(DescribeBatchSchema), ...(caps.effort ? { effort: "low" as const } : {}) },
      // If a safety classifier declines a benign request, retry server-side on Anthropic's recommended model.
      ...(caps.serverFallbacks ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
    });
    if (response.stop_reason === "refusal") throw new AiError("The model declined to describe these rooms.");
    if (response.stop_reason === "max_tokens" || !response.parsed_output) throw new AiError("Incomplete descriptions.");
    return {
      results: response.parsed_output.rooms,
      usage: { model: response.model, inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
    };
  },
};

/* ------------------------------------------------------------------ */
/* Mock (deterministic; for local development and automated tests)     */
/* ------------------------------------------------------------------ */

const MOCK_FEATURES: Record<string, string[]> = {
  exterior: ["front facade", "landscaped lawn", "large windows", "driveway"],
  entryway: ["front door", "entry console", "natural light"],
  living_room: ["sectional sofa", "large windows", "hardwood floors", "fireplace"],
  kitchen: ["kitchen island", "pendant lighting", "stainless appliances", "breakfast bar"],
  dining_room: ["dining table", "statement pendant", "garden access"],
  primary_bedroom: ["upholstered bed", "reading chair", "large windows"],
  bedroom: ["double bed", "built-in wardrobe", "natural light"],
  bathroom: ["freestanding tub", "double vanity", "walk-in shower"],
  office: ["desk", "built-in shelving", "natural light"],
  laundry: ["washer and dryer", "folding counter"],
  basement: ["open recreation space", "recessed lighting"],
  garage: ["two-car space", "storage shelving"],
  patio: ["outdoor dining set", "timber deck", "garden view"],
  balcony: ["outdoor seating", "glass railing"],
  yard: ["level lawn", "mature trees"],
  pool: ["in-ground pool", "lounge chairs"],
  other: ["open space"],
};

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const MOCK_CYCLE = ["living_room", "kitchen", "bedroom", "bathroom", "exterior", "dining_room", "patio"];

export const mockProvider: VisionProvider = {
  name: "mock",
  async classify(images) {
    const results = new Map<number, StoredAnalysis>();
    for (const img of images) {
      const h = hash(img.filename + img.jpeg.byteLength);
      const category = categoryFromName(img.filename) ?? MOCK_CYCLE[h % MOCK_CYCLE.length];
      const pool = MOCK_FEATURES[category] ?? MOCK_FEATURES.other;
      results.set(img.index, {
        category,
        confidence: categoryFromName(img.filename) ? 0.86 + (h % 12) / 100 : 0.58 + (h % 20) / 100,
        features: pool.slice(0, 2 + (h % 2)),
        caption: `${getCategory(category).label} with ${pool[0]}`,
        quality: 55 + (h % 45),
        isPanorama: false,
        imageType: category === "exterior" ? "exterior" : "interior",
      });
    }
    return { results, usage: { model: "mock", inputTokens: 0, outputTokens: 0 } };
  },
  async describe(rooms) {
    return {
      results: rooms.map((room) => {
        const feats = (room.detected.length ? room.detected : MOCK_FEATURES[room.category] ?? []).slice(0, 3);
        const list = feats.length > 1 ? `${feats.slice(0, -1).join(", ")} and ${feats[feats.length - 1]}` : (feats[0] ?? "a calm, simple layout");
        return {
          room_id: room.roomId,
          description: `A light-filled ${room.name.toLowerCase()} with ${list}.`,
          features: feats.map((f) => f.charAt(0).toUpperCase() + f.slice(1)),
        };
      }),
      usage: { model: "mock", inputTokens: 0, outputTokens: 0 },
    };
  },
};

export function getProvider(): VisionProvider | null {
  const p = env.ai.provider;
  if (p === "anthropic") return anthropicProvider;
  if (p === "mock") return mockProvider;
  return null;
}
