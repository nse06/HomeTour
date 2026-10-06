import { headers } from "next/headers";
import { getAppUrl } from "@/lib/env";

/**
 * Public origin for absolute links (share URLs, OG images, embeds).
 * Uses APP_URL / NEXT_PUBLIC_APP_URL when configured; otherwise trusts the
 * request's (proxy-forwarded) host so a deploy never emits localhost links.
 */
export async function requestOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (configured) return configured.replace(/\/+$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return getAppUrl();
  const proto = h.get("x-forwarded-proto")?.split(",")[0] ?? (/^(localhost|127\.|\[::1\])/.test(host) ? "http" : "https");
  return `${proto}://${host}`;
}
