import Link from "next/link";
import { Logo } from "@/components/logo";
import { buttonClasses } from "@/components/ui/button";
import { DEMO_PATH } from "@/lib/demo";
import { HeaderAuthLink } from "./header-auth";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/60 bg-canvas/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
        <Logo />
        <nav className="hidden items-center gap-1 text-[15px] text-ink-2 md:flex" aria-label="Main">
          <Link href="/#how-it-works" className="rounded-full px-3.5 py-2 transition-colors hover:bg-sunken hover:text-ink">
            How it works
          </Link>
          <Link href={DEMO_PATH} className="rounded-full px-3.5 py-2 transition-colors hover:bg-sunken hover:text-ink">
            Example tour
          </Link>
          <Link href="/pricing" className="rounded-full px-3.5 py-2 transition-colors hover:bg-sunken hover:text-ink">
            Pricing
          </Link>
        </nav>
        <div className="flex items-center gap-1.5">
          <HeaderAuthLink className="hidden sm:inline-flex" />
          <Link href="/create" className={buttonClasses("primary", "sm")}>
            Create a Tour
          </Link>
        </div>
      </div>
    </header>
  );
}
