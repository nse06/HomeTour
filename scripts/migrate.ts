/**
 * Applies pending SQL migrations from ./drizzle. Safe to run on every boot.
 *   npm run db:migrate
 */
import { migrate } from "drizzle-orm/libsql/migrator";
import { db, getDbClient } from "../src/lib/db";
import { env } from "../src/lib/env";

async function main() {
  if (env.databaseUrl.startsWith("file:")) {
    // WAL gives concurrent readers while the app writes; persisted in the db file.
    await getDbClient().execute("PRAGMA journal_mode=WAL");
  }
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log(`✓ Database migrated (${env.databaseUrl.replace(/\/\/.*@/, "//***@")})`);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
