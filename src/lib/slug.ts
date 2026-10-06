/** Paths that would collide with app routes or look official if used as tour slugs. */
export const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "app",
  "create",
  "dashboard",
  "demo",
  "embed",
  "example",
  "files",
  "help",
  "login",
  "logout",
  "new",
  "pricing",
  "settings",
  "signup",
  "support",
  "hometour",
]);

export function slugify(input: string, maxLength = 60): string {
  const slug = input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "");
  return slug || "tour";
}

export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,58}[a-z0-9])?$/;

export function validateSlug(slug: string): string | null {
  if (!SLUG_RE.test(slug)) {
    return "Use 3–60 lowercase letters, numbers, or dashes (no dash at the start or end).";
  }
  if (slug.includes("--")) return "Avoid double dashes.";
  if (RESERVED_SLUGS.has(slug)) return "That address is reserved. Try another.";
  return null;
}
