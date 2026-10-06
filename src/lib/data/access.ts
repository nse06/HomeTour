import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { floors, media, properties, rooms, type Floor, type Media, type Property, type Room, type User } from "@/lib/db/schema";
import { notFound, unauthorized } from "@/lib/http";

/** Loads a property the current user owns. Responds 404 (not 403) so ids can't be probed. */
export async function requireOwnedProperty(propertyId: string): Promise<{ user: User; property: Property }> {
  const user = await getCurrentUser();
  if (!user) throw unauthorized();
  const [property] = await db.select().from(properties).where(eq(properties.id, propertyId)).limit(1);
  if (!property || property.ownerId !== user.id) throw notFound("Property not found.");
  return { user, property };
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw unauthorized();
  return user;
}

export async function requireOwnedRoom(roomId: string): Promise<{ user: User; property: Property; room: Room }> {
  const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId)).limit(1);
  if (!room) throw notFound("Room not found.");
  const owned = await requireOwnedProperty(room.propertyId);
  return { ...owned, room };
}

export async function requireOwnedMedia(mediaId: string): Promise<{ user: User; property: Property; media: Media }> {
  const [row] = await db.select().from(media).where(eq(media.id, mediaId)).limit(1);
  if (!row) throw notFound("Photo not found.");
  const owned = await requireOwnedProperty(row.propertyId);
  return { ...owned, media: row };
}

export async function requireOwnedFloor(floorId: string): Promise<{ user: User; property: Property; floor: Floor }> {
  const [floor] = await db.select().from(floors).where(eq(floors.id, floorId)).limit(1);
  if (!floor) throw notFound("Floor not found.");
  const owned = await requireOwnedProperty(floor.propertyId);
  return { ...owned, floor };
}

/** Bumps the property's updatedAt so dashboards sort by recent activity. */
export async function touchProperty(propertyId: string): Promise<void> {
  await db.update(properties).set({ updatedAt: new Date() }).where(eq(properties.id, propertyId));
}
