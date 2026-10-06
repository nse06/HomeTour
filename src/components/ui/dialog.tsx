"use client";

import { Dialog as D } from "radix-ui";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

export function DialogContent({
  title,
  description,
  children,
  className,
  hideTitle = false,
  size = "md",
}: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  hideTitle?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const width = { sm: "sm:max-w-md", md: "sm:max-w-lg", lg: "sm:max-w-2xl", xl: "sm:max-w-4xl" }[size];
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-[2px] data-[state=open]:animate-fade-in" />
      <D.Content
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-3xl bg-surface p-6 shadow-float outline-none data-[state=open]:animate-slide-in-up",
          "sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-[calc(100%-2rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:p-8 sm:data-[state=open]:animate-scale-in",
          width,
          className,
        )}
      >
        <div className={cn("mb-5 pr-8", hideTitle && "sr-only")}>
          <D.Title className="text-xl font-semibold tracking-tight text-ink">{title}</D.Title>
          {description ? <D.Description className="mt-1.5 text-[15px] text-ink-3">{description}</D.Description> : null}
        </div>
        {!description ? <D.Description className="sr-only">{typeof title === "string" ? title : "Dialog"}</D.Description> : null}
        {children}
        <D.Close
          className="absolute right-4 top-4 rounded-full p-2 text-ink-3 transition-colors hover:bg-sunken hover:text-ink"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </D.Close>
      </D.Content>
    </D.Portal>
  );
}
