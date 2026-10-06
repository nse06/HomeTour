import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/logo";
import { funnelReport } from "@/lib/analytics/report";
import { getCurrentUser, isAdmin } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin · Funnel", robots: { index: false } };

const RANGES = [7, 30, 90] as const;

/** Product funnel + AI spend. Visible only to ADMIN_EMAILS. */
export default async function AdminPage(props: PageProps<"/admin">) {
  const user = await getCurrentUser();
  if (!isAdmin(user)) notFound();
  const { range } = await props.searchParams;
  const days = RANGES.find((r) => String(r) === range) ?? 30;
  const report = await funnelReport(days);
  const top = Math.max(1, ...report.steps.map((s) => s.actors));

  return (
    <div className="min-h-dvh">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
          <Logo href="/app" />
          <span className="text-sm font-medium text-ink-3">Admin</span>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl text-ink">Product funnel</h1>
            <p className="mt-1 text-sm text-ink-3">Distinct users / sessions reaching each step, last {days} days</p>
          </div>
          <nav className="flex gap-1 rounded-full bg-surface p-1 ring-1 ring-line" aria-label="Date range">
            {RANGES.map((r) => (
              <Link key={r} href={`?range=${r}`} className={cn("rounded-full px-3.5 py-1.5 text-sm font-medium", r === days ? "bg-ink text-white" : "text-ink-3 hover:text-ink")}>
                {r} days
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-8 overflow-hidden rounded-3xl bg-surface ring-1 ring-line">
          <table className="w-full text-left text-sm">
            <thead className="bg-sunken text-xs uppercase tracking-wide text-ink-4">
              <tr>
                <th className="px-5 py-3 font-medium">Step</th>
                <th className="w-1/2 px-5 py-3 font-medium">Reach</th>
                <th className="px-5 py-3 text-right font-medium">Actors</th>
                <th className="px-5 py-3 text-right font-medium">Events</th>
                <th className="px-5 py-3 text-right font-medium">From prev.</th>
              </tr>
            </thead>
            <tbody>
              {report.steps.map((s, i) => {
                const prev = report.steps[i - 1];
                const conv = prev && prev.actors ? `${Math.round((s.actors / prev.actors) * 100)}%` : "—";
                return (
                  <tr key={s.type} className="border-t border-line">
                    <td className="px-5 py-3 text-ink-2">{s.label}</td>
                    <td className="px-5 py-3">
                      <div className="h-2.5 rounded-r-[4px] bg-accent" style={{ width: `${Math.max(1, (s.actors / top) * 100)}%` }} />
                    </td>
                    <td className="px-5 py-3 text-right font-semibold tabular-nums text-ink">{s.actors.toLocaleString()}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-ink-3">{s.count.toLocaleString()}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-ink-3">{conv}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl bg-surface p-5 ring-1 ring-line">
            <p className="text-sm text-ink-3">AI spend (estimated)</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-ink">${report.aiSpendUsd.toFixed(2)}</p>
          </div>
          <div className="rounded-3xl bg-surface p-5 ring-1 ring-line">
            <p className="text-sm text-ink-3">AI requests</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-ink">{report.aiCalls.toLocaleString()}</p>
          </div>
        </div>
      </main>
    </div>
  );
}
