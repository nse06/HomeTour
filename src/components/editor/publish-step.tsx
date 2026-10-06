"use client";

import { BarChart3, Check, Code, Copy, Download, ExternalLink, Eye, Globe, Lock, Pencil, QrCode, Share2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button, buttonClasses } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { trackClient } from "@/lib/analytics/client";
import { navigableRooms } from "@/lib/data/derive";
import type { TourCta } from "@/lib/data/types";
import { slugify, validateSlug } from "@/lib/slug";
import { cn, pluralize } from "@/lib/utils";
import { useEditor } from "./store";

const ACCENTS = ["#c8553d", "#151412", "#2f6f5e", "#2b5f8a", "#8a5a2b", "#7a4b8c"];

export function PublishStep() {
  const graph = useEditor((s) => s.graph);
  const { property, tour } = graph;
  const setPublished = useEditor((s) => s.setPublished);
  const updateTour = useEditor((s) => s.updateTour);
  const [origin, setOrigin] = useState("");
  const [busy, setBusy] = useState(false);
  const [justPublished, setJustPublished] = useState(false);

  useEffect(() => setOrigin(window.location.origin), []);
  const live = tour.status === "published";
  const url = `${origin}/t/${tour.slug}`;
  const rooms = navigableRooms(graph);
  const placed = rooms.filter((r) => r.hotspot).length;

  const shared = (method: string) => trackClient("tour_shared", { tourId: tour.id, meta: { method } });

  async function togglePublish() {
    setBusy(true);
    const ok = await setPublished(!live);
    setBusy(false);
    if (ok && !live) {
      setJustPublished(true);
      toast.success("Your tour is live!");
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-10 sm:py-14">
      <h1 className="font-display text-4xl text-ink">Publish & share</h1>
      <p className="mt-2 text-[15px] text-ink-3">One link for buyers and guests. Published tours update live as you edit.</p>

      {/* Status */}
      <div className={cn("mt-8 overflow-hidden rounded-3xl ring-1", live ? "bg-ink text-white ring-ink" : "bg-surface ring-line")}>
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="flex items-start gap-4">
            <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", live ? "bg-white/10" : "bg-sunken")}>
              {live ? <Globe className="h-6 w-6 text-[#9fd8b5]" /> : <Lock className="h-6 w-6 text-ink-3" />}
            </span>
            <div>
              <p className="text-xl font-semibold tracking-tight">{live ? (justPublished ? "Your tour is live! 🎉" : "Live") : "Draft"}</p>
              <p className={cn("mt-1 text-[15px]", live ? "text-white/65" : "text-ink-3")}>
                {live
                  ? "Anyone with the link can view it. No login required."
                  : `${pluralize(rooms.length, "room")} ready · ${placed} on the plan. Only you can see it until you publish.`}
              </p>
            </div>
          </div>
          <Button size="lg" variant={live ? "glass" : "primary"} loading={busy} onClick={() => void togglePublish()} disabled={!live && rooms.length === 0}>
            {live ? "Unpublish" : "Publish tour"}
          </Button>
        </div>
        {!live && rooms.length === 0 ? (
          <p className="border-t border-line bg-warning-soft/50 px-6 py-3 text-sm text-warning sm:px-8">
            Add at least one room with photos before publishing.
          </p>
        ) : null}
      </div>

      {/* Link */}
      <section className="mt-6 rounded-3xl bg-surface p-6 ring-1 ring-line sm:p-8">
        <h2 className="text-lg font-semibold tracking-tight text-ink">Your link</h2>
        <SlugEditor slug={tour.slug} title={property.tourTitle} origin={origin} onSave={(slug) => updateTour({ slug })} />
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <ShareButton
            icon={<Copy className="h-4 w-4" />}
            label="Copy link"
            disabled={!live}
            onClick={async () => {
              await navigator.clipboard.writeText(url);
              toast.success("Link copied");
              shared("copy");
            }}
          />
          <a
            href={live ? url : undefined}
            target="_blank"
            rel="noreferrer"
            aria-disabled={!live}
            className={cn(buttonClasses("secondary", "md", "w-full"), !live && "pointer-events-none opacity-45")}
          >
            <ExternalLink className="h-4 w-4" />
            Open tour
          </a>
          <Link href={`/app/p/${property.id}/preview`} target="_blank" className={buttonClasses("secondary", "md", "w-full")}>
            <Eye className="h-4 w-4" />
            Preview
          </Link>
          <ShareButton
            icon={<Share2 className="h-4 w-4" />}
            label="Share…"
            disabled={!live}
            onClick={async () => {
              if (navigator.share) {
                try {
                  await navigator.share({ title: property.tourTitle, url: `${url}?src=share` });
                  shared("native");
                } catch {
                  /* dismissed */
                }
              } else {
                await navigator.clipboard.writeText(`${url}?src=share`);
                toast.success("Link copied");
                shared("copy");
              }
            }}
          />
        </div>
        {!live ? <p className="mt-3 text-sm text-ink-4">Publish to start sharing. You can still preview the tour any time.</p> : null}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <QrCard url={`${url}?src=qr`} slug={tour.slug} disabled={!live} onDownload={() => shared("qr")} />
        <EmbedCard url={origin ? `${origin}/embed/${tour.slug}` : ""} disabled={!live} onCopy={() => shared("embed")} />
      </div>

      <CtaCard cta={tour.settings.cta} contactEmail={property.contactEmail} contactPhone={property.contactPhone} onSave={(cta) => updateTour({ settings: { cta } })} />

      {/* Appearance */}
      <section className="mt-6 rounded-3xl bg-surface p-6 ring-1 ring-line sm:p-8">
        <h2 className="text-lg font-semibold tracking-tight text-ink">Appearance</h2>
        <div className="mt-5 space-y-5">
          <div>
            <p className="mb-2 text-sm font-medium text-ink-2">Accent color</p>
            <div className="flex flex-wrap items-center gap-2">
              {ACCENTS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => void updateTour({ settings: { accentColor: c } })}
                  className={cn("h-9 w-9 rounded-full ring-2 ring-offset-2 transition-transform hover:scale-105", (tour.settings.accentColor ?? ACCENTS[0]) === c ? "ring-ink" : "ring-transparent")}
                  style={{ backgroundColor: c }}
                  aria-label={`Accent ${c}`}
                />
              ))}
              <label className="ml-1 inline-flex cursor-pointer items-center gap-2 text-sm text-ink-3">
                <input
                  type="color"
                  value={tour.settings.accentColor ?? ACCENTS[0]}
                  onChange={(e) => void updateTour({ settings: { accentColor: e.target.value } })}
                  className="h-9 w-9 cursor-pointer rounded-full border-0 bg-transparent p-0"
                />
                Custom
              </label>
            </div>
          </div>
          <ToggleRow
            label="Show contact details"
            hint="Your name, phone and email at the bottom of the tour."
            checked={tour.settings.showContact !== false}
            onChange={(v) => void updateTour({ settings: { showContact: v } })}
          />
          <ToggleRow
            label="Show “Made with HomeTour”"
            hint="Removing branding will be a Pro feature — free during early access."
            checked={tour.settings.showBranding !== false}
            onChange={(v) => void updateTour({ settings: { showBranding: v } })}
          />
          <ToggleRow
            label="Hide from search engines"
            hint="Keeps the link shareable but asks Google not to index it."
            checked={Boolean(tour.settings.noindex)}
            onChange={(v) => void updateTour({ settings: { noindex: v } })}
          />
        </div>
      </section>

      <Link
        href={`/app/p/${property.id}/analytics`}
        className="mt-6 flex items-center justify-between gap-3 rounded-3xl bg-surface p-6 ring-1 ring-line transition-colors hover:bg-sunken/50 sm:p-8"
      >
        <span className="flex min-w-0 items-center gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sunken">
            <BarChart3 className="h-5 w-5 text-ink-2" />
          </span>
          <span className="min-w-0">
            <span className="block font-semibold text-ink">Visitor analytics</span>
            <span className="mt-0.5 block text-sm leading-snug text-ink-3">Views, time spent, most-viewed rooms, QR scans and CTA clicks</span>
          </span>
        </span>
        <span className="shrink-0 text-ink-3">→</span>
      </Link>
    </div>
  );
}

