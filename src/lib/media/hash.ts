/**
 * Difference hash (dHash) from a 9x8 grayscale pixel grid: 64 bits, one per horizontal
 * neighbour comparison. Robust to resizing/re-encoding, so it flags near-duplicate uploads
 * (burst shots, the same photo exported twice) without any AI.
 */
export function dhashFromPixels(pixels: Uint8Array | Buffer, width = 9, height = 8): string {
  if (pixels.length < width * height) throw new Error("Not enough pixels for dHash");
  let hex = "";
  let nibble = 0;
  let bits = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width - 1; x++) {
      const left = pixels[y * width + x];
      const right = pixels[y * width + x + 1];
      nibble = (nibble << 1) | (left < right ? 1 : 0);
      bits++;
      if (bits === 4) {
        hex += nibble.toString(16);
        nibble = 0;
        bits = 0;
      }
    }
  }
  return hex;
}

export function hammingDistance(a: string, b: string): number {
  if (a.length !== b.length) return Number.POSITIVE_INFINITY;
  let dist = 0;
  for (let i = 0; i < a.length; i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (x) {
      dist += x & 1;
      x >>= 1;
    }
  }
  return dist;
}

/** ≤ 6 of 64 bits differing is a near-identical frame. */
export const NEAR_DUPLICATE_THRESHOLD = 6;

export function isNearDuplicate(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  return hammingDistance(a, b) <= NEAR_DUPLICATE_THRESHOLD;
}
