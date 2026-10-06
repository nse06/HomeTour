/* eslint-disable @next/next/no-img-element -- static, pre-optimized marketing assets */
import {
  ArrowRight,
  Building2,
  Camera,
  ChartColumn,
  Check,
  Code,
  Hammer,
  Hotel,
  House,
  ImagePlus,
  Images,
  KeyRound,
  Map as MapIcon,
  MousePointerClick,
  Palette,
  PartyPopper,
  Play,
  QrCode,
  Rotate3d,
  Send,
  Smartphone,
  Sparkles,
  TreePalm,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { HeroDemo } from "@/components/marketing/hero-demo";
import { TrackOnce } from "@/components/marketing/track";
import { buttonClasses } from "@/components/ui/button";
import { DEMO_PATH } from "@/lib/demo";
import { PER_TOUR_PRICE, PLANS } from "@/lib/plans";

export const metadata: Metadata = {
  title: { absolute: "HomeTour — Turn your property photos into an interactive walkthrough" },
  description:
    "Upload your photos and floor plan. HomeTour organizes everything into a beautiful, clickable property tour for buyers and guests. Free to start.",
  alternates: { canonical: "/" },
};

const AUDIENCES = [
  { label: "Realtors", icon: KeyRound },
  { label: "Airbnb hosts", icon: House },
  { label: "Property managers", icon: Building2 },
  { label: "Hotels", icon: Hotel },
  { label: "Vacation rentals", icon: TreePalm },
  { label: "Home builders", icon: Hammer },
  { label: "Interior designers", icon: Palette },
  { label: "Event venues", icon: PartyPopper },
];

const STEPS = [
  {
    icon: ImagePlus,
    title: "Drop in your photos",
    body: "Add the floor plan and the photos you already have — listing shots, phone photos, even a 360° or a video.",
  },
  {
    icon: Sparkles,
    title: "We sort them by room",
    body: "AI groups every photo into Kitchen, Primary Bedroom, Patio and more. You review and fix anything in a click.",
  },
  {
    icon: MousePointerClick,
    title: "Place rooms on the plan",
    body: "Drag a marker onto each room. No floor plan? Sketch simple room boxes instead — it takes a minute.",
  },
  {
    icon: Send,
    title: "Share one link",
    body: "Publish a beautiful tour page. Text it to a buyer, add it to a listing, embed it, or print the QR code.",
  },
];

const FEATURES = [
  { icon: MapIcon, title: "Clickable floor plans", body: "Every room is a tap away. Visitors always know where they are in the home." },
  { icon: Sparkles, title: "AI photo sorting", body: "Room detection, duplicate spotting and best-photo picks. Always editable, never required." },
  { icon: Images, title: "Gallery-grade photos", body: "Big, sharp images sized for every screen, with instant blur-up loading." },
  { icon: Smartphone, title: "Made for phones", body: "Most visitors are on a phone. Swipe through rooms like a story, one thumb." },
  { icon: Rotate3d, title: "Video & 360° photos", body: "Add a walkthrough video or a 360° photo to any room when you have one." },
  { icon: QrCode, title: "QR codes", body: "For open houses, yard signs, flyers and welcome books — with scans tracked." },
  { icon: Code, title: "Embed anywhere", body: "Paste one snippet into your website or listing page. No editor, just the tour." },
  { icon: ChartColumn, title: "Visitor analytics", body: "Views, time spent and the rooms people open most — see what's working." },
];

const PILE = [
  { name: "kitchen", rot: -8, x: 6, y: 10 },
  { name: "bathroom", rot: 6, x: 34, y: 4 },
  { name: "exterior", rot: -3, x: 58, y: 14 },
  { name: "primary", rot: 9, x: 12, y: 42 },
  { name: "living", rot: -6, x: 40, y: 36 },
  { name: "patio", rot: 4, x: 64, y: 46 },
  { name: "dining", rot: -10, x: 18, y: 68 },
  { name: "kitchen-2", rot: 7, x: 46, y: 66 },
];

const SORTED = [
  { room: "Kitchen", confidence: 96, photos: ["kitchen", "kitchen-2", "kitchen-3"], features: ["Island seating", "Pendant lights"] },
  { room: "Living Room", confidence: 94, photos: ["living", "living-2"], features: ["Timber feature wall", "Sliding doors"] },
  { room: "Primary Bedroom", confidence: 91, photos: ["primary", "primary-2"], features: ["Black-framed doors", "Reading chair"] },
];

const FAQ = [
  {
    q: "Is this a 3D virtual tour?",
    a: "No. HomeTour is an interactive walkthrough: a floor plan with clickable rooms, each opening a gallery of your photos. There's no scanning, no special camera and no appointment — you can make one in about 10 minutes from photos you already have.",
  },
  {
    q: "Do I need a floor plan?",
    a: "It helps, but no. You can upload a PNG, JPG or PDF floor plan, sketch a simple layout with labeled room boxes, or skip the map entirely and let visitors browse the room list.",
  },
  {
    q: "What does the AI actually do?",
    a: "It looks at each photo and suggests which room it belongs to, flags near-duplicates, picks a strong cover photo, and can draft short room descriptions. It only describes what's visible — it won't invent renovations, brands or measurements — and you can change anything.",
  },
  {
    q: "Do visitors need an account or an app?",
    a: "No. A published tour is a regular web page. It opens instantly on any phone or computer.",
  },
  {
    q: "Can I put it on my website or listing?",
    a: "Yes. Every tour has a share link, a QR code and an embed snippet for your own site.",
  },
  {
    q: "What does it cost?",
    a: "Creating tours is free while we're in early access. Paid plans will add things like branding removal, analytics and team features — the free plan will always let you build and share a tour.",
  },
];

const img = (name: string, w: 480 | 960 | 1600) => `/landing/${name}-${w}.webp`;

export default function HomePage() {
  return (
    <>
      <TrackOnce event="landing_view" />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(60%_60%_at_50%_0%,#f3e4dc_0%,transparent_70%)]" />
        <div className="relative mx-auto max-w-7xl px-5 pb-16 pt-14 sm:px-8 sm:pt-20 lg:pb-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="inline-flex animate-fade-up items-center gap-2 rounded-full bg-surface px-3.5 py-1.5 text-[13px] font-medium text-ink-2 shadow-soft ring-1 ring-line">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              AI sorts your photos by room
            </p>
            <h1 className="mt-6 animate-fade-up font-display text-[44px] leading-[1.02] text-ink [animation-delay:60ms] sm:text-6xl lg:text-[76px]">
              Turn your property photos into an interactive walkthrough.
            </h1>
            <p className="mx-auto mt-6 max-w-xl animate-fade-up text-lg leading-relaxed text-ink-3 [animation-delay:120ms] sm:text-xl">
              Upload your photos and floor plan. We&apos;ll organize everything into a beautiful, clickable property tour.
            </p>
            <div className="mt-9 flex animate-fade-up flex-col items-center justify-center gap-3 [animation-delay:180ms] sm:flex-row">
              <Link href="/create" className={buttonClasses("primary", "lg", "w-full sm:w-auto")}>
                Create a Tour
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href={DEMO_PATH} className={buttonClasses("secondary", "lg", "w-full sm:w-auto")}>
                <Play className="h-4 w-4 fill-current" />
                See an Example
              </Link>
            </div>
            <p className="mt-5 animate-fade-up text-sm text-ink-4 [animation-delay:240ms]">
              Free to start · No special camera · Ready in minutes
            </p>
          </div>

          <div className="mx-auto mt-14 max-w-6xl animate-fade-up [animation-delay:300ms] sm:mt-16">
            <HeroDemo />
          </div>
        </div>
      </section>

      {/* Audiences */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
          <p className="text-center text-sm font-medium text-ink-3">Built for anyone who needs to show a space</p>
          <ul className="mt-6 flex flex-wrap justify-center gap-2.5">
            {AUDIENCES.map(({ label, icon: Icon }) => (
              <li key={label} className="inline-flex items-center gap-2 rounded-full bg-canvas px-4 py-2 text-[15px] text-ink-2 ring-1 ring-line">
                <Icon className="h-4 w-4 text-ink-3" strokeWidth={1.75} />
                {label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-20">
        <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
          <SectionHeading eyebrow="How it works" title="From camera roll to walkthrough in four steps." />
          <ol className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <li key={step.title} className="relative rounded-3xl bg-surface p-7 shadow-soft ring-1 ring-line">
                <div className="flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sunken text-ink">
                    <step.icon className="h-5 w-5" strokeWidth={1.75} />
                  </span>
                  <span className="font-display text-3xl text-ink-4">{i + 1}</span>
                </div>
                <h3 className="mt-6 text-lg font-semibold tracking-tight text-ink">{step.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-3">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* AI moment */}
      <section className="bg-ink text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 py-24 sm:px-8 lg:grid-cols-[1fr_1.15fr]">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.16em] text-white/50">The magic part</p>
            <h2 className="mt-4 font-display text-4xl leading-[1.05] sm:text-5xl">
              Twenty random photos in.
              <br />
              <span className="italic text-white/70">A finished tour out.</span>
            </h2>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-white/65">
              Drop in a messy camera roll. HomeTour figures out which photos belong to which room, spots near-duplicates, picks the
              strongest shot for each space and suggests a natural walking order — front door to backyard.
            </p>
            <ul className="mt-8 space-y-3 text-[15px] text-white/80">
              {["You review every suggestion — nothing is final until you say so", "Works without AI too: drag photos into rooms yourself", "Descriptions stick to what's visible. No invented features."].map((t) => (
                <li key={t} className="flex gap-3">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-[#e9a58f]" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="grid items-center gap-6 sm:grid-cols-[0.9fr_auto_1.1fr]">
            <div className="relative mx-auto aspect-square w-full max-w-[320px]">
              {PILE.map((p) => (
                <img
                  key={p.name}
                  src={img(p.name, 480)}
                  alt=""
                  loading="lazy"
                  className="absolute aspect-[4/3] w-[38%] rounded-lg object-cover shadow-[0_8px_24px_rgb(0_0_0/0.45)] ring-2 ring-white"
                  style={{ left: `${p.x}%`, top: `${p.y}%`, transform: `rotate(${p.rot}deg)` }}
                />
              ))}
            </div>
            <div className="flex justify-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-2 text-sm text-white ring-1 ring-white/15 sm:flex-col sm:rounded-2xl sm:px-3 sm:py-3">
                <Sparkles className="h-4 w-4 text-[#e9a58f]" />
                <ArrowRight className="h-4 w-4 rotate-90 sm:rotate-0" />
              </span>
            </div>
            <div className="space-y-3">
              {SORTED.map((group) => (
                <div key={group.room} className="rounded-2xl bg-white/[0.06] p-3.5 ring-1 ring-white/10">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{group.room}</p>
                    <span className="rounded-full bg-[#e9a58f]/15 px-2 py-0.5 text-xs font-medium text-[#f0bba9]">{group.confidence}% match</span>
                  </div>
                  <div className="mt-2.5 flex gap-1.5">
                    {group.photos.map((name) => (
                      <img key={name} src={img(name, 480)} alt="" loading="lazy" className="aspect-[4/3] w-1/3 rounded-md object-cover" />
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-white/50">Detected: {group.features.join(" · ")}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section>
        <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
          <SectionHeading eyebrow="Everything you need" title="Looks expensive. Takes ten minutes." />
          <div className="mt-14 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.title}>
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface text-ink shadow-soft ring-1 ring-line">
                  <f.icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <h3 className="mt-5 text-base font-semibold tracking-tight text-ink">{f.title}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-ink-3">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Positioning */}
      <section className="px-5 sm:px-8">
        <div className="mx-auto grid max-w-7xl overflow-hidden rounded-[32px] bg-surface shadow-soft ring-1 ring-line lg:grid-cols-2">
          <div className="relative min-h-72 lg:min-h-full">
            <img
              src={img("living-2", 1600)}
              srcSet={`${img("living-2", 960)} 960w, ${img("living-2", 1600)} 1600w`}
              sizes="(min-width: 1024px) 50vw, 100vw"
              alt="Open-plan living room in the example tour"
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
          <div className="p-8 sm:p-12 lg:p-16">
            <p className="text-sm font-medium uppercase tracking-[0.16em] text-ink-4">Not a 3D scan</p>
            <h2 className="mt-4 font-display text-4xl leading-[1.05] text-ink sm:text-5xl">The tour every listing can have.</h2>
            <p className="mt-5 text-lg leading-relaxed text-ink-3">
              3D scans need special hardware, an appointment and a budget. HomeTour uses the photos you already have — so the starter
              condo, the weekend cabin and the event hall can all get a walkthrough, today.
            </p>
            <dl className="mt-8 grid grid-cols-2 gap-6">
              {[
                ["0", "special cameras"],
                ["~10 min", "from upload to link"],
                ["1 link", "for buyers & guests"],
                ["Any phone", "no app needed"],
              ].map(([k, v]) => (
                <div key={v}>
                  <dt className="font-display text-3xl text-ink">{k}</dt>
                  <dd className="mt-1 text-sm text-ink-3">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* Example CTA band */}
      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
        <Link
          href={DEMO_PATH}
          className="group relative block overflow-hidden rounded-[32px] bg-ink shadow-lift"
          aria-label="Open the example tour"
        >
          <img
            src={img("exterior", 1600)}
            srcSet={`${img("exterior", 960)} 960w, ${img("exterior", 1600)} 1600w`}
            sizes="(min-width: 1280px) 1216px, 100vw"
            alt=""
            loading="lazy"
            className="h-[420px] w-full object-cover opacity-80 transition-transform duration-[1.2s] ease-out group-hover:scale-[1.03] sm:h-[480px]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-start gap-5 p-8 sm:flex-row sm:items-end sm:justify-between sm:p-12">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.16em] text-white/60">Live example</p>
              <h2 className="mt-3 font-display text-4xl text-white sm:text-5xl">Modern 3-Bedroom Chicago Home</h2>
              <p className="mt-2 text-white/70">8 rooms · 20 photos · 360° bathroom</p>
            </div>
            <span className={buttonClasses("glass", "lg")}>
              <Camera className="h-4 w-4" />
              Take the tour
            </span>
          </div>
        </Link>
      </section>

      {/* Pricing teaser */}
      <section className="border-t border-line bg-surface">
        <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
          <SectionHeading
            eyebrow="Pricing"
            title="Free while we're in early access."
            subtitle="Build and share tours for free today. Here's where pricing is headed — creating a tour will never be paywalled."
          />
          <div className="mx-auto mt-12 grid max-w-5xl gap-5 md:grid-cols-3">
            {Object.values(PLANS).map((plan) => (
              <div key={plan.id} className="rounded-3xl bg-canvas p-7 ring-1 ring-line">
                <p className="font-semibold text-ink">{plan.name}</p>
                <p className="mt-3 flex items-baseline gap-1">
                  <span className="font-display text-4xl text-ink">${plan.priceMonthly}</span>
                  <span className="text-sm text-ink-3">/month</span>
                </p>
                <p className="mt-2 text-sm text-ink-3">{plan.tagline}</p>
                <ul className="mt-5 space-y-2 text-sm text-ink-2">
                  {plan.highlights.slice(0, 4).map((h) => (
                    <li key={h} className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      {h}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-ink-3">
            Prefer no subscription? Single tours will be ${PER_TOUR_PRICE}, one time.{" "}
            <Link href="/pricing" className="font-medium text-ink underline-offset-4 hover:underline">
              Compare plans
            </Link>
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section>
        <div className="mx-auto max-w-3xl px-5 py-24 sm:px-8">
          <SectionHeading eyebrow="Questions" title="Good to know" />
          <div className="mt-10 divide-y divide-line rounded-3xl bg-surface px-6 ring-1 ring-line sm:px-8">
            {FAQ.map((item) => (
              <details key={item.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-[17px] font-medium text-ink [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sunken text-ink-3 transition-transform duration-200 group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 pr-10 text-[15px] leading-relaxed text-ink-3">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-5 pb-24 sm:px-8">
        <div className="mx-auto max-w-4xl rounded-[32px] bg-surface px-8 py-16 text-center shadow-soft ring-1 ring-line sm:px-16">
          <h2 className="font-display text-4xl leading-tight text-ink sm:text-5xl">Your next listing deserves a walkthrough.</h2>
          <p className="mx-auto mt-4 max-w-lg text-lg text-ink-3">Start with the photos you already have. No account needed to begin.</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/create" className={buttonClasses("primary", "lg")}>
              Create a Tour
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href={DEMO_PATH} className={buttonClasses("secondary", "lg")}>
              See an Example
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function SectionHeading({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-sm font-medium uppercase tracking-[0.16em] text-ink-4">{eyebrow}</p>
      <h2 className="mt-4 font-display text-4xl leading-[1.05] text-ink sm:text-5xl">{title}</h2>
      {subtitle ? <p className="mt-4 text-lg leading-relaxed text-ink-3">{subtitle}</p> : null}
    </div>
  );
}