function ShareButton({ icon, label, onClick, disabled }: { icon: React.ReactNode; label: string; onClick: () => void | Promise<void>; disabled?: boolean }) {
  return (
    <Button variant="secondary" className="w-full" disabled={disabled} onClick={() => void onClick()}>
      {icon}
      {label}
    </Button>
  );
}

function ToggleRow({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-[15px] font-medium text-ink">{label}</p>
        <p className="text-sm text-ink-3">{hint}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} label={label} />
    </div>
  );
}

function SlugEditor({ slug, title, origin, onSave }: { slug: string; title: string; origin: string; onSave: (slug: string) => Promise<boolean> }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(slug);
  const [saving, setSaving] = useState(false);
  useEffect(() => setValue(slug), [slug]);
  const problem = value !== slug ? validateSlug(value) : null;

  if (!editing) {
    return (
      <div className="mt-4 flex items-center gap-2 rounded-2xl bg-sunken px-4 py-3">
        <Globe className="h-4 w-4 shrink-0 text-ink-4" />
        <p className="min-w-0 flex-1 truncate font-mono text-[14px] text-ink-2">
          {origin.replace(/^https?:\/\//, "")}/t/<span className="font-semibold text-ink">{slug}</span>
        </p>
        <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-1 text-sm font-medium text-ink-3 hover:text-ink">
          <Pencil className="h-3.5 w-3.5" />
          Customize
        </button>
      </div>
    );
  }
  return (
    <form
      className="mt-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (problem) return;
        setSaving(true);
        const ok = await onSave(value);
        setSaving(false);
        if (ok) {
          setEditing(false);
          toast.success("Link updated. The old link no longer works.");
        }
      }}
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex flex-1 items-center rounded-xl bg-surface ring-1 ring-line-strong focus-within:ring-2 focus-within:ring-ink">
          <span className="pl-3.5 font-mono text-[14px] text-ink-4">/t/</span>
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
            className="h-11 min-w-0 flex-1 bg-transparent pr-3 font-mono text-[14px] text-ink outline-none"
            aria-label="Custom link"
            maxLength={60}
          />
        </div>
        <Button type="submit" loading={saving} disabled={Boolean(problem) || value === slug}>
          <Check className="h-4 w-4" />
          Save
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setValue(slug);
            setEditing(false);
          }}
        >
          Cancel
        </Button>
      </div>
      {problem ? <p className="mt-2 text-sm text-danger">{problem}</p> : null}
      <button type="button" onClick={() => setValue(slugify(title))} className="mt-2 text-sm text-ink-3 underline-offset-4 hover:underline">
        Use “{slugify(title)}”
      </button>
    </form>
  );
}

