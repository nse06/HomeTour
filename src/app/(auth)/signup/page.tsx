import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/session";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Create your account", robots: { index: false } };

export default async function SignupPage(props: PageProps<"/signup">) {
  const { next } = await props.searchParams;
  const user = await getCurrentUser();
  const isGuest = Boolean(user?.isGuest);
  return (
    <>
      <h1 className="font-display text-4xl text-ink">{isGuest ? "Save your work" : "Create your account"}</h1>
      <p className="mb-8 mt-2 text-[15px] text-ink-3">
        {isGuest
          ? "Add an email and password so you can come back to your tours from any device."
          : "Free to start. No credit card required."}
      </p>
      <AuthForm mode="signup" next={typeof next === "string" ? next : undefined} isGuest={isGuest} />
    </>
  );
}
