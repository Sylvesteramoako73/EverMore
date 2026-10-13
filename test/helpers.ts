import { randomUUID } from "node:crypto";
import { db } from "@/db";
import { user } from "@/db/schema";
import { coupleSchema, eventSchema, type EventInput } from "@/lib/validation";
import { createEvent } from "@/server/events";
import { createWedding } from "@/server/weddings";

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

export async function makeWedding({
  partnerOne = "Ama Mensah",
  partnerTwo = "Kofi Boateng",
  withEvent = true,
}: { partnerOne?: string; partnerTwo?: string; withEvent?: boolean } = {}) {
  const owner = await makeUser();
  const couple = coupleSchema.parse({
    partnerOneFullName: partnerOne,
    partnerOneDisplayName: "",
    partnerTwoFullName: partnerTwo,
    partnerTwoDisplayName: "",
    monogram: "",
    story: "",
    guestMessage: "",
    relationshipStartDate: "",
    engagementDate: "",
  });
  const w = await createWedding(owner.id, couple, "Africa/Accra");
  const eventId = withEvent ? await createEvent(w.id, "free", eventInput()) : null;
  return { owner, wedding: w, eventId };
}
