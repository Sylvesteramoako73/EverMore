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
  /**
   * Optional separate address for the public website, e.g. https://evermore.example while APP_URL is
   * https://app.evermore.example. Unset: the website and the app share APP_URL. See next.config.ts.
   */
  SITE_URL: z.url().optional(),
  RESEND_API_KEY: z.string().optional(),
  /**
   * Temporary escape hatch for a live site without an email provider yet: "1" lets people sign up and
   * sign in without confirming their email. Remove it once RESEND_API_KEY is set.
   */
  ALLOW_UNVERIFIED_SIGNUPS: z.string().optional(),
  EMAIL_FROM: z.string().default("EverMore <hello@evermore.example>"),
  /**
   * Groq API key (free tier at https://console.groq.com). Turns on "Describe your event", which drafts
   * the details step from one sentence. Unset: the box is not shown and nothing is sent anywhere.
   */
  GROQ_API_KEY: z.string().optional(),
  /** Chat completions address. Only change it to point at a test double. */
  GROQ_API_URL: z.url().default("https://api.groq.com/openai/v1/chat/completions"),
  /** Model used for drafting. Groq retires models now and then, so this is a setting, not code. */
  GROQ_MODEL: z.string().default("openai/gpt-oss-120b"),
  /** Models that read photos of invitations and flyers, comma separated, tried in order. Must accept images. */
  GROQ_VISION_MODEL: z.string().default("qwen/qwen3.6-27b,meta-llama/llama-4-scout-17b-16e-instruct"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  UPLOAD_DIR: z.string().default("./data/uploads"),
  /** Vercel Blob store token. When set, uploads go to Blob (private) instead of UPLOAD_DIR. */
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
  /**
   * Header carrying the real client IP, set by your proxy/CDN (e.g. "x-forwarded-for" behind a load balancer
   * that overwrites it, "cf-connecting-ip" on Cloudflare). Leave unset when not behind a trusted proxy.
   */
  TRUSTED_IP_HEADER: z.string().optional(),
  /** Shared secret for the scheduled-jobs endpoint. */
  CRON_SECRET: z.string().min(16).optional(),
  GEOCODER: z.enum(["nominatim", "off"]).default("nominatim"),
  /**
   * Paystack secret key (sk_live_… / sk_test_…). Takes hosts' one-time page payment once BILLING_ENABLED
   * is "true", and online gifts once ONLINE_GIFTS_ENABLED is "true".
   */
  PAYSTACK_SECRET_KEY: z.string().optional(),
  /**
   * "true" lets guests give online through Paystack. Each fund gets a Paystack subaccount from the
   * host's Mobile Money details, so the gift is split to the host at payment time and never sits in
   * our balance. A fund without a subaccount does not offer online payment.
   */
  ONLINE_GIFTS_ENABLED: z.string().optional(),
  /** Percentage of each online gift EverMore keeps (0 to 20). Applied to new subaccounts. Default 0. */
  GIFT_FEE_PERCENT: z.string().optional(),
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

/** A Paystack key is in place (needed for hosts' page payments and online gifts). */
/** The public website address (falls back to the app address when there is no separate site). */
export const siteUrl = (path = "") => `${(env.SITE_URL ?? env.APP_URL).replace(/\/$/, "")}${path}`;
export const aiDraftingEnabled = () => Boolean(env.GROQ_API_KEY);
export const paymentsEnabled = () => Boolean(env.PAYSTACK_SECRET_KEY);

/** Guests can give by Mobile Money or card online, instead of sending MoMo to the host directly. */
export const onlineGiftsEnabled = () => paymentsEnabled() && env.ONLINE_GIFTS_ENABLED === "true";

/** Whether new accounts must confirm their email before signing in. */
export const emailVerificationRequired = env.ALLOW_UNVERIFIED_SIGNUPS !== "1";
