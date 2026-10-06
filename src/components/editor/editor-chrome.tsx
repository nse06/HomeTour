"use client";

import { ArrowLeft, Check, Cloud, Eye, Globe, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { buttonClasses } from "@/components/ui/button";
import type { AiStatus } from "@/lib/ai/status";
import { cn } from "@/lib/utils";
import { EDITOR_STEPS, stepCompletion } from "./steps";
import { useEditor } from "./store";

const ChromeContext = createContext<{ ai: AiStatus; isGuest: boolean }>({
  ai: { provider: "off", available: false },
  isGuest: true,
});

export const useChrome = () => useContext(ChromeContext);

export function EditorChrome({ children, ai, isGuest }: { children: ReactNode; ai: AiStatus; isGuest: boolean }) {
  const property = useEditor((s) => s.graph.property);
  const tour = useEditor((s) => s.graph.tour);
  const graph = useEditor((s) => s.graph);
  const pathname = usePathname();
  const base = `/app/p/${property.id}`;
  const done = stepCompletion(graph);
  const current = EDITOR_STEPS.find((s) => pathname.startsWith(`${base}/${s.slug}`))?.slug;

  return (
    <ChromeContext.Provider value={{ ai, isGuest }}>
      <div className="flex min-h-dvh flex-col">
        <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur-xl">
          <div className="flex h-14 items-center gap-2 px-3 sm:gap-3 sm:px-5">
            <Link
              href="/app"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-sunken"
              aria-label="Back to my tours"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold tracking-tight text-ink">{property.name}</p>
              <SaveStatus />
            </div>
            {tour.status === "published" ? (
              <a
                href={`/t/${tour.slug}`}
                target="_blank"
                rel="noreferrer"
                className="hidden items-center gap-1.5 rounded-full bg-success-soft px-3 py-1.5 text-xs font-medium text-success sm:inline-flex"
              >
                <Globe className="h-3.5 w-3.5" />
                Live
              </a>
            ) : null}
            <Link href={`${base}/preview`} target="_blank" className={buttonClasses("secondary", "sm", "hidden sm:inline-flex")}>
              <Eye className="h-4 w-4" />
              Preview
            </Link>
            <Link href={`${base}/publish`} className={buttonClasses("primary", "sm")}>
              {tour.status === "published" ? "Share" : "Publish"}
            </Link>
          </div>
          <nav aria-label="Tour setup steps" className="scrollbar-none flex gap-1 overflow-x-auto px-3 pb-2.5 sm:justify-center sm:px-5">
            {EDITOR_STEPS.map((step, i) => {
              const active = current === step.slug;
              return (
                <Link
                  key={step.slug}
                  href={`${base}/${step.slug}`}
                  aria-current={active ? "step" : undefined}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3.5 text-[13px] font-medium transition-colors",
                    active ? "bg-ink text-white" : "text-ink-3 hover:bg-sunken hover:text-ink",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full text-[11px]",
                      active ? "bg-white/20" : done[step.slug] ? "bg-success-soft text-success" : "bg-sunken",
                    )}
                  >
                    {done[step.slug] && !active ? <Check className="h-3 w-3" strokeWidth={3} /> : i + 1}
                  </span>
                  {step.label}
                </Link>
              );
            })}
          </nav>
        </header>
        {isGuest ? <GuestBanner /> : null}
        <div className="flex-1">{children}</div>
      </div>
    </ChromeContext.Provider>
  );
}

function SaveStatus() {
  const pending = useEditor((s) => s.pending);
  const savedAt = useEditor((s) => s.savedAt);
  const uploading = useEditor((s) => s.uploads.some((u) => u.status === "uploading" || u.status === "processing" || u.status === "queued"));
  if (pending > 0 || uploading) {
    return (
      <p className="flex items-center gap-1 text-xs text-ink-3">
        <LoaderCircle className="h-3 w-3 animate-spin" />
        {uploading ? "Uploading…" : "Saving…"}
      </p>
    );
  }
  if (savedAt) {
    return (
      <p className="flex items-center gap-1 text-xs text-ink-4">
        <Cloud className="h-3 w-3" />
        All changes saved
      </p>
    );
  }
  return <p className="text-xs text-ink-4">Draft · changes save automatically</p>;
}

function GuestBanner() {
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    try {
      setHidden(sessionStorage.getItem("ht_guest_banner") === "0");
    } catch {
      setHidden(false);
    }
  }, []);
  if (hidden) return null;
  return (
    <div className="flex items-center justify-center gap-3 bg-accent-soft px-4 py-2 text-center text-[13px] text-ink-2">
      <span>You&apos;re working as a guest.</span>
      <Link href="/signup?next=/app" className="font-semibold text-ink underline-offset-4 hover:underline">
        Save your work with an email
      </Link>
      <button
        type="button"
        className="text-ink-3 hover:text-ink"
        onClick={() => {
          setHidden(true);
          try {
            sessionStorage.setItem("ht_guest_banner", "0");
          } catch {
            /* ignore */
          }
        }}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
