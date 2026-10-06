import { mkdirSync } from "node:fs";
import path from "node:path";
import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { env } from "@/lib/env";
import * as schema from "./schema";

export type Db = LibSQLDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { __hometourDb?: { client: Client; db: Db } };

function create() {
  const url = env.databaseUrl;
  if (url.startsWith("file:")) {
    const file = url.slice("file:".length);
    mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  }
  const client = createClient({ url, authToken: env.databaseAuthToken });
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
