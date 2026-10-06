import { env } from "@/lib/env";

export interface AiStatus {
  /** Real vision model, deterministic mock, or none (filename hints only). */
  provider: "anthropic" | "mock" | "off";
  available: boolean;
}

export function aiStatus(): AiStatus {
  const provider = env.ai.provider;
  return { provider, available: provider !== "off" };
}
