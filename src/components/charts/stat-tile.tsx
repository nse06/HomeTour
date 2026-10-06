import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** label · value · optional signed delta vs a named period. */
export function StatTile({
  label,
  value,
  delta,
  hint,
  className,
}: {
  label: string;
  value: string;
  delta?: { pct: number; period: string } | null;
  hint?: string;
  className?: string;
}) {
  const up = delta && delta.pct >= 0;
  return (
    <div className={cn("rounded-3xl bg-surface p-5 ring-1 ring-line", className)}>
      <p className="text-sm text-ink-3">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-ink">{value}</p>
      {delta ? (
        <p className={cn("mt-1.5 inline-flex items-center gap-1 text-xs font-medium", up ? "text-success" : "text-danger")}>
          {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
          {up ? "+" : "−"}
          {Math.abs(Math.round(delta.pct))}% <span className="font-normal text-ink-4">vs {delta.period}</span>
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-ink-4">{hint}</p>
      ) : null}
    </div>
  );
}
