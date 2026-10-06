import { requireOwnedMedia } from "@/lib/data/access";
import { toMediaDTO } from "@/lib/data/mappers";
import { badRequest, json, route } from "@/lib/http";
import { attachPoster, IngestError } from "@/lib/media/ingest";
import { readUpload } from "@/lib/upload";

/** Poster frame for a video, captured in the browser (no server-side ffmpeg needed). */
export const POST = route(async (req, ctx: RouteContext<"/api/media/[id]/poster">) => {
  const { id } = await ctx.params;
  const { media: row } = await requireOwnedMedia(id);
  if (row.kind !== "video") throw badRequest("Posters are only for videos.");
  const { bytes } = await readUpload(req, 8 * 1024 * 1024);
  try {
    return json({ media: toMediaDTO(await attachPoster(row, bytes)) });
  } catch (err) {
    if (err instanceof IngestError) throw badRequest(err.message);
    throw err;
  }
});
