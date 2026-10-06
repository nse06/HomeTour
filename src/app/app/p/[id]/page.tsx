import { notFound, redirect } from "next/navigation";
import { resumeStep } from "@/components/editor/steps";
import { loadPropertyGraph } from "@/lib/data/queries";

export default async function EditorIndex(props: PageProps<"/app/p/[id]">) {
  const { id } = await props.params;
  const graph = await loadPropertyGraph(id);
  if (!graph) notFound();
  redirect(`/app/p/${id}/${resumeStep(graph)}`);
}
