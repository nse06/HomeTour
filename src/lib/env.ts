/**
 * Centralized, typed access to runtime configuration.
 * Every setting has a sensible default so `npm run dev` works with zero config.
 */

function bool(value: string | undefined, fallback = false): boolean {
  if (value === undefined || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

export function getAppUrl(): string {
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  const url = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || (vercel ? `https://${vercel}` : "http://localhost:3000");
  return url.replace(/\/+$/, "");
}

/** Store id for Vercel Blob, from an OIDC-style BLOB_STORE_ID or the read-write token. */
function blobStoreId(): string | null {
  const explicit = process.env.BLOB_STORE_ID?.trim();
  if (explicit) return explicit.replace(/^store_/, "");
  // Token format: vercel_blob_rw_<storeId>_<secret> (the SDK parses it the same way).
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  return token?.split("_")[3] || null;
}

export const env = {
  /** libSQL URL: a local SQLite file by default, or Turso (the Vercel integration sets TURSO_*). */
  get databaseUrl() {
    return process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL || process.env.TURSO_CONNECTION_URL || "file:./.data/hometour.db";
  },
  get databaseAuthToken() {
    return process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN || undefined;
  },

  /** Explicit STORAGE_DRIVER wins; otherwise a connected Vercel Blob store is used automatically. */
  get storageDriver(): "local" | "s3" | "blob" {
    const d = process.env.STORAGE_DRIVER;
    if (d === "s3" || d === "blob" || d === "local") return d;
    return blobStoreId() ? "blob" : "local";
  },
  get storageDir() {
    return process.env.STORAGE_DIR || "./.data/storage";
  },
  blob: {
    get storeId() {
      return blobStoreId();
    },
  },
  /**
   * Largest request body the host accepts. Vercel functions cap bodies at 4.5 MB, so the
   * editor re-encodes bigger images in the browser before uploading. null = no extra cap.
   */
  get uploadBodyLimitBytes(): number | null {
    const explicit = Number(process.env.UPLOAD_BODY_LIMIT_BYTES);
    if (Number.isFinite(explicit) && explicit > 0) return explicit;
    return process.env.VERCEL ? 4_200_000 : null;
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
