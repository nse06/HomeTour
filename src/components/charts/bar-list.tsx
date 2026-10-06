import { cn } from "@/lib/utils";

/**
 * Ranked horizontal bars for one series: label (text ink) above a thin bar in the series
 * color, value at the tip. Values are direct-labeled, so nothing hides behind a hover.
 */
export function BarList({
  items,
  color = "var(--color-accent)",
  empty = "No data yet",
  className,
}: {
  items: { key: string; label: string; value: number; hint?: string }[];
  color?: string;
  empty?: string;
  className?: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (items.length === 0) return <p className={cn("py-6 text-center text-sm text-ink-4", className)}>{empty}</p>;
  return (
    <ul className={cn("space-y-3.5", className)}>
      {items.map((item) => (
        <li key={item.key}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-ink-2">{item.label}</span>
            {item.hint ? <span className="shrink-0 text-xs text-ink-4">{item.hint}</span> : null}
          </div>
          <div className="flex items-center gap-3">
            <div className="h-2.5 flex-1">
              <div
                className="h-full rounded-r-[4px]"
                style={{ width: `${Math.max(1.5, (item.value / max) * 100)}%`, backgroundColor: color }}
                role="img"
                aria-label={`${item.label}: ${item.value}`}
              />
            </div>
            <span className="w-10 shrink-0 text-right text-sm font-semibold tabular-nums text-ink">{item.value.toLocaleString()}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
