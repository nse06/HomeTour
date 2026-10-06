import { Eye, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Photo } from "@/components/media/photo";
import { buttonClasses } from "@/components/ui/button";
import { Badge, EmptyState } from "@/components/ui/misc";
import { getCurrentUser } from "@/lib/auth/session";
import { listDashboardProperties } from "@/lib/data/queries";
import { DEMO_PATH } from "@/lib/demo";
import { formatRelative, pluralize } from "@/lib/utils";
import { DeleteTourButton } from "./delete-tour-button";

export const metadata: Metadata = { title: "My tours", robots: { index: false } };

export default async function DashboardPage() {
  const user = (await getCurrentUser())!;
  const items = await listDashboardProperties(user.id);

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-5xl text-ink">My tours</h1>
          <p className="mt-2 text-[15px] text-ink-3">
            {items.length ? pluralize(items.length, "tour") : "Turn your property photos into an interactive walkthrough."}
          </p>
        </div>
        <Link href="/create" className={buttonClasses("primary", "md")}>
          <Plus className="h-4 w-4" />
          New tour
        </Link>
      </div>

      {items.length === 0 ? (
        <EmptyState
          className="mt-10 rounded-[32px] bg-surface py-20 ring-1 ring-line"
          icon={<Plus />}
          title="Create your first tour"
          action={
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link href="/create" className={buttonClasses("primary", "md")}>
                Create a tour
              </Link>
              <Link href={DEMO_PATH} className={buttonClasses("secondary", "md")}>
                See an example
              </Link>
            </div>
          }
        >
          Upload a floor plan and your photos — we&apos;ll organize them into rooms for you.
        </EmptyState>
      ) : (
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <li key={p.id} className="group overflow-hidden rounded-[28px] bg-surface shadow-soft ring-1 ring-line transition-shadow hover:shadow-lift">
              <Link href={`/app/p/${p.id}`} className="block">
                <div className="relative aspect-[16/10] overflow-hidden bg-sunken">
                  {p.cover ? (
                    <Photo media={p.cover} sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="h-full w-full transition-transform duration-700 group-hover:scale-[1.03]" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-ink-4">No photos yet</div>
                  )}
                  <div className="absolute left-3 top-3">
                    {p.status === "published" ? <Badge tone="success">Live</Badge> : <Badge tone="dark">Draft</Badge>}
                  </div>
                </div>
                <div className="p-5 pb-3">
                  <p className="truncate text-lg font-semibold tracking-tight text-ink">{p.tourTitle}</p>
                  <p className="mt-0.5 truncate text-sm text-ink-3">{p.address || p.name}</p>
                  <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-3">
                    <span>{pluralize(p.roomCount, "room")}</span>
                    <span>{pluralize(p.photoCount, "photo")}</span>
                    <span className="inline-flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5" /> {p.views.toLocaleString()}
                    </span>
                  </p>
                </div>
              </Link>
              <div className="flex items-center justify-between gap-2 px-5 pb-4">
                <span className="text-xs text-ink-4">Edited {formatRelative(p.updatedAt)}</span>
                <div className="flex items-center gap-1">
                  {p.status === "published" ? (
                    <a href={`/t/${p.slug}`} target="_blank" rel="noreferrer" className={buttonClasses("ghost", "xs")}>
                      View
                    </a>
                  ) : null}
                  <Link href={`/app/p/${p.id}/analytics`} className={buttonClasses("ghost", "xs")}>
                    Stats
                  </Link>
                  <DeleteTourButton id={p.id} name={p.tourTitle} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
