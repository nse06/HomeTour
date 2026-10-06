import { badRequest, HttpError } from "@/lib/http";

/**
 * Reads a raw-body upload (the browser sends the File directly, which gives us real
 * per-file progress events and avoids multipart parsing). Filename comes from ?filename=.
 */
export async function readUpload(request: Request, maxBytes: number): Promise<{ bytes: Buffer; filename: string }> {
  const declared = Number(request.headers.get("content-length") || "0");
  if (declared > maxBytes) throw new HttpError(413, `File is too large (max ${Math.round(maxBytes / 1024 / 1024)} MB).`);
  const url = new URL(request.url);
  const filename = (url.searchParams.get("filename") || "upload").replace(/[\\/\u0000-\u001f]/g, "_").slice(0, 200);
  const buffer = Buffer.from(await request.arrayBuffer());
  if (buffer.byteLength === 0) throw badRequest("Empty file.");
  if (buffer.byteLength > maxBytes) throw new HttpError(413, `File is too large (max ${Math.round(maxBytes / 1024 / 1024)} MB).`);
  return { bytes: buffer, filename };
}
