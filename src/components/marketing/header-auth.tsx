"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** Static pages stay static: session state is probed client-side. */
export function HeaderAuthLink({ className }: { className?: string }) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/me")
      .then((r) => r.json())
      .then((d: { user: unknown }) => alive && setSignedIn(Boolean(d.user)))
      .catch(() => alive && setSignedIn(false));
    return () => {
      alive = false;
    };
  }, []);
  return (
    <Link
      href={signedIn ? "/app" : "/login"}
      className={cn(
        "rounded-full px-3.5 py-2 text-[15px] font-medium text-ink-2 transition-colors hover:bg-sunken hover:text-ink",
        signedIn === null && "opacity-0",
        className,
      )}
    >
      {signedIn ? "My tours" : "Log in"}
    </Link>
  );
}
