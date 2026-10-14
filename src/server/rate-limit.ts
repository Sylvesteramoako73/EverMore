import "server-only";
import { headers } from "next/headers";
import { env } from "@/lib/env";

// Fixed-window limiter in process memory. Good for one instance; with several, back it with Redis
// (e.g. Upstash) behind the same function.
const buckets = new Map<string, { count: number; resetAt: number }>();
let lastSweep = 0;

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  if (now - lastSweep > 60_000) {
    lastSweep = now;
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
  }
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= limit;
}

/**
 * The client's IP, only when a trusted proxy header is configured (TRUSTED_IP_HEADER). Request headers
 * like X-Forwarded-For can be set by anyone, so without a trusted proxy we return null rather than guess.
 */
export async function clientIp(): Promise<string | null> {
  if (!env.TRUSTED_IP_HEADER) return process.env.NODE_ENV === "production" ? null : "127.0.0.1";
  const value = (await headers()).get(env.TRUSTED_IP_HEADER);
  if (!value) return null;
  // A proxy appends the address it saw; the last entry is the one it vouches for.
  return value.split(",").map((s) => s.trim()).filter(Boolean).at(-1) ?? null;
}

/**
 * Limit public submissions per IP when known, and always per celebration as a backstop, so a flood
 * can't fill a couple's RSVPs or guestbook even when the client IP is unknown.
 */
export async function limitPublicAction(action: string, celebrationId: string, perIp: number, perCelebration: number, windowMs: number) {
  const ip = await clientIp();
  if (ip && !rateLimit(`${action}:${celebrationId}:${ip}`, perIp, windowMs)) return false;
  return rateLimit(`${action}:${celebrationId}:all`, perCelebration, windowMs);
}
