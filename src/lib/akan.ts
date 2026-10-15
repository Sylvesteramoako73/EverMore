/**
 * Akan day names: in Ghana a child's "soul name" comes from the day of the week they were born.
 * Index 0 = Sunday, matching Date#getUTCDay.
 */
export const AKAN_DAY_NAMES = [
  { day: "Sunday", male: "Kwasi", female: "Akosua" },
  { day: "Monday", male: "Kwadwo", female: "Adwoa" },
  { day: "Tuesday", male: "Kwabena", female: "Abena" },
  { day: "Wednesday", male: "Kwaku", female: "Akua" },
  { day: "Thursday", male: "Yaw", female: "Yaa" },
  { day: "Friday", male: "Kofi", female: "Afua" },
  { day: "Saturday", male: "Kwame", female: "Ama" },
] as const;

/** The day names for a "YYYY-MM-DD" date of birth, or null if it isn't a valid date. */
export function akanDayName(dateOfBirth: string | null | undefined) {
  if (!dateOfBirth || !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) return null;
  const d = new Date(`${dateOfBirth}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : AKAN_DAY_NAMES[d.getUTCDay()];
}

/** Section title for the people with special roles, per occasion. Null = not offered. */
export const PARTY_TITLES: Partial<Record<string, { title: string; hint: string; example: string }>> = {
  wedding: { title: "The Bridal Party", hint: "Bridesmaids, groomsmen, MC, flower girls…", example: "Efua Mensah — Maid of honour\nKwesi Boateng — Best man\nUncle Fiifi — MC" },
  naming: { title: "Family & Godparents", hint: "Grandparents, godparents, the officiating elder…", example: "Nana Ama — Grandmother\nKojo Asante — Godfather" },
  funeral: { title: "The Family", hint: "Children, spouse and chief mourners, as you'd like them listed.", example: "Michael Owusu — Son\nAbena Owusu — Daughter" },
  reunion: { title: "Organising Committee", hint: "Who's organising, so people know who to ask.", example: "Akua Darko — Chair\nYaw Mensah — Treasurer" },
  outing: { title: "Trip Organisers", hint: "Who to call on the trip.", example: "Akosua Darko — Coordinator" },
  graduation: { title: "Special Thanks", hint: "Family and mentors you'd like to honour.", example: "Mum & Dad — Everything" },
};

/** "Efua Mensah — Maid of honour" lines → people. Accepts —, –, -, : or , as the separator. */
export function parseParty(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 30)
    .map((line) => {
      const m = line.match(/^(.+?)\s*(?:—|–|\s-\s|:|,)\s*(.+)$/);
      return { name: (m ? m[1] : line).slice(0, 80), role: (m ? m[2] : "").slice(0, 80) };
    });
}
