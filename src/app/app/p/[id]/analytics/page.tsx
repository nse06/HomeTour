import { eq } from "drizzle-orm";
import { BarChart3, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BarList } from "@/components/charts/bar-list";
import { ColumnChart } from "@/components/charts/column-chart";
import { StatTile } from "@/components/charts/stat-tile";
import { buttonClasses } from "@/components/ui/button";
import { tourReport } from "@/lib/analytics/report";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { properties, tours } from "@/lib/db/schema";
import { can } from "@/lib/plans";
import { cn, formatDuration, formatNumber } from "@/lib/utils";

const RANGES = [7, 30, 90] as const;
const SOURCE_LABELS: Record<string, string> = {
  direct: "Direct & other",
  qr: "QR code",
  share: "Shared link",
  embed: "Website embed",
  link: "Link",
};

export default async function AnalyticsPage(props: PageProps<"/app/p/[id]/analytics">) {
  const { id } = await props.params;
  const { range } = await props.searchParams;
  const days = RANGES.find((r) => String(r) === range) ?? 30;
  const user = await getCurrentUser();
  const [property] = await db.select().from(properties).where(eq(properties.id, id)).limit(1);
  if (!user || !property || property.ownerId !== user.id) notFound();
  const [tour] = await db.select().from(tours).where(eq(tours.propertyId, id)).limit(1);
  if (!tour) notFound();

  if (!can(user, "analytics")) {
    return (
      <div className="mx-auto max-w-xl px-5 py-20 text-center">
        <BarChart3 className="mx-auto h-8 w-8 text-ink-3" />
        <h1 className="mt-4 font-display text-4xl text-ink">Visitor analytics</h1>
        <p className="mt-2 text-ink-3">See who views your tours and which rooms they love. Available on Pro.</p>
        <Link href="/pricing" className={buttonClasses("primary", "md", "mt-6")}>
          See plans
        </Link>
      </div>
    );
  }

  const report = await tourReport(tour.id, id, days);
  const t = report.totals;
  const delta = report.previousViews > 0 ? { pct: ((t.views - report.previousViews) / report.previousViews) * 100, period: `previous ${days} days` } : null;
  const fmtDay = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-4xl text-ink">Visitor analytics</h1>
          <p className="mt-2 text-[15px] text-ink-3">
            {tour.status === "published" ? (
              <>
                How people explore <span className="font-medium text-ink-2">/t/{tour.slug}</span>
              </>
            ) : (
              "This tour isn't published yet — numbers appear once people start visiting."
            )}
          </p>
        </div>
        {/* Filters: one row, above everything they scope. */}
        <nav className="flex gap-1 rounded-full bg-surface p-1 ring-1 ring-line" aria-label="Date range">
          {RANGES.map((r) => (
            <Link
              key={r}
              href={`?range=${r}`}
              scroll={false}
              className={cn("rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors", r === days ? "bg-ink text-white" : "text-ink-3 hover:text-ink")}
              aria-current={r === days ? "page" : undefined}
            >
              {r} days
            </Link>
          ))}
        </nav>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile label="Tour views" value={formatNumber(t.views)} delta={delta} hint={`last ${days} days`} />
        <StatTile label="Unique visits" value={formatNumber(t.sessions)} hint="browser sessions" />
        <StatTile label="Avg. time on tour" value={t.avgDurationMs ? formatDuration(t.avgDurationMs) : "—"} hint="per visit" />
        <StatTile label="CTA clicks" value={formatNumber(t.ctaClicks)} hint={t.views ? `${((t.ctaClicks / t.views) * 100).toFixed(1)}% of views` : "button taps"} />
        <StatTile label="Rooms opened" value={formatNumber(t.roomViews)} hint={t.sessions ? `${(t.roomViews / t.sessions).toFixed(1)} per visit` : undefined} />
        <StatTile label="Photos viewed" value={formatNumber(t.photoViews)} />
        <StatTile label="QR code visits" value={formatNumber(t.qrVisits)} hint="scans that opened the tour" />
        <StatTile label="Shares" value={formatNumber(t.shares)} hint="links copied or shared" />
      </div>

      <section className="mt-6 rounded-3xl bg-surface p-5 ring-1 ring-line sm:p-7">
        <h2 className="font-semibold text-ink">Daily tour views</h2>
        <p className="mb-4 text-sm text-ink-3">Last {days} days</p>
        <ColumnChart
          data={report.daily.map((d) => ({ key: d.date, label: fmtDay(d.date), value: d.views }))}
          ariaLabel={`Daily tour views over the last ${days} days`}
        />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl bg-surface p-5 ring-1 ring-line sm:p-7">
          <h2 className="font-semibold text-ink">Most-viewed rooms</h2>
          <p className="mb-5 text-sm text-ink-3">Times each room was opened</p>
          <BarList items={report.rooms.slice(0, 10).map((r) => ({ key: r.roomId, label: r.name, value: r.views }))} empty="No rooms opened yet" />
        </section>
        <section className="rounded-3xl bg-surface p-5 ring-1 ring-line sm:p-7">
          <h2 className="font-semibold text-ink">Where visitors came from</h2>
          <p className="mb-5 text-sm text-ink-3">Tour views by source</p>
          <BarList
            items={report.sources.map((s) => ({ key: s.source, label: SOURCE_LABELS[s.source] ?? s.source, value: s.views }))}
            empty="No visits yet"
          />
        </section>
      </div>

      <p className="mt-8 flex items-center gap-2 text-sm text-ink-4">
        <ShieldCheck className="h-4 w-4" />
        Anonymous by design: no cookies, no IP addresses, no personal data. Your own previews are never counted.
      </p>
    </div>
  );
}
