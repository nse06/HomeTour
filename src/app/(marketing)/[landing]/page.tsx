/* eslint-disable @next/next/no-img-element -- static, pre-optimized marketing assets */
import { ArrowRight, Check, Play } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonClasses } from "@/components/ui/button";
import { getLandingPage, LANDING_PAGES } from "@/content/landing-pages";
import { DEMO_PATH } from "@/lib/demo";

/** Only the pages defined in content/landing-pages.ts exist; everything else 404s. */
export const dynamicParams = false;

export function generateStaticParams() {
  return LANDING_PAGES.map((p) => ({ landing: p.slug }));
}

export async function generateMetadata(props: PageProps<"/[landing]">): Promise<Metadata> {
  const { landing } = await props.params;
  const page = getLandingPage(landing);
  if (!page) return {};
  return {
    title: { absolute: `${page.title} · HomeTour` },
    description: page.description,
    alternates: { canonical: `/${page.slug}` },
    openGraph: { title: page.title, description: page.description, images: [page.heroImage] },
  };
}

export default async function LandingPage(props: PageProps<"/[landing]">) {
  const { landing } = await props.params;
  const page = getLandingPage(landing);
  if (!page) notFound();

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: page.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }} />
      <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-2">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-ink-4">{page.eyebrow}</p>
          <h1 className="mt-4 font-display text-5xl leading-[1.03] text-ink sm:text-6xl">{page.h1}</h1>
          <p className="mt-6 text-lg leading-relaxed text-ink-3">{page.intro}</p>
          <p className="mt-4 text-[15px] font-medium text-ink-2">{page.audience}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/create" className={buttonClasses("primary", "lg")}>
              Create a Tour
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href={DEMO_PATH} className={buttonClasses("secondary", "lg")}>
              <Play className="h-4 w-4 fill-current" />
              See an Example
            </Link>
          </div>
        </div>
        <div className="overflow-hidden rounded-[32px] shadow-lift ring-1 ring-black/5">
          <img src={page.heroImage} alt="" className="aspect-[4/3] w-full object-cover" />
        </div>
      </section>

      <section className="border-y border-line bg-surface">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-16 sm:px-8 md:grid-cols-3">
          {page.points.map((p) => (
            <div key={p.title}>
              <h2 className="text-lg font-semibold tracking-tight text-ink">{p.title}</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-3">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <h2 className="font-display text-4xl text-ink">How it works</h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {page.steps.map((s, i) => (
            <li key={s} className="flex items-center gap-4 rounded-2xl bg-surface p-5 ring-1 ring-line">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white">{i + 1}</span>
              <span className="text-[15px] font-medium text-ink-2">{s}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-3xl px-5 pb-24 sm:px-8">
        <h2 className="font-display text-4xl text-ink">Questions</h2>
        <div className="mt-6 space-y-6">
          {page.faq.map((f) => (
            <div key={f.q}>
              <h3 className="font-semibold text-ink">{f.q}</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-ink-3">{f.a}</p>
            </div>
          ))}
        </div>
        <ul className="mt-10 flex flex-wrap gap-2">
          {LANDING_PAGES.filter((p) => p.slug !== page.slug).map((p) => (
            <li key={p.slug}>
              <Link href={`/${p.slug}`} className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3.5 py-1.5 text-sm text-ink-2 ring-1 ring-line hover:text-ink">
                <Check className="h-3.5 w-3.5" />
                {p.eyebrow}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
