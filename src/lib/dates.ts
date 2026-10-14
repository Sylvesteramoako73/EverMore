// Date and timezone helpers with no dependencies; safe on server and client.
// "Local" values are wall-clock strings ("2027-06-12T14:00") interpreted in an IANA timezone.
// "Plain dates" are "YYYY-MM-DD" strings with no time or zone (birthdays, anniversaries).

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function zoneOffsetMs(date: Date, timeZone: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return asUtc - date.getTime();
}

/** Convert a wall-clock "YYYY-MM-DDTHH:mm" in `timeZone` to an absolute instant. */
export function zonedLocalToUtc(local: string, timeZone: string): Date {
  const [d, t = "00:00"] = local.split("T");
  const [y, m, day] = d.split("-").map(Number);
  const [h, min] = t.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, day, h, min);
  // Two passes settle DST transitions.
  let ts = guess - zoneOffsetMs(new Date(guess), timeZone);
  ts = guess - zoneOffsetMs(new Date(ts), timeZone);
  return new Date(ts);
}

/** The calendar date ("YYYY-MM-DD") at `instant` in `timeZone`. */
export function plainDateInZone(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(instant);
}

// ───────────────────────────── Plain-date arithmetic

type Ymd = { y: number; m: number; d: number };

export function parsePlainDate(value: string): Ymd {
  const [y, m, d] = value.split("-").map(Number);
  return { y, m, d };
}

const pad = (n: number, w = 2) => String(n).padStart(w, "0");
export const formatPlainDateIso = ({ y, m, d }: Ymd) => `${pad(y, 4)}-${pad(m)}-${pad(d)}`;

export function daysInMonth(y: number, m: number) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Add whole months, clamping the day (Jan 31 + 1 month = Feb 28/29). */
export function addMonths(date: Ymd, months: number): Ymd {
  const total = date.y * 12 + (date.m - 1) + months;
  const y = Math.floor(total / 12);
  const m = (total % 12) + 1;
  return { y, m, d: Math.min(date.d, daysInMonth(y, m)) };
}

function compare(a: Ymd, b: Ymd) {
  return a.y - b.y || a.m - b.m || a.d - b.d;
}

function dayNumber({ y, m, d }: Ymd) {
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
}

export type Duration = { years: number; months: number; days: number; totalDays: number };

/**
 * Calendar duration from `start` to `end` (both plain dates, end >= start), e.g. 1 year, 4 months, 12 days.
 * Months are counted by calendar, so leap days and month lengths are handled naturally.
 */
export function calendarDuration(startDate: string, endDate: string): Duration {
  const start = parsePlainDate(startDate);
  const end = parsePlainDate(endDate);
  if (compare(end, start) < 0) return { years: 0, months: 0, days: 0, totalDays: 0 };
  let months = (end.y - start.y) * 12 + (end.m - start.m);
  if (compare(addMonths(start, months), end) > 0) months -= 1;
  const anchor = addMonths(start, months);
  return {
    years: Math.floor(months / 12),
    months: months % 12,
    days: dayNumber(end) - dayNumber(anchor),
    totalDays: dayNumber(end) - dayNumber(start),
  };
}

/**
 * The next anniversary on or after `today`. Celebrations on 29 February are celebrated on 28 February
 * in non-leap years.
 */
export function nextAnniversary(keyDate: string, today: string): { date: string; years: number } {
  const w = parsePlainDate(keyDate);
  const t = parsePlainDate(today);
  for (let year = Math.max(t.y, w.y + 1); ; year++) {
    const candidate = { y: year, m: w.m, d: Math.min(w.d, daysInMonth(year, w.m)) };
    if (compare(candidate, t) >= 0) return { date: formatPlainDateIso(candidate), years: year - w.y };
  }
}

export function daysBetween(fromDate: string, toDate: string) {
  return dayNumber(parsePlainDate(toDate)) - dayNumber(parsePlainDate(fromDate));
}

export function addDays(date: string, days: number) {
  const { y, m, d } = parsePlainDate(date);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return formatPlainDateIso({ y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() });
}

export function describeDuration({ years, months, days }: Duration) {
  const parts = [
    years > 0 && `${years} ${years === 1 ? "year" : "years"}`,
    months > 0 && `${months} ${months === 1 ? "month" : "months"}`,
    (days > 0 || (years === 0 && months === 0)) && `${days} ${days === 1 ? "day" : "days"}`,
  ].filter(Boolean) as string[];
  return parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}` : parts[0];
}

// ───────────────────────────── Formatting

export function formatLongDate(instant: Date, timeZone: string, locale = "en-GB") {
  return new Intl.DateTimeFormat(locale, { timeZone, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(instant);
}

export function formatTime(instant: Date, timeZone: string, locale = "en-GB") {
  return new Intl.DateTimeFormat(locale, { timeZone, hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(instant);
}

/** "14:00 – 18:00 GMT", with the end date when an event runs past midnight. */
export function formatTimeRange(startsAt: Date, endsAt: Date | null, timeZone: string, locale = "en-GB") {
  if (!endsAt) return formatTime(startsAt, timeZone, locale);
  const short = new Intl.DateTimeFormat(locale, { timeZone, hour: "numeric", minute: "2-digit" });
  const sameDay = plainDateInZone(startsAt, timeZone) === plainDateInZone(endsAt, timeZone);
  const end = sameDay
    ? formatTime(endsAt, timeZone, locale)
    : `${new Intl.DateTimeFormat(locale, { timeZone, day: "numeric", month: "short" }).format(endsAt)}, ${formatTime(endsAt, timeZone, locale)}`;
  return `${short.format(startsAt)} – ${end}`;
}

/** Format a plain date without timezone drift. */
export function formatPlainDate(value: string, style: "long" | "short" = "long", locale = "en-GB") {
  const { y, m, d } = parsePlainDate(value);
  return new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    day: "numeric",
    month: style === "long" ? "long" : "short",
    year: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}
