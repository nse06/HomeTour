import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { EditorChrome } from "@/components/editor/editor-chrome";
import { EditorProvider } from "@/components/editor/store";
import { getCurrentUser } from "@/lib/auth/session";
import { loadPropertyGraph } from "@/lib/data/queries";
import { db } from "@/lib/db";
import { properties } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { aiStatus } from "@/lib/ai/status";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: LayoutProps<"/app/p/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const [row] = await db.select({ name: properties.name }).from(properties).where(eq(properties.id, id)).limit(1);
  return { title: row ? `Editing ${row.name}` : "Editor", robots: { index: false } };
}

export default async function EditorLayout(props: LayoutProps<"/app/p/[id]">) {
  const { id } = await props.params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/app/p/${id}`);
  const graph = await loadPropertyGraph(id);
  const [owner] = await db.select({ ownerId: properties.ownerId }).from(properties).where(eq(properties.id, id)).limit(1);
  if (!graph || owner?.ownerId !== user.id) notFound();

  return (
    <EditorProvider key={id} graph={graph} options={{ uploadLimitBytes: env.uploadBodyLimitBytes }}>
      <EditorChrome isGuest={user.isGuest} ai={aiStatus()}>
        {props.children}
      </EditorChrome>
    </EditorProvider>
  );
}
