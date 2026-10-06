import { eq } from "drizzle-orm";
import { track } from "@/lib/analytics/server";
import { db } from "@/lib/db";
import { floors, media } from "@/lib/db/schema";
import { requireOwnedFloor } from "@/lib/data/access";
import { toFloorDTO } from "@/lib/data/mappers";
import { noteEdit, setFloorPlan } from "@/lib/data/mutations";
import { badRequest, json, route } from "@/lib/http";
import { IngestError, ingestUpload, MAX_IMAGE_BYTES } from "@/lib/media/ingest";
import { readUpload } from "@/lib/upload";

/** Upload (or replace) a floor's plan image. Body: raw file bytes. PDFs are rasterized client-side. */
export const PUT = route(async (req, ctx: RouteContext<"/api/floors/[id]/plan">) => {
  const { id } = await ctx.params;
  const { user, floor } = await requireOwnedFloor(id);
  const { bytes, filename } = await readUpload(req, MAX_IMAGE_BYTES);
  let plan;
  try {
    plan = await ingestUpload({ propertyId: floor.propertyId, bytes, filename, kind: "floorplan" });
  } catch (err) {
    if (err instanceof IngestError) throw badRequest(err.message);
    throw err;
  }
  await setFloorPlan(id, plan);
  const [row] = await db.select().from(floors).where(eq(floors.id, id)).limit(1);
  const [planRow] = await db.select().from(media).where(eq(media.id, plan.id)).limit(1);
  await track({ type: "floorplan_uploaded", userId: user.id, propertyId: floor.propertyId });
  await noteEdit(floor.propertyId, user.id);
  return json({ floor: toFloorDTO(row, planRow) });
});
