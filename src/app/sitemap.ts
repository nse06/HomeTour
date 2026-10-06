import { desc, eq } from "drizzle-orm";
import type { MetadataRoute } from "next";
import { LANDING_PAGES } from "@/content/landing-pages";
import { db } from "@/lib/db";
import { tours } from "@/lib/db/schema";
import { getAppUrl } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getAppUrl();
  const published = await db
    .select({ slug: tours.slug, updatedAt: tours.updatedAt, settings: tours.settings })
    .from(tours)
    .where(eq(tours.status, "published"))
    .orderBy(desc(tours.updatedAt))
    .limit(45000);

  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/pricing`, changeFrequency: "monthly", priority: 0.6 },
    ...LANDING_PAGES.map((p) => ({ url: `${base}/${p.slug}`, changeFrequency: "monthly" as const, priority: 0.7 })),
    ...published
      .filter((t) => !t.settings?.noindex)
      .map((t) => ({ url: `${base}/t/${t.slug}`, lastModified: t.updatedAt, changeFrequency: "weekly" as const, priority: 0.5 })),
  ];
}
