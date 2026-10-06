/** USD per million tokens (first-party API rates). Used for spend tracking and budget caps. */
const PRICES: Record<string, { input: number; output: number }> = {
  "claude-haiku-4-5": { input: 1, output: 5 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-sonnet-5": { input: 2, output: 10 },
  "claude-opus-5-5": { input: 4, output: 20 },
  "claude-opus-5": { input: 5, output: 25 },
  "claude-opus-4-8": { input: 5, output: 25 },
  "claude-fable-5-1": { input: 10, output: 50 },
};

export function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const price = PRICES[model] ?? Object.entries(PRICES).find(([id]) => model.startsWith(id))?.[1] ?? { input: 5, output: 25 };
  return (inputTokens * price.input + outputTokens * price.output) / 1_000_000;
}

/** Rough image token estimate (width × height / 750), for logging before a call. */
export function estimateImageTokens(width: number, height: number): number {
  return Math.ceil((width * height) / 750);
}
