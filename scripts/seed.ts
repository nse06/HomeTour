/**
 * Seeds the public example tour (idempotent).
 *   npm run db:seed            # create if missing
 *   npm run db:seed -- --force # rebuild from scratch
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { eq, inArray } from "drizzle-orm";
import { DEMO_PROPERTY, DEMO_ROOMS, PLAN_SIZE } from "../seed/demo/content";
import { db } from "../src/lib/db";
import { floors, media, properties, rooms, tours, users } from "../src/lib/db/schema";
import { DEMO_SLUG, DEMO_USER_ID } from "../src/lib/demo";
import { newId } from "../src/lib/ids";
import { deleteMediaObjects, ingestUpload } from "../src/lib/media/ingest";

const SEED_DIR = path.resolve("seed/demo");
const force = process.argv.includes("--force");

async function removeExisting(propertyId: string) {
  const rows = await db.select().from(media).where(eq(media.propertyId, propertyId));
  await deleteMediaObjects(rows);
  await db.delete(properties).where(eq(properties.id, propertyId));
}

async function main() {
  const [existing] = await db.select().from(tours).where(eq(tours.slug, DEMO_SLUG)).limit(1);
  if (existing && !force) {
    console.log(`✓ Demo tour already seeded (/t/${DEMO_SLUG})`);
    return;
  }
  if (existing) await removeExisting(existing.propertyId);

  const started = Date.now();
  await db
    .insert(users)
    .values({ id: DEMO_USER_ID, name: "HomeTour Demo", isGuest: false, plan: "business" })
    .onConflictDoNothing();

  const propertyId = newId();
  await db.insert(properties).values({ id: propertyId, ownerId: DEMO_USER_ID, ...DEMO_PROPERTY });

  // Floor plan
  const planBytes = readFileSync(path.join(SEED_DIR, "floorplan.png"));
  const plan = await ingestUpload({ propertyId, bytes: planBytes, filename: "floorplan.png", kind: "floorplan" });
  const floorId = newId();
  await db.insert(floors).values({
    id: floorId,
    propertyId,
    name: "Main level",
    planType: "image",
    planMediaId: plan.id,
    aspectRatio: (plan.width ?? PLAN_SIZE.width) / (plan.height ?? PLAN_SIZE.height),
  });

  // Rooms + photos
  let coverMediaId: string | null = null;
  for (const [index, room] of DEMO_ROOMS.entries()) {
    const roomId = newId();
    await db.insert(rooms).values({
      id: roomId,
      propertyId,
      floorId: room.hotspot ? floorId : null,
      name: room.name,
      category: room.category,
      icon: room.icon,
      description: room.description,
      descriptionSource: "user",
      features: room.features,
      sortOrder: index,
      hotspotX: room.hotspot ? room.hotspot[0] / PLAN_SIZE.width : null,
      hotspotY: room.hotspot ? room.hotspot[1] / PLAN_SIZE.height : null,
    });

    const ids: string[] = [];
    for (const file of room.photos) {
      const bytes = readFileSync(path.join(SEED_DIR, "photos", file));
      const m = await ingestUpload({ propertyId, bytes, filename: file, roomId });
      ids.push(m.id);
      process.stdout.write(".");
    }
    if (room.pano) {
      const bytes = readFileSync(path.join(SEED_DIR, "pano", room.pano));
      const m = await ingestUpload({ propertyId, bytes, filename: room.pano, roomId, forcePanorama: true });
      ids.push(m.id);
      process.stdout.write("◎");
    }
    await db.update(rooms).set({ coverMediaId: ids[0] ?? null }).where(eq(rooms.id, roomId));
    if (index === 0) coverMediaId = ids[0] ?? null;
  }
  // Seeded photos are placed deliberately: mark them as user-assigned so the AI never moves them.
  await db.update(media).set({ roomAssignedBy: "user" }).where(eq(media.propertyId, propertyId));
  await db.update(properties).set({ coverMediaId }).where(eq(properties.id, propertyId));

  await db.insert(tours).values({
    id: newId(),
    propertyId,
    slug: DEMO_SLUG,
    status: "published",
    publishedAt: new Date(),
    settings: {
      showBranding: true,
      showContact: true,
      cta: { enabled: true, label: "Request a showing", type: "email", value: DEMO_PROPERTY.contactEmail },
    },
  });

  const count = await db.select({ id: media.id }).from(media).where(inArray(media.propertyId, [propertyId]));
  console.log(`\n✓ Seeded demo tour with ${count.length} media in ${((Date.now() - started) / 1000).toFixed(1)}s → /t/${DEMO_SLUG}`);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
