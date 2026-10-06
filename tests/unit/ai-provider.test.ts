import { beforeEach, describe, expect, it, vi } from "vitest";

const parse = vi.fn();
const betaParse = vi.fn();

vi.mock("@anthropic-ai/sdk", () => {
  class Anthropic {
    messages = { parse };
    beta = { messages: { parse: betaParse } };
  }
  return { default: Anthropic };
});

const { anthropicProvider, mockProvider, modelCaps } = await import("@/lib/ai/providers");

describe("modelCaps", () => {
  it("only sends effort / server fallbacks to models that accept them", () => {
    expect(modelCaps("claude-opus-5-5")).toEqual({ effort: true, serverFallbacks: true });
    expect(modelCaps("claude-sonnet-5-5")).toEqual({ effort: true, serverFallbacks: true });
    expect(modelCaps("claude-haiku-4-5")).toEqual({ effort: false, serverFallbacks: false });
  });
});

describe("anthropic provider", () => {
  beforeEach(() => {
    parse.mockReset();
    betaParse.mockReset();
    delete process.env.AI_CLASSIFY_MODEL;
    delete process.env.AI_DESCRIBE_MODEL;
  });

  it("classifies a batch with one structured-output request and maps results by index", async () => {
    parse.mockResolvedValue({
      model: "claude-haiku-4-5",
      stop_reason: "end_turn",
      usage: { input_tokens: 1200, output_tokens: 300 },
      parsed_output: {
        photos: [
          { index: 2, category: "bathroom", confidence: 0.9, image_type: "interior", is_panorama: false, features: ["Freestanding tub"], caption: "Bath", quality: 80 },
          { index: 1, category: "kitchen", confidence: 0.94, image_type: "interior", is_panorama: false, features: ["Kitchen island"], caption: "Kitchen", quality: 88 },
        ],
      },
    });
    const jpeg = Buffer.from([0xff, 0xd8, 0xff]);
    const { results, usage } = await anthropicProvider.classify([
      { index: 1, filename: "a.jpg", jpeg },
      { index: 2, filename: "IMG_1.jpg", jpeg },
    ]);
    expect(parse).toHaveBeenCalledTimes(1);
    const req = parse.mock.calls[0][0];
    expect(req.model).toBe("claude-haiku-4-5");
    expect(req.output_config.format).toBeTruthy();
    expect(req.temperature).toBeUndefined();
    const images = req.messages[0].content.filter((b: { type: string }) => b.type === "image");
    expect(images).toHaveLength(2);
    expect(images[0].source).toMatchObject({ type: "base64", media_type: "image/jpeg" });
    expect(results.get(1)?.category).toBe("kitchen");
    expect(results.get(2)?.category).toBe("bathroom");
    expect(usage).toEqual({ model: "claude-haiku-4-5", inputTokens: 1200, outputTokens: 300 });
  });

  it("rejects refusals and truncated output instead of guessing", async () => {
    parse.mockResolvedValue({ model: "m", stop_reason: "refusal", usage: { input_tokens: 1, output_tokens: 1 }, parsed_output: null });
    await expect(anthropicProvider.classify([{ index: 1, filename: "a.jpg", jpeg: Buffer.from([1]) }])).rejects.toThrow(/declined/);
    parse.mockResolvedValue({ model: "m", stop_reason: "max_tokens", usage: { input_tokens: 1, output_tokens: 1 }, parsed_output: null });
    await expect(anthropicProvider.classify([{ index: 1, filename: "a.jpg", jpeg: Buffer.from([1]) }])).rejects.toThrow(/Incomplete/);
  });

  it("writes descriptions with low effort and server-side refusal fallbacks on Opus 5.5", async () => {
    betaParse.mockResolvedValue({
      model: "claude-opus-5-5",
      stop_reason: "end_turn",
      usage: { input_tokens: 3000, output_tokens: 400 },
      parsed_output: { rooms: [{ room_id: "r1", description: "A bright kitchen.", features: ["Island"] }] },
    });
    const { results } = await anthropicProvider.describe(
      [{ roomId: "r1", name: "Kitchen", category: "kitchen", detected: ["kitchen island"], images: [Buffer.from([0xff, 0xd8])] }],
      "Bedrooms: 3",
    );
    const req = betaParse.mock.calls[0][0];
    expect(req.model).toBe("claude-opus-5-5");
    expect(req.output_config.effort).toBe("low");
    expect(req.betas).toEqual(["server-side-fallback-2026-07-01"]);
    expect(req.fallbacks).toBe("default");
    expect(req.thinking).toBeUndefined();
    expect(results[0].description).toBe("A bright kitchen.");
  });

  it("omits Opus-only parameters when a cheaper writer model is configured", async () => {
    process.env.AI_DESCRIBE_MODEL = "claude-haiku-4-5";
    betaParse.mockResolvedValue({ model: "claude-haiku-4-5", stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 }, parsed_output: { rooms: [] } });
    await anthropicProvider.describe([{ roomId: "r1", name: "Kitchen", category: "kitchen", detected: [], images: [] }], "");
    const req = betaParse.mock.calls[0][0];
    expect(req.output_config.effort).toBeUndefined();
    expect(req.betas).toBeUndefined();
    expect(req.fallbacks).toBeUndefined();
  });
});

describe("mock provider", () => {
  it("is deterministic and uses filename hints", async () => {
    const jpeg = Buffer.alloc(100);
    const a = await mockProvider.classify([{ index: 1, filename: "kitchen-1.jpg", jpeg }]);
    const b = await mockProvider.classify([{ index: 1, filename: "kitchen-1.jpg", jpeg }]);
    expect(a.results.get(1)).toEqual(b.results.get(1));
    expect(a.results.get(1)?.category).toBe("kitchen");
    expect(a.results.get(1)?.confidence).toBeGreaterThan(0.8);
  });
});
