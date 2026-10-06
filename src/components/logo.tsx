import Link from "next/link";
import { cn } from "@/lib/utils";

/** House outline with a "you are here" hotspot: the product in one glyph. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("h-8 w-8", className)} aria-hidden="true">
      <rect width="32" height="32" rx="9" className="fill-ink" />
      <path
        d="M8.5 14.6 16 8.5l7.5 6.1V23a1.5 1.5 0 0 1-1.5 1.5h-12A1.5 1.5 0 0 1 8.5 23v-8.4Z"
        fill="none"
        stroke="white"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="18" r="2.6" className="fill-accent" />
    </svg>
  );
}

export function Logo({ href = "/", className, light = false }: { href?: string; className?: string; light?: boolean }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2.5", className)} aria-label="HomeTour home">
      <LogoMark />
      <span className={cn("text-[17px] font-semibold tracking-tight", light ? "text-white" : "text-ink")}>HomeTour</span>
    </Link>
  );
}
