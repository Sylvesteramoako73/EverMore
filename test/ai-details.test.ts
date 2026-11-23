import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { draftDetails, DraftError } from "@/server/ai-details";
import { env } from "@/lib/env";

const base = { sentence: "My 40th birthday on 14 March at Axim Beach Resort", kind: "birthday" as const, title: "Ama's Birthday", names: ["Ama"], today: "2026-11-23" };

function modelReplies(input: unknown, ok = true) {
  return vi.fn().mockResolvedValue({ ok, json: async () => ({ choices: [{ message: { content: typeof input === "string" ? input : JSON.stringify(input) } }] }) });
}

describe("draftDetails", () => {
  const original = env.GROQ_API_KEY;
  beforeEach(() => { (env as { GROQ_API_KEY?: string }).GROQ_API_KEY = "test-key"; });
  afterEach(() => { (env as { GROQ_API_KEY?: string }).GROQ_API_KEY = original; vi.unstubAllGlobals(); });

  it("refuses when no key is configured", async () => {
    (env as { GROQ_API_KEY?: string }).GROQ_API_KEY = undefined;
    await expect(draftDetails(base)).rejects.toBeInstanceOf(DraftError);
  });

  it("returns a cleaned draft and treats the sentence as data", async () => {
    const fetchMock = modelReplies({ keyDate: "2027-03-14", turningAge: 40, hashtag: "#Ama 40!", story: "Ama turns 40." });
    vi.stubGlobal("fetch", fetchMock);
    const draft = await draftDetails(base);
    expect(draft.keyDate).toBe("2027-03-14");
    expect(draft.turningAge).toBe(40);
    expect(draft.hashtag).toBe("Ama40");
    expect(draft.dressCode).toBe("");
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent.messages[0].content).toContain("<host_sentence>");
    expect(sent.messages[0].content).toContain("Never invent");
    expect(sent.response_format).toEqual({ type: "json_object" });
    expect(fetchMock.mock.calls[0][1].headers.authorization).toBe("Bearer test-key");
  });

  it("returns the parts of the day with only the times the host gave", async () => {
    vi.stubGlobal("fetch", modelReplies({
      events: [
        { name: "Church ceremony", date: "2027-12-12", time: "10:00", venueName: "Holy Trinity", venueAddress: "" },
        { name: "Reception", date: "2027-12-12", time: "", venueName: "Axim Beach Resort", venueAddress: "Axim" },
      ],
    }));
    const draft = await draftDetails({ ...base, sentence: "Church at 10am at Holy Trinity then reception at Axim Beach Resort, 12 December" });
    expect(draft.events).toHaveLength(2);
    expect(draft.events[0].time).toBe("10:00");
    expect(draft.events[1].time).toBe("");
  });

  it("blanks an event time that is not HH:MM instead of passing it on", async () => {
    vi.stubGlobal("fetch", modelReplies({ events: [{ name: "Reception", time: "after church" }] }));
    const d = await draftDetails(base);
    expect(d.events[0]).toMatchObject({ name: "Reception", time: "" });
  });

  it("drops a malformed field instead of passing it on", async () => {
    vi.stubGlobal("fetch", modelReplies({ keyDate: "next Saturday" }));
    expect((await draftDetails(base)).keyDate).toBe("");
  });

  it("copes with a reply that is not JSON", async () => {
    vi.stubGlobal("fetch", modelReplies("Sure! Here is your draft"));
    await expect(draftDetails(base)).rejects.toBeInstanceOf(DraftError);
  });

  it("reports an unavailable service plainly", async () => {
    vi.stubGlobal("fetch", modelReplies({}, false));
    await expect(draftDetails(base)).rejects.toThrow(/unavailable/);
  });
});

describe("draftDetails leniency", () => {
  const original = env.GROQ_API_KEY;
  beforeEach(() => { (env as { GROQ_API_KEY?: string }).GROQ_API_KEY = "test-key"; });
  afterEach(() => { (env as { GROQ_API_KEY?: string }).GROQ_API_KEY = original; vi.unstubAllGlobals(); });

  it("keeps good fields when the model sends nulls, text numbers and one bad field", async () => {
    vi.stubGlobal("fetch", modelReplies({
      keyDate: "2026-01-20", dressCode: null, guestMessage: "Join us.", story: null, hashtag: "#AmaAndKofi",
      turningAge: "40", packingList: "hat, water", dateOfBirth: "20th January", events: [{ name: "Wedding", date: "2026-01-20", time: null, venueName: null }],
    }));
    const d = await draftDetails({ ...base, kind: "wedding" });
    expect(d.keyDate).toBe("2026-01-20");
    expect(d.dressCode).toBe("");
    expect(d.guestMessage).toBe("Join us.");
    expect(d.turningAge).toBe(40);
    expect(d.packingList).toEqual(["hat", "water"]);
    expect(d.dateOfBirth).toBe("");
    expect(d.hashtag).toBe("AmaAndKofi");
    expect(d.events[0]).toMatchObject({ name: "Wedding", date: "2026-01-20", time: "" });
  });
});

describe("draftDetails prompt", () => {
  const original = env.GROQ_API_KEY;
  beforeEach(() => { (env as { GROQ_API_KEY?: string }).GROQ_API_KEY = "test-key"; });
  afterEach(() => { (env as { GROQ_API_KEY?: string }).GROQ_API_KEY = original; vi.unstubAllGlobals(); });

  it("forbids padding and carries the reply deadline", async () => {
    const f = modelReplies({ rsvpDeadline: "2026-11-30" });
    vi.stubGlobal("fetch", f);
    const d = await draftDetails(base);
    expect(d.rsvpDeadline).toBe("2026-11-30");
    const system = JSON.parse(f.mock.calls[0][1].body as string).messages[0].content as string;
    expect(system).toContain("Never pad");
    expect(system).toContain('story MUST be ""');
    expect(system).toContain('announcement MUST be ""');
  });
});
