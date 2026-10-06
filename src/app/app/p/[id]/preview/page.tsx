import { ArrowLeft, Eye } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TourViewer } from "@/components/viewer/tour-viewer";
import { getCurrentUser } from "@/lib/auth/session";
import { toPublicGraph } from "@/lib/data/derive";
import { loadPropertyGraph } from "@/lib/data/queries";
import { db } from "@/lib/db";
import { properties } from "@/lib/db/schema";
import { getAppUrl } from "@/lib/env";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/** Owner-only preview of exactly what visitors will see (works for drafts; no analytics). */
export default async function PreviewPage(props: PageProps<"/app/p/[id]/preview">) {
  const { id } = await props.params;
  const user = await getCurrentUser();
  const [row] = await db.select({ ownerId: properties.ownerId }).from(properties).where(eq(properties.id, id)).limit(1);
  if (!user || row?.ownerId !== user.id) notFound();
  const graph = await loadPropertyGraph(id);
  if (!graph) notFound();
  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-canvas">
      <div className="sticky top-0 z-[90] flex items-center justify-between gap-3 bg-ink px-4 py-2.5 text-sm text-white">
        <span className="inline-flex items-center gap-2">
          <Eye className="h-4 w-4" />
          Preview{graph.tour.status === "published" ? " · this tour is live" : " · only you can see this"}
        </span>
        <Link href={`/app/p/${id}/tour`} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 font-medium hover:bg-white/20">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to editor
        </Link>
      </div>
      <TourViewer graph={toPublicGraph(graph)} mode="preview" shareUrl={`${getAppUrl()}/t/${graph.tour.slug}`} />
    </div>
  );
}
