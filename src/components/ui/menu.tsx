"use client";

import { DropdownMenu as M } from "radix-ui";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const Menu = M.Root;
export const MenuTrigger = M.Trigger;

export function MenuContent({
  children,
  align = "end",
  className,
}: {
  children: ReactNode;
  align?: "start" | "center" | "end";
  className?: string;
}) {
  return (
    <M.Portal>
      <M.Content
        align={align}
        sideOffset={6}
        className={cn(
          "z-50 min-w-48 rounded-2xl bg-surface p-1.5 shadow-lift ring-1 ring-line data-[state=open]:animate-scale-in",
          className,
        )}
      >
        {children}
      </M.Content>
    </M.Portal>
  );
}

export function MenuItem({
  children,
  onSelect,
  destructive,
  disabled,
  icon,
}: {
  children: ReactNode;
  onSelect?: (e: Event) => void;
  destructive?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
}) {
  return (
    <M.Item
      disabled={disabled}
      onSelect={onSelect}
      className={cn(
        "flex cursor-pointer select-none items-center gap-2.5 rounded-xl px-3 py-2 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
        destructive ? "text-danger data-[highlighted]:bg-danger-soft" : "text-ink-2 data-[highlighted]:bg-sunken data-[highlighted]:text-ink",
      )}
    >
      {icon ? <span className="flex h-4 w-4 items-center justify-center [&>svg]:h-4 [&>svg]:w-4">{icon}</span> : null}
      {children}
    </M.Item>
  );
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <M.Label className="px-3 pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-ink-4">{children}</M.Label>;
}

export function MenuSeparator() {
  return <M.Separator className="my-1 h-px bg-line" />;
}

export const MenuSub = M.Sub;

export function MenuSubTrigger({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <M.SubTrigger className="flex cursor-pointer select-none items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-ink-2 outline-none data-[highlighted]:bg-sunken data-[state=open]:bg-sunken">
      {icon ? <span className="flex h-4 w-4 items-center justify-center [&>svg]:h-4 [&>svg]:w-4">{icon}</span> : null}
      <span className="flex-1">{children}</span>
      <span aria-hidden="true" className="text-ink-4">›</span>
    </M.SubTrigger>
  );
}

export function MenuSubContent({ children }: { children: ReactNode }) {
  return (
    <M.Portal>
      <M.SubContent
        sideOffset={4}
        className="z-50 max-h-80 min-w-48 overflow-y-auto rounded-2xl bg-surface p-1.5 shadow-lift ring-1 ring-line data-[state=open]:animate-scale-in"
      >
        {children}
      </M.SubContent>
    </M.Portal>
  );
}
