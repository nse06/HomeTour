/**
 * Generates the optimized marketing images in public/landing from the demo assets.
 *   node scripts/build-landing-assets.mjs
 * Outputs are committed so the homepage never depends on the database or storage.
 */
import { mkdirSync } from "node:fs";
import sharp from "sharp";

const OUT = "public/landing";
mkdirSync(OUT, { recursive: true });

const photos = {
  exterior: "exterior-front-dusk",
  living: "living-room-timber-wall",
  kitchen: "kitchen-island-pendants",
  dining: "dining-staircase",
  primary: "primary-bedroom-black-frames",
  bedroom: "bedroom-sunlit",
  bathroom: "bathroom-timber-vanity",
  patio: "patio-deck-garden",
  "living-2": "living-room-deck-view",
  "kitchen-2": "kitchen-breakfast-bar",
  "kitchen-3": "kitchen-marble-splashback",
  "exterior-2": "exterior-facade-evening",
  "primary-2": "primary-bedroom-reading-chair",
  "bathroom-2": "bathroom-freestanding-tub",
  "dining-2": "dining-garden-doors",
  "patio-2": "patio-rear-deck",
};

for (const [name, file] of Object.entries(photos)) {
  const input = `seed/demo/photos/${file}.jpg`;
  for (const width of [480, 960, 1600]) {
    await sharp(input).resize({ width }).webp({ quality: 74, effort: 5 }).toFile(`${OUT}/${name}-${width}.webp`);
  }
}

await sharp("seed/demo/floorplan.png").resize({ width: 1400 }).webp({ quality: 88, effort: 5 }).toFile(`${OUT}/floorplan-1400.webp`);
await sharp("seed/demo/floorplan.png").resize({ width: 800 }).webp({ quality: 88, effort: 5 }).toFile(`${OUT}/floorplan-800.webp`);
console.log("✓ landing assets written to", OUT);
