import sharp from "sharp";
import type { MediaKind, MediaVariants, VariantName } from "@/lib/db/schema";
import { dhashFromPixels } from "./hash";

sharp.cache({ memory: 256, items: 64 });
sharp.concurrency(Math.max(1, Math.min(4, (globalThis.navigator?.hardwareConcurrency ?? 2) - 1)));

export interface EncodedVariant {
  name: VariantName;
  width: number;
  height: number;
  buffer: Buffer;
}

export interface ProcessedImage {
  width: number;
  height: number;
  kind: MediaKind;
  variants: EncodedVariant[];
  blurDataUrl: string;
  dhash: string;
  isPanorama: boolean;
}

/** Responsive widths served to visitors. Originals are never served. */
const PHOTO_WIDTHS: [VariantName, number][] = [
  ["thumb", 320],
  ["sm", 640],
  ["md", 1024],
  ["lg", 1600],
  ["xl", 2400],
];

const PLAN_WIDTHS: [VariantName, number][] = [
  ["thumb", 320],
  ["sm", 800],
  ["md", 1400],
  ["lg", 2400],
];

/** Equirectangular textures: 4096 is the safe WebGL max on most phones. */
const PANO_WIDTHS: [VariantName, number][] = [
  ["panoSm", 2048],
  ["pano", 4096],
];

const MAX_INPUT_PIXELS = 120_000_000; // ~120 MP: generous for panoramas, stops decompression bombs.

export function looksLikePanorama(width: number, height: number, xmp?: string): boolean {
  if (xmp && /ProjectionType[^a-z]*equirectangular/i.test(xmp)) return true;
  const ratio = width / height;
  return Math.abs(ratio - 2) < 0.02 && width >= 3000;
}

export async function processImage(
  input: Buffer,
  opts: { kind?: MediaKind; forcePanorama?: boolean } = {},
): Promise<ProcessedImage> {
  const meta = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS }).metadata();
  const width = meta.autoOrient?.width ?? meta.width;
  const height = meta.autoOrient?.height ?? meta.height;
  if (!width || !height) throw new Error("Could not read image dimensions.");

  const xmp = meta.xmpAsString ?? meta.xmp?.toString("utf8");
  const isPanorama = opts.kind === "floorplan" ? false : (opts.forcePanorama ?? looksLikePanorama(width, height, xmp));
  const kind: MediaKind = opts.kind === "floorplan" ? "floorplan" : isPanorama ? "pano" : "photo";

  // Decode + orient once at the largest size we need, then derive every variant from that.
  const ladder = kind === "floorplan" ? PLAN_WIDTHS : PHOTO_WIDTHS;
  const maxNeeded = isPanorama ? 4096 : ladder[ladder.length - 1][1];
  const base = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS, autoOrient: true })
    .resize({ width: Math.min(width, maxNeeded), withoutEnlargement: true })
    .flatten({ background: "#ffffff" })
    .toColourspace("srgb")
    .raw()
    .toBuffer({ resolveWithObject: true });
  const raw = { width: base.info.width, height: base.info.height, channels: base.info.channels };
  const fromBase = () => sharp(base.data, { raw });

  const quality = kind === "floorplan" ? 90 : 78;
  const targets: [VariantName, number][] = [...ladder, ...(isPanorama ? PANO_WIDTHS : [])];

  const variants: EncodedVariant[] = [];
  const seenWidths = new Set<number>();
  for (const [name, targetWidth] of targets) {
    const w = Math.min(targetWidth, raw.width);
    const isPanoVariant = name === "pano" || name === "panoSm";
    // Small originals: don't emit several identical copies of the same size.
    if (!isPanoVariant && seenWidths.has(w)) continue;
    if (!isPanoVariant) seenWidths.add(w);
    const { data, info } = await fromBase()
      .resize({ width: w, withoutEnlargement: true })
      .webp({ quality, effort: 4, smartSubsample: kind !== "floorplan" })
      .toBuffer({ resolveWithObject: true });
    variants.push({ name, width: info.width, height: info.height, buffer: data });
  }

  const blur = await fromBase().resize({ width: 24 }).webp({ quality: 40 }).toBuffer();
  const grid = await fromBase().greyscale().resize(9, 8, { fit: "fill" }).raw().toBuffer();

  return {
    width,
    height,
    kind,
    variants,
    blurDataUrl: `data:image/webp;base64,${blur.toString("base64")}`,
    dhash: dhashFromPixels(grid),
    isPanorama,
  };
}

/** Small JPEG for vision-model input: cheap tokens, still enough detail to recognize rooms. */
export async function toAiJpeg(input: Uint8Array, maxSide = 768): Promise<Buffer> {
  return sharp(input, { autoOrient: true })
    .resize({ width: maxSide, height: maxSide, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 72, mozjpeg: true })
    .toBuffer();
}

/** Poster frames captured client-side from uploaded videos. */
export async function processPoster(input: Buffer): Promise<{ buffer: Buffer; width: number; height: number; blurDataUrl: string }> {
  const { data, info } = await sharp(input, { autoOrient: true })
    .resize({ width: 1280, withoutEnlargement: true })
    .webp({ quality: 76 })
    .toBuffer({ resolveWithObject: true });
  const blur = await sharp(data).resize({ width: 24 }).webp({ quality: 40 }).toBuffer();
  return { buffer: data, width: info.width, height: info.height, blurDataUrl: `data:image/webp;base64,${blur.toString("base64")}` };
}

export function variantsToRecord(
  variants: EncodedVariant[],
  keyFor: (name: VariantName) => string,
): MediaVariants {
  const out: MediaVariants = {};
  for (const v of variants) {
    out[v.name] = { key: keyFor(v.name), width: v.width, height: v.height, bytes: v.buffer.byteLength };
  }
  return out;
}
