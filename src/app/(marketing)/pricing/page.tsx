import { ArrowRight, Check } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { PER_TOUR_PRICE, PLANS } from "@/lib/plans";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Pricing",
  description: "HomeTour is free during early access. See planned pricing for Pro, Realtor/Business and single tours.",
  alternates: { canonical: "/pricing" },
};

export default function PricingPage() {
  const plans = Object.values(PLANS);
  return (
    <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <p className="inline-flex items-center rounded-full bg-success-soft px-3 py-1 text-sm font-medium text-success">
          Early access: everything is free right now
        </p>
        <h1 className="mt-6 font-display text-5xl leading-[1.03] text-ink sm:text-6xl">Simple pricing, when it arrives.</h1>
        <p className="mt-5 text-lg leading-relaxed text-ink-3">
          Creating and sharing tours will always be free. Paid plans add polish and power for people who make a lot of them.
        </p>
      </div>

      <div className="mt-14 grid gap-5 lg:grid-cols-3">
        {plans.map((plan) => {
          const featured = plan.id === "pro";
          return (
            <div
              key={plan.id}
              className={cn(
                "flex flex-col rounded-3xl p-8 ring-1",
                featured ? "bg-ink text-white ring-ink shadow-float" : "bg-surface ring-line shadow-soft",
              )}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{plan.name}</h2>
                {featured ? <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium">Most popular</span> : null}
              </div>
              <p className="mt-5 flex items-baseline gap-1">
                <span className="font-display text-5xl">${plan.priceMonthly}</span>
                <span className={featured ? "text-white/60" : "text-ink-3"}>/month</span>
              </p>
              <p className={cn("mt-3 text-[15px]", featured ? "text-white/70" : "text-ink-3")}>{plan.tagline}</p>
              <ul className="mt-7 space-y-3 text-[15px]">
                {plan.highlights.map((h) => (
                  <li key={h} className="flex gap-2.5">
                    <Check className={cn("mt-0.5 h-5 w-5 shrink-0", featured ? "text-[#e9a58f]" : "text-success")} />
                    {h}
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-8">
                <Link href="/create" className={buttonClasses(featured ? "glass" : "primary", "md", "w-full")}>
                  Start free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-3xl bg-surface p-8 ring-1 ring-line sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-semibold text-ink">Just one property?</h2>
          <p className="mt-1 text-[15px] text-ink-3">
            Buy a single tour for ${PER_TOUR_PRICE}, once. Pro features for that tour, no subscription.
          </p>
        </div>
        <Link href="/create" className={buttonClasses("secondary", "md")}>
          Create your tour
        </Link>
      </div>
    </div>
  );
}
