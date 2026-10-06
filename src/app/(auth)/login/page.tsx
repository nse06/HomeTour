import type { Metadata } from "next";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Log in", robots: { index: false } };

export default async function LoginPage(props: PageProps<"/login">) {
  const { next } = await props.searchParams;
  return (
    <>
      <h1 className="font-display text-4xl text-ink">Welcome back</h1>
      <p className="mb-8 mt-2 text-[15px] text-ink-3">Log in to manage your tours.</p>
      <AuthForm mode="login" next={typeof next === "string" ? next : undefined} />
    </>
  );
}
