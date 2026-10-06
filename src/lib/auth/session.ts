import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { cache } from "react";
import { db } from "@/lib/db";
import { sessions, users, type User } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { newId } from "@/lib/ids";

export const SESSION_COOKIE = "ht_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 90; // 90 days
const REFRESH_WHEN_LEFT_MS = 1000 * 60 * 60 * 24 * 30;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Current user from the session cookie (memoized per request). Read-only: safe in Server Components. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const rows = await db
    .select({ user: users, expiresAt: sessions.expiresAt })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, hashToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return rows[0]?.user ?? null;
});

/** Creates a session and sets the cookie. Only callable from Server Actions / Route Handlers. */
export async function startSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessions).values({ id: hashToken(token), userId, expiresAt });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** Extends long-lived sessions that are close to expiring (Server Actions / Route Handlers only). */
export async function refreshSessionIfNeeded(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return;
  const id = hashToken(token);
  const [row] = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
  if (!row || row.expiresAt.getTime() - Date.now() > REFRESH_WHEN_LEFT_MS) return;
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.update(sessions).set({ expiresAt }).where(eq(sessions.id, id));
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
  store.delete(SESSION_COOKIE);
}

/**
 * Returns the signed-in user, creating a guest account on the fly so anyone can start
 * building a tour without a signup wall. Server Actions / Route Handlers only.
 */
export async function ensureUser(): Promise<User> {
  const existing = await getCurrentUser();
  if (existing) return existing;
  const id = newId();
  const [user] = await db.insert(users).values({ id, isGuest: true }).returning();
  await startSession(id);
  return user;
}

export function isAdmin(user: Pick<User, "email" | "isGuest"> | null): boolean {
  if (!user || user.isGuest || !user.email) return false;
  return env.adminEmails.includes(user.email.toLowerCase());
}
