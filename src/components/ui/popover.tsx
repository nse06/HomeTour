"use client";

import { Popover as P } from "radix-ui";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const Popover = P.Root;
export const PopoverTrigger = P.Trigger;
export const PopoverClose = P.Close;

export function PopoverContent({
  children,
  className,
  align = "center",
  side = "bottom",
}: {
  children: ReactNode;
  className?: string;
  align?: "start" | "center" | "end";
  side?: "top" | "bottom" | "left" | "right";
}) {
  return (
    <P.Portal>
      <P.Content
        align={align}
        side={side}
        sideOffset={8}
        collisionPadding={12}
        className={cn("z-50 w-72 rounded-2xl bg-surface p-4 shadow-lift ring-1 ring-line outline-none data-[state=open]:animate-scale-in", className)}
      >
        {children}
      </P.Content>
    </P.Portal>
  );
}
