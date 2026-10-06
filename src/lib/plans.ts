import type { User } from "@/lib/db/schema";

/**
 * Plan entitlements. Creation is never paywalled. While BILLING_ENABLED is false
 * (early access) every account gets every feature; the matrix below is what paid
 * plans will gate once billing ships, so feature code already asks the right question.
 */

export type PlanId = "free" | "pro" | "business";

export type Feature =
  | "removeBranding"
  | "customBranding"
  | "analytics"
  | "advancedAnalytics"
  | "video"
  | "qrCodes"
  | "embed"
  | "leadCapture"
  | "customDomain"
  | "teamMembers";

export interface Plan {
  id: PlanId;
  name: string;
  priceMonthly: number;
  tagline: string;
  maxActiveTours: number;
  maxPhotosPerTour: number;
  features: Feature[];
  highlights: string[];
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    tagline: "Everything you need for your first tour.",
    maxActiveTours: 1,
    maxPhotosPerTour: 40,
    features: [],
    highlights: ["1 active tour", "Up to 40 photos", "AI photo sorting", "Shareable link", "HomeTour branding"],
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceMonthly: 15,
    tagline: "For hosts and agents with a few listings.",
    maxActiveTours: Number.POSITIVE_INFINITY,
    maxPhotosPerTour: 200,
    features: ["removeBranding", "customBranding", "analytics", "video", "qrCodes", "embed"],
    highlights: [
      "Unlimited tours",
      "Remove HomeTour branding",
      "Custom colors & logo",
      "Visitor analytics",
      "Video & 360° media",
      "QR codes & website embeds",
    ],
  },
  business: {
    id: "business",
    name: "Realtor / Business",
    priceMonthly: 39,
    tagline: "For brokerages, property managers and venues.",
    maxActiveTours: Number.POSITIVE_INFINITY,
    maxPhotosPerTour: 500,
    features: [
      "removeBranding",
      "customBranding",
      "analytics",
      "advancedAnalytics",
      "video",
      "qrCodes",
      "embed",
      "leadCapture",
      "customDomain",
      "teamMembers",
    ],
    highlights: [
      "Everything in Pro",
      "Lead capture",
      "Team members",
      "Custom domain",
      "Advanced analytics",
      "Branded tours",
    ],
  },
};

/** One-time option for people who don't want a subscription. */
export const PER_TOUR_PRICE = 29;

export function planFor(user: Pick<User, "plan"> | null | undefined): Plan {
  return PLANS[(user?.plan as PlanId) ?? "free"] ?? PLANS.free;
}

export function billingEnabled(): boolean {
  return ["1", "true", "yes", "on"].includes((process.env.BILLING_ENABLED || "").toLowerCase());
}

export function can(user: Pick<User, "plan"> | null | undefined, feature: Feature): boolean {
  if (!billingEnabled()) return true;
  return planFor(user).features.includes(feature);
}

export function maxActiveTours(user: Pick<User, "plan"> | null | undefined): number {
  if (!billingEnabled()) return Number.POSITIVE_INFINITY;
  return planFor(user).maxActiveTours;
}

export function maxPhotosPerTour(user: Pick<User, "plan"> | null | undefined): number {
  if (!billingEnabled()) return 300;
  return planFor(user).maxPhotosPerTour;
}
