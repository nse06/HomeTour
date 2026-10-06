/**
 * Centralized, typed access to runtime configuration.
 * Every setting has a sensible default so `npm run dev` works with zero config.
 */

function bool(value: string | undefined, fallback = false): boolean {
  if (value === undefined || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

export function getAppUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000";
  return url.replace(/\/+$/, "");
}

export const env = {
  get databaseUrl() {
    return process.env.DATABASE_URL || "file:./.data/hometour.db";
  },
  get databaseAuthToken() {
    return process.env.DATABASE_AUTH_TOKEN || undefined;
  },

  get storageDriver(): "local" | "s3" {
    return process.env.STORAGE_DRIVER === "s3" ? "s3" : "local";
  },
  get storageDir() {
    return process.env.STORAGE_DIR || "./.data/storage";
  },
  s3: {
    get bucket() {
      return process.env.S3_BUCKET || "";
    },
    get region() {
      return process.env.S3_REGION || "auto";
    },
    get endpoint() {
      return process.env.S3_ENDPOINT || undefined;
    },
    get accessKeyId() {
      return process.env.S3_ACCESS_KEY_ID || undefined;
    },
    get secretAccessKey() {
      return process.env.S3_SECRET_ACCESS_KEY || undefined;
    },
    /** Public base URL for objects (CDN / R2 public bucket). */
    get publicUrl() {
      return (process.env.S3_PUBLIC_URL || "").replace(/\/+$/, "");
    },
    get forcePathStyle() {
      return bool(process.env.S3_FORCE_PATH_STYLE, false);
    },
  },

  ai: {
    /**
     * "anthropic" (real vision model), "mock" (deterministic fake for local dev/tests),
     * or "off". Defaults to anthropic when an API key is present, otherwise off.
     */
    get provider(): "anthropic" | "mock" | "off" {
      const p = (process.env.AI_PROVIDER || "").toLowerCase();
      if (p === "mock" || p === "off" || p === "anthropic") return p;
      return process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN ? "anthropic" : "off";
    },
    /** Cheap, fast vision model for bulk photo classification. */
    get classifyModel() {
      return process.env.AI_CLASSIFY_MODEL || "claude-haiku-4-5";
    },
    /** Model for short, grounded room descriptions. */
    get describeModel() {
      return process.env.AI_DESCRIBE_MODEL || "claude-opus-5-5";
    },
    /** Hard ceiling on AI spend per property, in USD. */
    get maxSpendPerPropertyUsd() {
      const n = Number(process.env.AI_MAX_SPEND_PER_PROPERTY_USD || "1");
      return Number.isFinite(n) && n > 0 ? n : 1;
    },
  },

  get billingEnabled() {
    return bool(process.env.BILLING_ENABLED, false);
  },

  get adminEmails(): string[] {
    return (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
  },

  get isProduction() {
    return process.env.NODE_ENV === "production";
  },
};
