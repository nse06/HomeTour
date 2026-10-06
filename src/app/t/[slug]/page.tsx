import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TourViewer } from "@/components/viewer/tour-viewer";
import { getPublishedTourGraph } from "@/lib/data/queries";
import { toPublicGraph } from "@/lib/data/derive";
import { getAppUrl } from "@/lib/env";
import { tourJsonLd, tourMetadata } from "@/lib/seo";

// Tours are live documents: edits must show immediately, so never cache the HTML.
export const dynamic = "force-dynamic";

export async function generateMetadata(props: PageProps<"/t/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const graph = await getPublishedTourGraph(slug);
  if (!graph) return { title: "Tour not found", robots: { index: false } };
  return tourMetadata(graph, `/t/${slug}`);
}

export default async function PublicTourPage(props: PageProps<"/t/[slug]">) {
  const { slug } = await props.params;
  const { room } = await props.searchParams;
  const graph = await getPublishedTourGraph(slug);
  if (!graph) notFound();
  const jsonLd = tourJsonLd(graph, `/t/${slug}`);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <TourViewer
        graph={toPublicGraph(graph)}
        mode="public"
        shareUrl={`${getAppUrl()}/t/${slug}`}
        initialRoom={typeof room === "string" ? room : null}
      />
    </>
  );
}
