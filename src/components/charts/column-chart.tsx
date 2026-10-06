"use client";

import { useEffect, useRef, useState } from "react";

export interface ColumnDatum {
  key: string;
  label: string;
  value: number;
}

/** 1-2-5 "nice" ceiling for clean axis ticks. */
export function niceMax(value: number): number {
  if (value <= 4) return 4;
  const exp = Math.pow(10, Math.floor(Math.log10(value)));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * exp >= value) return m * exp;
  return 10 * exp;
}

/** Path for a column with a 4px rounded data-end and a square baseline. */
function columnPath(x: number, y: number, w: number, h: number): string {
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

/**
 * Single-series column chart (no legend: the card title names the series).
 * Thin columns (≤24px), hairline solid grid, per-column hover/focus tooltip, table fallback.
 */
export function ColumnChart({
  data,
  height = 220,
  color = "var(--color-accent)",
  valueLabel = "views",
  ariaLabel,
}: {
  data: ColumnDatum[];
  height?: number;
  color?: string;
  valueLabel?: string;
  ariaLabel: string;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const m = { top: 14, right: 8, bottom: 26, left: 34 };
  const innerW = width - m.left - m.right;
  const innerH = height - m.top - m.bottom;
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const ticks = [0, max / 2, max];
  const band = innerW / Math.max(1, data.length);
  const colW = Math.min(24, Math.max(3, band - 2));
  const y = (v: number) => m.top + innerH - (v / max) * innerH;
  const labelEvery = Math.max(1, Math.ceil(data.length / (width < 480 ? 4 : 6)));

  return (
    <div ref={wrap} className="relative w-full">
      <svg width={width} height={height} role="img" aria-label={ariaLabel} className="block overflow-visible">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={m.left} x2={width - m.right} y1={y(t)} y2={y(t)} stroke="var(--color-line)" strokeWidth="1" shapeRendering="crispEdges" />
            <text x={m.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize="11" fill="var(--color-ink-4)" style={{ fontVariantNumeric: "tabular-nums" }}>
              {Number.isInteger(t) ? t.toLocaleString() : t.toFixed(1)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = m.left + i * band + (band - colW) / 2;
          const h = Math.max(0, m.top + innerH - y(d.value));
          return (
            <g key={d.key}>
              {d.value > 0 ? (
                <path d={columnPath(x, y(d.value), colW, h)} fill={color} opacity={hover === null || hover === i ? 1 : 0.55} />
              ) : null}
              <rect
                x={m.left + i * band}
                y={m.top}
                width={band}
                height={innerH}
                fill="transparent"
                tabIndex={0}
                role="button"
                aria-label={`${d.label}: ${d.value} ${valueLabel}`}
                onPointerEnter={() => setHover(i)}
                onPointerLeave={() => setHover((h0) => (h0 === i ? null : h0))}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                className="outline-none"
              />
              {i % labelEvery === 0 || i === data.length - 1 ? (
                <text x={m.left + i * band + band / 2} y={height - 6} textAnchor="middle" fontSize="11" fill="var(--color-ink-4)">
                  {d.label}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      {hover !== null && data[hover] ? (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-xl bg-surface px-3 py-2 shadow-lift ring-1 ring-line"
          style={{ left: m.left + hover * band + band / 2, top: Math.max(0, y(data[hover].value) - 8) }}
        >
          <p className="text-base font-semibold text-ink">{data[hover].value.toLocaleString()}</p>
          <p className="whitespace-nowrap text-xs text-ink-3">
            {valueLabel} · {data[hover].label}
          </p>
        </div>
      ) : null}
      <details className="mt-2 text-sm text-ink-3">
        <summary className="cursor-pointer select-none text-xs font-medium text-ink-4 hover:text-ink-2">View as table</summary>
        <div className="mt-2 max-h-56 overflow-auto rounded-xl ring-1 ring-line">
          <table className="w-full text-left text-sm">
            <thead className="bg-sunken text-xs text-ink-3">
              <tr>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 text-right font-medium capitalize">{valueLabel}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.key} className="border-t border-line">
                  <td className="px-3 py-1.5 text-ink-2">{d.label}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-ink">{d.value.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
