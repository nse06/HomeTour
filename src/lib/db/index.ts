import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import type { Client } from "@libsql/client";
import { createClient as createRemoteClient } from "@libsql/client/web";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { env } from "@/lib/env";
import * as schema from "./schema";

export type Db = LibSQLDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { __hometourDb?: { client: Client; db: Db } };

function createLibsqlClient(url: string): Client {
  if (url.startsWith("file:")) {
    if (process.env.VERCEL) {
      throw new Error(
        "No database configured: serverless hosts have no persistent disk. Connect Turso to the project " +
          "(or set DATABASE_URL and DATABASE_AUTH_TOKEN) and redeploy.",
      );
    }
    const file = url.slice("file:".length);
    mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
    // The native SQLite driver is loaded only for local files, so deployments that talk to
    // Turso over HTTP never need its platform-specific binary.
    const require = createRequire(import.meta.url);
    const { createClient } = require("@libsql/client/sqlite3") as typeof import("@libsql/client/sqlite3");
    return createClient({ url });
  }
  return createRemoteClient({ url, authToken: env.databaseAuthToken });
}

function create() {
  const client = createLibsqlClient(env.databaseUrl);
  const db = drizzle(client, { schema });
  return { client, db };
}

function instance() {
  if (!globalForDb.__hometourDb) globalForDb.__hometourDb = create();
  return globalForDb.__hometourDb;
}

/**
 * Lazily-initialized Drizzle database (SQLite locally, libSQL/Turso in production).
 * A Proxy keeps `import { db }` ergonomic while deferring the connection until first use.
 */
export const db: Db = new Proxy({} as Db, {
  get(_target, prop) {
    const real = instance().db;
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export function getDbClient(): Client {
  return instance().client;
}

export { schema };
