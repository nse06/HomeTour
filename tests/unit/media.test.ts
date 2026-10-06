import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { findDuplicates, planAssignments } from "@/lib/ai/organize";
import { dhashFromPixels, hammingDistance, isNearDuplicate } from "@/lib/media/hash";
import { looksLikePanorama, processImage } from "@/lib/media/process";
import { sniff } from "@/lib/media/sniff";

const bytes = (...xs: (number | string)[]) =>
  new Uint8Array(xs.flatMap((x) => (typeof x === "string" ? [...x].map((c) => c.charCodeAt(0)) : [x])).concat(new Array(16).fill(0)));

describe("sniff", () => {
  it("detects formats by magic bytes", () => {
    expect(sniff(bytes(0xff, 0xd8, 0xff, 0xe0)).kind).toBe("image");
    expect(sniff(bytes(0x89, "PNG")).ext).toBe("png");
    expect(sniff(bytes("RIFF", 0, 0, 0, 0, "WEBP")).ext).toBe("webp");
    expect(sniff(bytes(0, 0, 0, 0x18, "ftypheic")).kind).toBe("heic");
    expect(sniff(bytes(0, 0, 0, 0x18, "ftypisom")).kind).toBe("video");
    expect(sniff(bytes(0, 0, 0, 0x18, "ftypqt  ")).ext).toBe("mov");
    expect(sniff(bytes("%PDF-1.7")).kind).toBe("pdf");
    expect(sniff(bytes("hello world, not an image")).kind).toBe("unknown");
  });
});

describe("dhash", () => {
  it("is deterministic and measures distance", () => {
    const grid = Uint8Array.from({ length: 72 }, (_, i) => (i * 37) % 255);
    const a = dhashFromPixels(grid);
    expect(a).toHaveLength(16);
    expect(dhashFromPixels(grid)).toBe(a);
    expect(hammingDistance(a, a)).toBe(0);
    expect(hammingDistance("0000000000000000", "000000000000000f")).toBe(4);
    expect(isNearDuplicate("0000000000000000", "00000000000000ff")).toBe(false);
    expect(isNearDuplicate("0000000000000000", "000000000000003f")).toBe(true);
    expect(isNearDuplicate(null, a)).toBe(false);
  });

  it("flags a re-encoded copy of the same photo as a near-duplicate", async () => {
    const base = await sharp({ create: { width: 640, height: 480, channels: 3, background: "#808080" } })
      .composite([{ input: Buffer.from('<svg width="640" height="480"><rect x="40" y="40" width="300" height="200" fill="#222"/><circle cx="480" cy="300" r="90" fill="#eee"/></svg>') }])
      .jpeg({ quality: 90 })
      .toBuffer();
    const copy = await sharp(base).resize(320).jpeg({ quality: 50 }).toBuffer();
    const [a, b] = await Promise.all([processImage(base), processImage(copy)]);
    expect(isNearDuplicate(a.dhash, b.dhash)).toBe(true);
  });
});

describe("processImage", () => {
  it("creates responsive variants without upscaling and a blur placeholder", async () => {
    const input = await sharp({ create: { width: 1200, height: 800, channels: 3, background: "#a0b0c0" } }).jpeg().toBuffer();
    const out = await processImage(input);
    expect(out.kind).toBe("photo");
    expect(out.width).toBe(1200);
    const widths = out.variants.map((v) => v.width);
    expect(widths).toEqual([320, 640, 1024, 1200]);
    expect(out.blurDataUrl.startsWith("data:image/webp;base64,")).toBe(true);
  });

  it("detects equirectangular panoramas", async () => {
    expect(looksLikePanorama(6000, 3000)).toBe(true);
    expect(looksLikePanorama(1200, 600)).toBe(false);
    expect(looksLikePanorama(4000, 3000)).toBe(false);
    expect(looksLikePanorama(1000, 800, '<GPano:ProjectionType>equirectangular</GPano:ProjectionType>')).toBe(true);
    const pano = await sharp({ create: { width: 4000, height: 2000, channels: 3, background: "#777" } }).jpeg().toBuffer();
    const out = await processImage(pano);
    expect(out.kind).toBe("pano");
    expect(out.variants.find((v) => v.name === "pano")?.width).toBe(4000);
    expect(out.variants.find((v) => v.name === "panoSm")?.width).toBe(2048);
  });

  it("treats floor plans as plans even when they are 2:1", async () => {
    const plan = await sharp({ create: { width: 4000, height: 2000, channels: 3, background: "#fff" } }).png().toBuffer();
    expect((await processImage(plan, { kind: "floorplan" })).kind).toBe("floorplan");
  });
});

describe("tour builder", () => {
  const d = (s: string) => new Date(s);
  it("groups photos by AI category and never moves user-placed photos", () => {
    const groups = planAssignments([
      { id: "1", aiCategory: "kitchen", roomAssignedBy: null },
      { id: "2", aiCategory: "kitchen", roomAssignedBy: "ai" },
      { id: "3", aiCategory: "kitchen", roomAssignedBy: "user" },
      { id: "4", aiCategory: null, roomAssignedBy: null },
      { id: "5", aiCategory: "bathroom", roomAssignedBy: null },
    ]);
    expect(groups.get("kitchen")).toEqual(["1", "2"]);
    expect(groups.get("bathroom")).toEqual(["5"]);
    expect([...groups.values()].flat()).not.toContain("3");
  });

  it("keeps the better shot and flags its near-duplicate", () => {
    const dupes = findDuplicates([
      { id: "a", dhash: "0000000000000000", aiQuality: 60, createdAt: d("2026-01-01") },
      { id: "b", dhash: "0000000000000001", aiQuality: 90, createdAt: d("2026-01-02") },
      { id: "c", dhash: "ffffffffffffffff", aiQuality: 50, createdAt: d("2026-01-03") },
    ]);
    expect(dupes.get("a")).toBe("b");
    expect(dupes.has("b")).toBe(false);
    expect(dupes.has("c")).toBe(false);
  });
});
