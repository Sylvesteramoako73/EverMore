import "server-only";
import { z } from "zod";

// Server environment, validated once. Fails fast with a readable message instead of at first use.
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  /** Postgres URL. Unset in development = embedded PGlite in ./data/pglite. "memory://" = in-memory (tests). */
  DATABASE_URL: z.string().optional(),
  ALLOW_EMBEDDED_DB: z.string().optional(),
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters."),
  /** Canonical public origin, e.g. https://evermore.example. Used for links, QR codes and auth callbacks. */
  APP_URL: z.url().default("http://localhost:3000"),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("EverMore <hello@evermore.example>"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  UPLOAD_DIR: z.string().default("./data/uploads"),
  /**
   * Header carrying the real client IP, set by your proxy/CDN (e.g. "x-forwarded-for" behind a load balancer
   * that overwrites it, "cf-connecting-ip" on Cloudflare). Leave unset when not behind a trusted proxy.
   */
  TRUSTED_IP_HEADER: z.string().optional(),
  /** Shared secret for the scheduled-jobs endpoint. */
  CRON_SECRET: z.string().min(16).optional(),
  GEOCODER: z.enum(["nominatim", "off"]).default("nominatim"),
  /**
   * Paystack secret key (sk_live_… / sk_test_…). When set, guests can give by Mobile Money or card online.
   * Unset: guests see the host's MoMo details and the host confirms gifts by hand.
   */
  PAYSTACK_SECRET_KEY: z.string().optional(),
});

function load() {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${problems}\nSee .env.example.`);
  }
  return parsed.data;
}

export const env = load();
export const isProduction = env.NODE_ENV === "production";
export const appUrl = (path = "") => `${env.APP_URL.replace(/\/$/, "")}${path}`;

export const paymentsEnabled = () => Boolean(env.PAYSTACK_SECRET_KEY);
