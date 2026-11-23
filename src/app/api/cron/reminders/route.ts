import { timingSafeEqual } from "node:crypto";
import { env, isProduction } from "@/lib/env";
import { sendGuestReminders } from "@/server/guest-reminders";
import { deliverDue, scheduleReminders, scheduleUnfinishedNudges } from "@/server/reminders";

/**
 * Daily reminders (anniversaries, remembrance days, birthdays) and nudges for pages left unfinished. Call once or more a day from your
 * scheduler with `Authorization: Bearer $CRON_SECRET`. Safe to call repeatedly.
 */
export async function GET(request: Request) {
  if (!authorised(request.headers.get("authorization"))) return new Response("Unauthorized", { status: 401 });
  const queued = (await scheduleReminders()) + (await scheduleUnfinishedNudges());
  const sent = await deliverDue();
  const guestsReminded = await sendGuestReminders();
  return Response.json({ queued, sent, guestsReminded });
}

export const POST = GET;

function authorised(header: string | null) {
  // Locally, without a secret configured, allow it so reminders can be tried by hand.
  if (!env.CRON_SECRET) return !isProduction;
  const given = Buffer.from(header?.replace(/^Bearer\s+/i, "") ?? "");
  const expected = Buffer.from(env.CRON_SECRET);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
