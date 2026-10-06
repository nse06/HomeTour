import { assertSafeKey, storage } from "@/lib/storage";
import { contentTypeForKey } from "@/lib/storage/types";

const CACHE = "public, max-age=31536000, immutable";

/**
 * Serves processed media (variants, posters, videos) from storage.
 * Only the `m/` prefix is public; originals under `o/` are never served.
 * In production behind S3_PUBLIC_URL this route is bypassed entirely by the CDN.
 */
export async function GET(request: Request, ctx: RouteContext<"/files/[...key]">) {
  const { key: parts } = await ctx.params;
  const key = parts.join("/");
  try {
    assertSafeKey(key);
  } catch {
    return new Response("Not found", { status: 404 });
  }
  if (!key.startsWith("m/")) return new Response("Not found", { status: 404 });

  const store = await storage();
  const contentType = contentTypeForKey(key);
  const range = request.headers.get("range");

  if (range && contentType.startsWith("video/")) {
    const total = await store.size(key);
    if (total === null) return new Response("Not found", { status: 404 });
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    let start = match?.[1] ? Number(match[1]) : 0;
    let end = match?.[2] ? Number(match[2]) : total - 1;
    if (!match?.[1] && match?.[2]) {
      // Suffix range: last N bytes.
      start = Math.max(0, total - Number(match[2]));
      end = total - 1;
    }
    end = Math.min(end, total - 1);
    if (start > end || start >= total) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${total}` } });
    }
    const stream = await store.getRange(key, start, end);
    if (!stream) return new Response("Not found", { status: 404 });
    return new Response(stream, {
      status: 206,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(end - start + 1),
        "Content-Range": `bytes ${start}-${end}/${total}`,
        "Accept-Ranges": "bytes",
        "Cache-Control": CACHE,
      },
    });
  }

  const object = await store.get(key);
  if (!object) return new Response("Not found", { status: 404 });
  return new Response(object.body as BodyInit, {
    headers: {
      "Content-Type": object.contentType,
      "Content-Length": String(object.body.byteLength),
      "Accept-Ranges": "bytes",
      "Cache-Control": CACHE,
    },
  });
}
