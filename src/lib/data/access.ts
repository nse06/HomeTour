import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { properties, type Property, type User } from "@/lib/db/schema";
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

/** Bumps the property's updatedAt so dashboards sort by recent activity. */
export async function touchProperty(propertyId: string): Promise<void> {
  await db.update(properties).set({ updatedAt: new Date() }).where(eq(properties.id, propertyId));
}
