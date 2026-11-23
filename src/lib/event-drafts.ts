// Events the host described in "Describe your event". They are kept in this browser until the host
// reviews them in the programme step, so nothing is saved to the page before they say so.

export type EventDraft = { name: string; date: string; time: string; venueName: string; venueAddress: string };

const key = (celebrationId: string) => `evermore:event-drafts:${celebrationId}`;

const CHANGED = "evermore:event-drafts-changed";

/** For useSyncExternalStore: tells React when the saved drafts change (this tab or another). */
export function subscribeEventDrafts(onChange: () => void) {
  window.addEventListener(CHANGED, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGED, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** The raw saved text. A string, so React can compare it between renders. */
export function eventDraftsSnapshot(celebrationId: string) {
  try {
    return localStorage.getItem(key(celebrationId)) ?? "[]";
  } catch {
    return "[]";
  }
}

export function parseEventDrafts(raw: string): EventDraft[] {
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list.filter((d) => d && typeof d.name === "string").slice(0, 6) : [];
  } catch {
    return [];
  }
}

export function saveEventDrafts(celebrationId: string, drafts: EventDraft[]) {
  try {
    if (drafts.length) localStorage.setItem(key(celebrationId), JSON.stringify(drafts));
    window.dispatchEvent(new Event(CHANGED));
  } catch {
    // Private mode or storage full: the suggestions are a convenience, so just skip them.
  }
}

export function loadEventDrafts(celebrationId: string): EventDraft[] {
  return parseEventDrafts(eventDraftsSnapshot(celebrationId));
}

export function removeEventDraft(celebrationId: string, index: number) {
  try {
    const next = loadEventDrafts(celebrationId).filter((_, i) => i !== index);
    if (next.length) localStorage.setItem(key(celebrationId), JSON.stringify(next));
    else localStorage.removeItem(key(celebrationId));
    window.dispatchEvent(new Event(CHANGED));
  } catch {
    // ignore
  }
}

/** "2027-03-14" + "10:00" for a datetime-local box. The time falls back to 10:00 and the host is told to check it. */
export function startsLocalFor(d: EventDraft) {
  return d.date ? `${d.date}T${d.time || "10:00"}` : "";
}