function QrCard({ url, slug, disabled, onDownload }: { url: string; slug: string; disabled: boolean; onDownload: () => void }) {
  const [svg, setSvg] = useState<string>("");
  useEffect(() => {
    if (!url.startsWith("http")) return;
    let alive = true;
    void import("qrcode").then((QR) =>
      QR.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#151412", light: "#ffffff" } }).then((s) => alive && setSvg(s)),
    );
    return () => {
      alive = false;
    };
  }, [url]);

  async function download(kind: "png" | "svg") {
    const QR = await import("qrcode");
    const a = document.createElement("a");
    if (kind === "png") {
      a.href = await QR.toDataURL(url, { width: 1200, margin: 2, errorCorrectionLevel: "M" });
    } else {
      a.href = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(await QR.toString(url, { type: "svg", margin: 2 }))}`;
    }
    a.download = `${slug}-qr.${kind}`;
    a.click();
    onDownload();
  }

  return (
    <section className="rounded-3xl bg-surface p-6 ring-1 ring-line sm:p-8">
      <div className="flex items-center gap-2">
        <QrCode className="h-5 w-5 text-ink-2" />
        <h2 className="text-lg font-semibold tracking-tight text-ink">QR code</h2>
      </div>
      <p className="mt-1 text-sm text-ink-3">For open houses, yard signs, flyers and welcome books. Scans are counted separately.</p>
      <div className={cn("mt-5 flex items-center gap-5", disabled && "opacity-40")}>
        <div className="h-32 w-32 shrink-0 overflow-hidden rounded-2xl bg-white p-2 ring-1 ring-line [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
        <div className="flex flex-col gap-2">
          <Button variant="secondary" size="sm" disabled={disabled} onClick={() => void download("png")}>
            <Download className="h-4 w-4" /> PNG
          </Button>
          <Button variant="secondary" size="sm" disabled={disabled} onClick={() => void download("svg")}>
            <Download className="h-4 w-4" /> SVG (print)
          </Button>
        </div>
      </div>
    </section>
  );
}

function EmbedCard({ url, disabled, onCopy }: { url: string; disabled: boolean; onCopy: () => void }) {
  const code = `<iframe src="${url}" title="Property tour" width="100%" height="680" style="border:0;border-radius:16px;max-width:100%" loading="lazy" allow="fullscreen; accelerometer; gyroscope" allowfullscreen></iframe>`;
  return (
    <section className="rounded-3xl bg-surface p-6 ring-1 ring-line sm:p-8">
      <div className="flex items-center gap-2">
        <Code className="h-5 w-5 text-ink-2" />
        <h2 className="text-lg font-semibold tracking-tight text-ink">Embed on your website</h2>
      </div>
      <p className="mt-1 text-sm text-ink-3">Paste into any site builder or listing page. Visitors see the tour — never the editor.</p>
      <pre className={cn("mt-4 max-h-28 overflow-auto whitespace-pre-wrap break-all rounded-2xl bg-sunken p-3 font-mono text-[12px] text-ink-2", disabled && "opacity-40")}>{code}</pre>
      <Button
        variant="secondary"
        size="sm"
        className="mt-3"
        disabled={disabled || !url}
        onClick={async () => {
          await navigator.clipboard.writeText(code);
          toast.success("Embed code copied");
          onCopy();
        }}
      >
        <Copy className="h-4 w-4" />
        Copy embed code
      </Button>
    </section>
  );
}

function CtaCard({
  cta,
  contactEmail,
  contactPhone,
  onSave,
}: {
  cta: TourCta | undefined;
  contactEmail: string | null;
  contactPhone: string | null;
  onSave: (cta: TourCta) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState<TourCta>(
    cta ?? { enabled: false, label: "Request a showing", type: contactEmail ? "email" : contactPhone ? "phone" : "url", value: contactEmail ?? contactPhone ?? "" },
  );
  const save = (next: TourCta) => {
    setDraft(next);
    if (next.enabled && !next.value.trim()) return;
    void onSave(next);
  };
  return (
    <section className="mt-6 rounded-3xl bg-surface p-6 ring-1 ring-line sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-ink">Call-to-action button</h2>
          <p className="mt-1 text-sm text-ink-3">Turn visitors into leads: a button on the tour that opens a link, an email or a phone call.</p>
        </div>
        <Switch checked={draft.enabled} onCheckedChange={(enabled) => save({ ...draft, enabled })} label="Show call-to-action button" />
      </div>
      {draft.enabled ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_160px_1.4fr]">
          <Field label="Button text">
            {(p) => <Input {...p} value={draft.label} maxLength={40} onChange={(e) => setDraft({ ...draft, label: e.target.value })} onBlur={() => draft.label.trim() && save(draft)} />}
          </Field>
          <Field label="Opens">
            {(p) => (
              <Select {...p} value={draft.type} onChange={(e) => save({ ...draft, type: e.target.value as TourCta["type"], value: "" })}>
                <option value="url">A link</option>
                <option value="email">An email</option>
                <option value="phone">A phone call</option>
              </Select>
            )}
          </Field>
          <Field label={draft.type === "url" ? "Link" : draft.type === "email" ? "Email address" : "Phone number"}>
            {(p) => (
              <Input
                {...p}
                value={draft.value}
                type={draft.type === "email" ? "email" : draft.type === "phone" ? "tel" : "url"}
                placeholder={draft.type === "url" ? "https://calendly.com/you" : draft.type === "email" ? "you@agency.com" : "(312) 555-0100"}
                onChange={(e) => setDraft({ ...draft, value: e.target.value })}
                onBlur={() => save(draft)}
              />
            )}
          </Field>
        </div>
      ) : null}
    </section>
  );
}
