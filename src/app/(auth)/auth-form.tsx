"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { loginAction, signupAction, type AuthState } from "./actions";

export function AuthForm({ mode, next, isGuest }: { mode: "login" | "signup"; next?: string; isGuest?: boolean }) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    mode === "login" ? loginAction : signupAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {mode === "signup" ? (
        <Field label="Name" optional>
          {(p) => <Input {...p} name="name" autoComplete="name" defaultValue={state.fields?.name} placeholder="Jordan Lee" />}
        </Field>
      ) : null}
      <Field label="Email">
        {(p) => (
          <Input
            {...p}
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue={state.fields?.email}
            placeholder="you@example.com"
          />
        )}
      </Field>
      <Field label="Password" hint={mode === "signup" ? "At least 8 characters." : undefined}>
        {(p) => (
          <Input
            {...p}
            name="password"
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            required
            minLength={mode === "signup" ? 8 : undefined}
          />
        )}
      </Field>
      {state.error ? (
        <p role="alert" className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" size="lg" className="w-full" loading={pending}>
        {mode === "login" ? "Log in" : isGuest ? "Save my account" : "Create account"}
      </Button>
      <p className="pt-2 text-center text-sm text-ink-3">
        {mode === "login" ? (
          <>
            New here?{" "}
            <Link href={`/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-ink underline-offset-4 hover:underline">
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-ink underline-offset-4 hover:underline">
              Log in
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
