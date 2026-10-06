import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TourViewer } from "@/components/viewer/tour-viewer";
import { toPublicGraph } from "@/lib/data/derive";
import { getPublishedTourGraph } from "@/lib/data/queries";
import { requestOrigin } from "@/lib/origin";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: PageProps<"/embed/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const graph = await getPublishedTourGraph(slug);
  return {
    title: graph ? { absolute: graph.property.tourTitle } : "Tour not found",
    robots: { index: false, follow: false },
    alternates: { canonical: `/t/${slug}` },
  };
}

/** Chrome-less viewer for <iframe> embeds (framing allowed by next.config headers). No editor UI. */
export default async function EmbedPage(props: PageProps<"/embed/[slug]">) {
  const { slug } = await props.params;
  const { room } = await props.searchParams;
  const graph = await getPublishedTourGraph(slug);
  if (!graph) notFound();
  return (
    <TourViewer
      graph={toPublicGraph(graph)}
      mode="embed"
      shareUrl={`${await requestOrigin()}/t/${slug}`}
      initialRoom={typeof room === "string" ? room : null}
    />
  );
}
