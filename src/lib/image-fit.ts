/**
 * Browser-side re-encoding so uploads fit a host's request-size cap (Vercel functions accept
 * at most 4.5 MB per request). Files already under the cap are sent untouched, so self-hosted
 * deployments keep full-resolution originals. HEIC is converted wherever the browser can
 * decode it (Safari), since the server only accepts JPG, PNG and WebP.
 */

const isHeic = (file: File) => /image\/hei[cf]/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);

async function decode(file: File): Promise<{ img: HTMLImageElement; release: () => void } | null> {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  try {
    // <img> decoding honours EXIF orientation, so portrait phone photos stay upright.
    await img.decode();
    return { img, release: () => URL.revokeObjectURL(url) };
  } catch {
    URL.revokeObjectURL(url);
    return null;
  }
}

const toJpeg = (canvas: HTMLCanvasElement, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));

/**
 * Returns `file` unchanged when it already fits, otherwise a JPEG re-encode that does.
 * Panoramas (2:1) keep up to 4096px — the largest size the viewer uses — other images 3200px.
 */
export async function fitImageForUpload(file: File, maxBytes: number | null): Promise<File> {
  const heic = isHeic(file);
  if (!heic && (maxBytes === null || file.size <= maxBytes)) return file;
  if (!heic && !file.type.startsWith("image/")) return file;
  const decoded = await decode(file);
  if (!decoded) return file; // let the server explain (e.g. HEIC in a browser that can't read it)
  const { img, release } = decoded;
  try {
    const width = img.naturalWidth;
    const height = img.naturalHeight;
    const longest = Math.max(width, height);
    if (!longest) return file;
    const panorama = Math.abs(width / height - 2) < 0.04;
    let edge = Math.min(longest, panorama ? 4096 : 3200);
    const limit = maxBytes ?? Number.POSITIVE_INFINITY;
    for (let attempt = 0; attempt < 5; attempt++) {
      const scale = edge / longest;
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) return file;
      ctx.fillStyle = "#ffffff"; // JPEG has no alpha: flatten transparent PNGs (floor plans) onto white
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.9, 0.82, 0.74]) {
        const blob = await toJpeg(canvas, quality);
        if (blob && blob.size <= limit) {
          return new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "photo"}.jpg`, { type: "image/jpeg", lastModified: file.lastModified });
        }
      }
      edge = Math.round(edge * 0.8);
    }
    return file;
  } finally {
    release();
  }
}
