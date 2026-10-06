import { z } from "zod";
import { AiBudgetError } from "@/lib/ai/classify";
import { AiUnavailableError, describeRooms } from "@/lib/ai/describe";
import { AiError } from "@/lib/ai/providers";
import { requireOwnedProperty } from "@/lib/data/access";
import { toRoomDTO } from "@/lib/data/mappers";
import { noteEdit } from "@/lib/data/mutations";
import { HttpError, json, readJson, route } from "@/lib/http";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const maxDuration = 180;

/** Writes grounded descriptions for rooms without one (or the given rooms when force=true). */
export const POST = route(async (req, ctx: RouteContext<"/api/properties/[id]/ai/describe">) => {
  const { id } = await ctx.params;
  const { user } = await requireOwnedProperty(id);
  if (!rateLimit(`ai-describe:${user.id}:${clientIp(req.headers)}`, 20, 60_000).ok) {
    throw new HttpError(429, "Too many requests — give it a moment.", "rate_limited");
  }
  const body = await readJson(req, z.object({ roomIds: z.array(z.string().max(40)).max(100).optional(), force: z.boolean().optional() }));
  try {
    const rooms = await describeRooms({ propertyId: id, userId: user.id, roomIds: body.roomIds, force: body.force });
    if (rooms.length) await noteEdit(id, user.id);
    return json({ rooms: rooms.map(toRoomDTO) });
  } catch (err) {
    if (err instanceof AiBudgetError) throw new HttpError(402, err.message, "ai_budget");
    if (err instanceof AiUnavailableError) throw new HttpError(503, err.message, "ai_off");
    if (err instanceof AiError) throw new HttpError(502, "The AI writer couldn't finish. Please try again.", "ai_failed");
    throw err;
  }
});
