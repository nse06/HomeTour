import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-3xl bg-surface ring-1 ring-line shadow-soft", className)} {...props} />;
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "accent" | "danger" | "dark";
  className?: string;
}) {
  const tones = {
    neutral: "bg-sunken text-ink-2",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    accent: "bg-accent-soft text-accent",
    danger: "bg-danger-soft text-danger",
    dark: "bg-ink/80 text-white backdrop-blur",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", tones[tone], className)}>
      {children}
    </span>
  );
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-sunken", className)} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-ink transition-[width] duration-300 ease-out" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  children,
  action,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      {icon ? <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sunken text-ink-3 [&>svg]:h-6 [&>svg]:w-6">{icon}</div> : null}
      <h3 className="text-lg font-semibold tracking-tight text-ink">{title}</h3>
      {children ? <div className="mt-1.5 max-w-sm text-[15px] text-ink-3">{children}</div> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded-md bg-sunken px-1.5 py-0.5 font-sans text-[11px] font-medium text-ink-3 ring-1 ring-line">{children}</kbd>;
}
