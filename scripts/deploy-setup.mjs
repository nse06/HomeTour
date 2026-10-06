/**
 * Runs before `next build`. On Vercel it verifies that a hosted database and media storage
 * are connected — failing the build with instructions instead of shipping a site that errors
 * on every request — then applies migrations and seeds the example tour (both idempotent).
 * Elsewhere it does nothing, so local `npm run build` stays side-effect free.
 *   node scripts/deploy-setup.mjs --force   # run the same steps outside Vercel
 */
import { spawnSync } from "node:child_process";

if (!process.env.VERCEL && !process.argv.includes("--force")) process.exit(0);

const env = process.env;
const dbUrl = env.DATABASE_URL || env.TURSO_DATABASE_URL || env.TURSO_CONNECTION_URL || "";
const hasBlob = Boolean(env.BLOB_READ_WRITE_TOKEN || env.BLOB_STORE_ID);
const storage = env.STORAGE_DRIVER || (hasBlob ? "blob" : "local");

const problems = [];
if (!dbUrl || dbUrl.startsWith("file:")) {
  problems.push(
    "Database — connect Turso to this project (Storage → Turso), or set DATABASE_URL and DATABASE_AUTH_TOKEN.",
  );
} else if (!(env.DATABASE_AUTH_TOKEN || env.TURSO_AUTH_TOKEN) && /^libsql:|turso\.io/.test(dbUrl)) {
  problems.push("Database — the Turso URL is set but its auth token isn't (TURSO_AUTH_TOKEN or DATABASE_AUTH_TOKEN).");
}
if (storage === "local") {
  problems.push(
    "Media storage — create a Blob store and connect it to this project (Storage → Blob), or set STORAGE_DRIVER=s3 with the S3_* settings.",
  );
} else if (storage === "blob" && !hasBlob) {
  problems.push("Media storage — STORAGE_DRIVER=blob but no Blob store is connected (BLOB_READ_WRITE_TOKEN is missing).");
} else if (storage === "s3" && !env.S3_BUCKET) {
  problems.push("Media storage — STORAGE_DRIVER=s3 needs S3_BUCKET (plus S3_ENDPOINT, keys and S3_PUBLIC_URL).");
}

if (problems.length) {
  console.error(
    [
      "",
      "✗ HomeTour isn't fully set up for this deployment yet:",
      ...problems.map((p) => `  • ${p}`),
      "",
      "  Add them in the Vercel dashboard, then redeploy. Details: README → Deploying to Vercel.",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

const host = (() => {
  try {
    return new URL(dbUrl.replace(/^libsql:/, "https:")).host;
  } catch {
    return "configured";
  }
})();
console.log(`HomeTour deploy setup · database: ${host} · media storage: ${storage}`);

for (const script of ["scripts/migrate.ts", "scripts/seed.ts"]) {
  const result = spawnSync("npx", ["tsx", script], { stdio: "inherit", env });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
