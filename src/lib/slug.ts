// Public celebration addresses: /<slug>.

// Addresses live at the root (evermore.app/<slug>), so every top-level app path must be reserved.
export const RESERVED_SLUGS = new Set([
  "about", "account", "admin", "api", "app", "auth", "blog", "c", "check-email", "contact", "dashboard", "e", "evermore",
  "faq", "forgot-password", "help", "invitations", "invite", "login", "logout", "media", "new", "onboarding", "policies",
  "pricing", "privacy", "reset-password", "sample", "samples", "settings", "sign-in", "sign-up", "signin", "signup",
  "static", "support", "terms", "w", "www",
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

/** A readable base from the headline ("Ama & Kofi" -> "ama-and-kofi"), with a fallback when unusable. */
export function titleSlugBase(title: string) {
  const base = slugify(title);
  return base.length >= 3 && !RESERVED_SLUGS.has(base) ? base : "our-celebration";
}

export function slugProblem(slug: string): string | null {
  if (!SLUG_PATTERN.test(slug)) return "Use 3–60 lowercase letters, numbers or dashes, starting and ending with a letter or number.";
  if (RESERVED_SLUGS.has(slug)) return "That address is reserved. Please choose another.";
  if (slug.includes("--")) return "Avoid double dashes.";
  return null;
}
