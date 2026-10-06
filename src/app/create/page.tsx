import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { CreateForm } from "./create-form";

export const metadata: Metadata = { title: "Create a tour", robots: { index: false } };

export default function CreatePage() {
  return (
    <div className="min-h-dvh">
      <header className="flex items-center justify-between px-5 py-5 sm:px-8">
        <Logo />
        <Link href="/app" className="text-sm font-medium text-ink-3 hover:text-ink">
          My tours
        </Link>
      </header>
      <main className="mx-auto max-w-xl px-5 pb-20 pt-6 sm:pt-12">
        <p className="text-sm font-medium text-ink-4">Step 1 of 6</p>
        <h1 className="mt-2 font-display text-[44px] leading-[1.05] text-ink">Tell us about the property</h1>
        <p className="mb-9 mt-3 text-[15px] leading-relaxed text-ink-3">
          Takes 30 seconds. No account needed — you can save your work with an email any time.
        </p>
        <CreateForm />
      </main>
    </div>
  );
}
