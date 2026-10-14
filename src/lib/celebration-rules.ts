import { plainDateInZone, zonedLocalToUtc } from "./dates";

// Pure rules shared by pages, actions and tests. `now` is injectable for testing.

export type EventLike = {
  id: string;
  startsAt: Date;
  endsAt: Date | null;
  timezone: string;
  rsvpRequired: boolean;
  inviteOnly: boolean;
};

/** The event the countdown follows: the chosen one, else the earliest. */
export function primaryEvent<E extends EventLike>(events: E[], primaryEventId: string | null): E | null {
  return events.find((e) => e.id === primaryEventId) ?? [...events].sort((a, b) => +a.startsAt - +b.startsAt)[0] ?? null;
}

/**
 * The yearly date of a celebration (wedding day, birthday, date of passing): the host's chosen date,
 * else the primary event's calendar date in its own timezone.
 */
export function yearlyDate(keyDate: string | null, primary: EventLike | null): string | null {
  if (keyDate) return keyDate;
  return primary ? plainDateInZone(primary.startsAt, primary.timezone) : null;
}

export type Phase = "planning" | "upcoming" | "today" | "after";

/**
 * Where the celebration is in time, which decides what the public page leads with:
 * - planning: no events yet
 * - upcoming: countdown to the primary event
 * - today: the primary event has started and it's still that day at the venue
 * - after: afterwards; the page becomes a memory page
 */
export function celebrationPhase(primary: EventLike | null, now = Date.now()): Phase {
  if (!primary) return "planning";
  if (now < primary.startsAt.getTime()) return "upcoming";
  const today = plainDateInZone(new Date(now), primary.timezone);
  return today === plainDateInZone(primary.startsAt, primary.timezone) ? "today" : "after";
}

export type RsvpSettings = { rsvpEnabled: boolean; rsvpDeadline: string | null; timezone: string };

export function rsvpDeadlinePassed(settings: RsvpSettings, now = Date.now()) {
  return (
    settings.rsvpDeadline !== null && zonedLocalToUtc(`${settings.rsvpDeadline}T23:59`, settings.timezone).getTime() < now
  );
}

/**
 * Events a visitor may RSVP to right now: RSVP-required, not yet started, and visible to them.
 * Invite-only events need an invitation that includes them. An invitation with an explicit event list
 * restricts the guest to exactly those events.
 */
export function answerableEvents<E extends EventLike>(
  settings: RsvpSettings,
  events: E[],
  { now = Date.now(), invitedEventIds }: { now?: number; invitedEventIds?: ReadonlySet<string> | null } = {},
): E[] {
  if (!settings.rsvpEnabled || rsvpDeadlinePassed(settings, now)) return [];
  return events.filter((e) => {
    if (!e.rsvpRequired || e.startsAt.getTime() <= now) return false;
    if (invitedEventIds && invitedEventIds.size > 0) return invitedEventIds.has(e.id);
    return !e.inviteOnly;
  });
}

/** Events shown on the page to this visitor. */
export function visibleEvents<E extends EventLike>(events: E[], invitedEventIds?: ReadonlySet<string> | null): E[] {
  if (invitedEventIds && invitedEventIds.size > 0) return events.filter((e) => invitedEventIds.has(e.id) || !e.inviteOnly);
  return events.filter((e) => !e.inviteOnly);
}

/** Form field name for a guest's answer to one event. */
export const rsvpField = (eventId: string) => `event_${eventId}`;
