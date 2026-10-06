/** Identify uploads by magic bytes rather than trusting file names or client MIME types. */
export type SniffedType =
  | { kind: "image"; mime: "image/jpeg" | "image/png" | "image/webp" | "image/avif" | "image/gif" | "image/tiff"; ext: string }
  | { kind: "heic"; mime: "image/heic"; ext: "heic" }
  | { kind: "video"; mime: "video/mp4" | "video/quicktime" | "video/webm"; ext: "mp4" | "mov" | "webm" }
  | { kind: "pdf"; mime: "application/pdf"; ext: "pdf" }
  | { kind: "unknown" };

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(start, start + length));
}

export function sniff(bytes: Uint8Array): SniffedType {
  if (bytes.length < 12) return { kind: "unknown" };
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { kind: "image", mime: "image/jpeg", ext: "jpg" };
  if (bytes[0] === 0x89 && ascii(bytes, 1, 3) === "PNG") return { kind: "image", mime: "image/png", ext: "png" };
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") return { kind: "image", mime: "image/webp", ext: "webp" };
  if (ascii(bytes, 0, 4) === "GIF8") return { kind: "image", mime: "image/gif", ext: "gif" };
  if (
    (bytes[0] === 0x49 && bytes[1] === 0x49 && bytes[2] === 0x2a) ||
    (bytes[0] === 0x4d && bytes[1] === 0x4d && bytes[3] === 0x2a)
  ) {
    return { kind: "image", mime: "image/tiff", ext: "tif" };
  }
  if (ascii(bytes, 0, 5) === "%PDF-") return { kind: "pdf", mime: "application/pdf", ext: "pdf" };
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    return { kind: "video", mime: "video/webm", ext: "webm" };
  }
  if (ascii(bytes, 4, 4) === "ftyp") {
    const brand = ascii(bytes, 8, 4).toLowerCase();
    if (brand.startsWith("avif") || brand.startsWith("avis")) return { kind: "image", mime: "image/avif", ext: "avif" };
    if (["heic", "heix", "hevc", "heim", "heis", "mif1", "msf1"].includes(brand)) {
      return { kind: "heic", mime: "image/heic", ext: "heic" };
    }
    if (brand.startsWith("qt")) return { kind: "video", mime: "video/quicktime", ext: "mov" };
    return { kind: "video", mime: "video/mp4", ext: "mp4" };
  }
  return { kind: "unknown" };
}
