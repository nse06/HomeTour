"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { endSession, getCurrentUser, startSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { properties, users } from "@/lib/db/schema";
import { newId } from "@/lib/ids";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export interface AuthState {
  error?: string;
  fields?: { email?: string; name?: string };
}

const credentials = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(8, "Use at least 8 characters.").max(200),
  name: z.string().trim().max(80).optional(),
});

function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/app";
}

export async function signupAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const parsed = credentials.safeParse({
    email: form.get("email"),
    password: form.get("password"),
    name: form.get("name") || undefined,
  });
  const fields = { email: String(form.get("email") ?? ""), name: String(form.get("name") ?? "") };
  if (!parsed.success) return { error: parsed.error.issues[0]?.message, fields };
  const { email, password, name } = parsed.data;

  const limited = rateLimit(`signup:${clientIp(await headers())}`, 10, 60 * 60 * 1000);
  if (!limited.ok) return { error: "Too many attempts. Please try again later.", fields };

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) return { error: "An account with this email already exists. Try logging in.", fields };

  const passwordHash = await hashPassword(password);
  const current = await getCurrentUser();
  if (current?.isGuest) {
    // Upgrade the guest in place: every tour they built stays theirs.
    await db.update(users).set({ email, passwordHash, name: name ?? null, isGuest: false }).where(eq(users.id, current.id));
  } else {
    const id = newId();
    await db.insert(users).values({ id, email, passwordHash, name: name ?? null, isGuest: false });
    await startSession(id);
  }
  redirect(safeNext(form.get("next")));
}

export async function loginAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const fields = { email };
  if (!email || !password) return { error: "Enter your email and password.", fields };

  const ip = clientIp(await headers());
  const limited = rateLimit(`login:${ip}:${email}`, 8, 15 * 60 * 1000);
  if (!limited.ok) return { error: "Too many attempts. Please wait a few minutes and try again.", fields };

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const ok = user?.passwordHash ? await verifyPassword(password, user.passwordHash) : false;
  if (!user || !ok) return { error: "That email and password don't match.", fields };

  const current = await getCurrentUser();
  if (current?.isGuest && current.id !== user.id) {
    // Claim anything built as a guest before logging in, then drop the guest.
    await db.update(properties).set({ ownerId: user.id }).where(eq(properties.ownerId, current.id));
    await endSession();
    await db.delete(users).where(eq(users.id, current.id));
  }
  await startSession(user.id);
  redirect(safeNext(form.get("next")));
}

export async function logoutAction(): Promise<void> {
  await endSession();
  redirect("/");
}
