// Public wedding addresses: /w/<slug>.

export const RESERVED_SLUGS = new Set([
  "admin", "api", "app", "auth", "dashboard", "help", "login", "logout", "new", "onboarding", "pricing",
  "privacy", "settings", "sign-in", "sign-up", "signin", "signup", "support", "terms", "w", "www", "evermore",
  "sample", "samples", "invite", "invitations",
]);

export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,58}[a-z0-9])$/;

export function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
    .replace(/-+$/, "");
}

/** "ama-and-kofi" style base for a couple, falling back when names don't produce a usable slug. */
export function coupleSlugBase(partnerOne: string, partnerTwo: string) {
  const base = slugify(`${partnerOne} and ${partnerTwo}`);
  return base.length >= 3 && !RESERVED_SLUGS.has(base) ? base : "our-wedding";
}

export function slugProblem(slug: string): string | null {
  if (!SLUG_PATTERN.test(slug)) return "Use 3–60 lowercase letters, numbers or dashes, starting and ending with a letter or number.";
  if (RESERVED_SLUGS.has(slug)) return "That address is reserved. Please choose another.";
  if (slug.includes("--")) return "Avoid double dashes.";
  return null;
}
