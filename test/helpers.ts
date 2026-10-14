import { randomUUID } from "node:crypto";
import { db } from "@/db";
import { user } from "@/db/schema";
import { basicsSchema, eventSchema, type EventInput } from "@/lib/validation";
import { createEvent } from "@/server/events";
import { createCelebration } from "@/server/celebrations";

export async function makeUser(name = "Test User") {
  const id = randomUUID();
  const email = `${id}@test.dev`;
  await db.insert(user).values({ id, name, email, emailVerified: true });
  return { id, email, name };
}

/** A valid event, parsed the same way a submitted form is. */
export function eventInput(overrides: Record<string, string | boolean> = {}): EventInput {
  return eventSchema.parse({
    name: "Church ceremony",
    startsLocal: "2030-06-12T14:00",
    endsLocal: "",
    timezone: "Africa/Accra",
    venueName: "Holy Trinity",
    venueAddress: "",
    venueLat: "",
    venueLng: "",
    description: "",
    dressCode: "",
    rsvpRequired: true,
    inviteOnly: false,
    ...overrides,
  });
}

export async function makeCelebration({
  partnerOne = "Ama Mensah",
  partnerTwo = "Kofi Boateng",
  withEvent = true,
  kind = "wedding",
  title = "",
}: { partnerOne?: string; partnerTwo?: string; withEvent?: boolean; kind?: string; title?: string } = {}) {
  const owner = await makeUser();
  const basics = basicsSchema.parse({ kind, title, honoree0: partnerOne, honoree1: partnerTwo, monogram: "" });
  const c = await createCelebration(owner.id, basics, "Africa/Accra");
  const eventId = withEvent ? await createEvent(c.id, "free", eventInput()) : null;
  return { owner, celebration: c, eventId };
}
