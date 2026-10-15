import { timingSafeEqual } from "node:crypto";
import { env, isProduction } from "@/lib/env";
import { deliverDue, scheduleReminders } from "@/server/reminders";

/**
 * Daily reminders (anniversaries, remembrance days, birthdays). Call once or more a day from your
 * scheduler with `Authorization: Bearer $CRON_SECRET`. Safe to call repeatedly.
 */
export async function GET(request: Request) {
  if (!authorised(request.headers.get("authorization"))) return new Response("Unauthorized", { status: 401 });
  const queued = await scheduleReminders();
  const sent = await deliverDue();
  return Response.json({ queued, sent });
}

export const POST = GET;

function authorised(header: string | null) {
  // Locally, without a secret configured, allow it so reminders can be tried by hand.
  if (!env.CRON_SECRET) return !isProduction;
  const given = Buffer.from(header?.replace(/^Bearer\s+/i, "") ?? "");
  const expected = Buffer.from(env.CRON_SECRET);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
