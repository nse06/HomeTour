import { z } from "zod";
import { PROPERTY_TYPES } from "@/lib/db/schema";
import { ROOM_ICON_KEYS } from "@/lib/rooms";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

const optionalNumber = (min: number, max: number, int = false) =>
  z
    .union([z.number(), z.null()])
    .optional()
    .refine((v) => v === undefined || v === null || (Number.isFinite(v) && v >= min && v <= max && (!int || Number.isInteger(v))), {
      message: `Must be between ${min} and ${max}.`,
    });

export const propertyCreateSchema = z.object({
  name: z.string().trim().min(1, "Give your property a name.").max(120),
  tourTitle: z.string().trim().max(140).optional(),
  address: optionalText(200),
  propertyType: z.enum(PROPERTY_TYPES).default("house"),
});

export const propertyPatchSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    tourTitle: z.string().trim().min(1).max(140),
    address: optionalText(200),
    propertyType: z.enum(PROPERTY_TYPES),
    description: optionalText(4000),
    bedrooms: optionalNumber(0, 100),
    bathrooms: optionalNumber(0, 100),
    squareFeet: optionalNumber(0, 10_000_000, true),
    yearBuilt: optionalNumber(1600, 2100, true),
    neighborhood: optionalText(120),
    amenities: z.array(z.string().trim().min(1).max(60)).max(40),
    contactName: optionalText(120),
    contactCompany: optionalText(120),
    contactEmail: z
      .string()
      .trim()
      .max(200)
      .refine((v) => v === "" || z.email().safeParse(v).success, "Enter a valid email.")
      .transform((v) => (v === "" ? null : v))
      .nullable()
      .optional(),
    contactPhone: optionalText(40),
    coverMediaId: z.string().max(40).nullable(),
  })
  .partial();

const point = z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) });

export const regionSchema = z.union([
  z.object({
    type: z.literal("rect"),
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    w: z.number().min(0.005).max(1),
    h: z.number().min(0.005).max(1),
  }),
  z.object({
    type: z.literal("polygon"),
    points: z.array(z.tuple([z.number().min(0).max(1), z.number().min(0).max(1)])).min(3).max(64),
  }),
]);

const iconSchema = z.enum(ROOM_ICON_KEYS);

export const roomCreateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  category: z.string().max(40).optional(),
  icon: iconSchema.optional(),
  floorId: z.string().max(40).nullable().optional(),
  hotspot: point.nullable().optional(),
  region: regionSchema.nullable().optional(),
});

export const roomPatchSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    category: z.string().max(40),
    icon: iconSchema,
    description: optionalText(1200),
    features: z.array(z.string().trim().min(1).max(60)).max(12),
    floorId: z.string().max(40).nullable(),
    hotspot: point.nullable(),
    region: regionSchema.nullable(),
    coverMediaId: z.string().max(40).nullable(),
    videoUrl: z
      .string()
      .trim()
      .max(500)
      .refine((v) => v === "" || /^https:\/\/\S+$/i.test(v), "Use a full https:// link.")
      .transform((v) => (v === "" ? null : v))
      .nullable(),
  })
  .partial();

export const mediaPatchSchema = z
  .object({
    caption: optionalText(200),
    roomId: z.string().max(40).nullable(),
    kind: z.enum(["photo", "pano"]),
  })
  .partial();

export const bulkMediaSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("move"), ids: z.array(z.string().max(40)).min(1).max(500), roomId: z.string().max(40).nullable() }),
  z.object({ action: z.literal("delete"), ids: z.array(z.string().max(40)).min(1).max(500) }),
  z.object({ action: z.literal("reorder"), ids: z.array(z.string().max(40)).min(1).max(500) }),
]);

export const floorPatchSchema = z
  .object({
    name: z.string().trim().min(1).max(60),
    planType: z.enum(["none", "image", "layout"]),
    aspectRatio: z.number().min(0.25).max(4),
  })
  .partial();

export const tourSettingsSchema = z
  .object({
    accentColor: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
    showBranding: z.boolean().optional(),
    showContact: z.boolean().optional(),
    noindex: z.boolean().optional(),
    cta: z
      .object({
        enabled: z.boolean(),
        label: z.string().trim().min(1).max(40),
        type: z.enum(["url", "email", "phone"]),
        value: z.string().trim().max(500),
      })
      .optional(),
  })
  .strict();

export const tourPatchSchema = z.object({
  slug: z.string().trim().toLowerCase().optional(),
  settings: tourSettingsSchema.optional(),
});
