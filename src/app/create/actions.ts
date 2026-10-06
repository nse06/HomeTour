"use server";

import { redirect } from "next/navigation";
import { track } from "@/lib/analytics/server";
import { ensureUser } from "@/lib/auth/session";
import { createProperty } from "@/lib/data/mutations";
import { propertyCreateSchema } from "@/lib/validation";

export interface CreateState {
  error?: string;
}

export async function createPropertyAction(_prev: CreateState, form: FormData): Promise<CreateState> {
  const parsed = propertyCreateSchema.safeParse({
    name: form.get("name"),
    tourTitle: form.get("tourTitle") || undefined,
    address: form.get("address") ?? null,
    propertyType: form.get("propertyType") || "house",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };

  const user = await ensureUser();
  const property = await createProperty(user.id, parsed.data);
  await track({ type: "property_created", userId: user.id, propertyId: property.id });
  redirect(`/app/p/${property.id}/floor-plan`);
}
