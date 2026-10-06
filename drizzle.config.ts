import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL || "file:./.data/hometour.db";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: url.startsWith("libsql:") || url.startsWith("https:") ? "turso" : "sqlite",
  dbCredentials: { url, authToken: process.env.DATABASE_AUTH_TOKEN },
});
