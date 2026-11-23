import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { draftDetails, DraftError } from "@/server/ai-details";
import { env } from "@/lib/env";

const base = { sentence: "My 40th birthday on 14 March at Axim Beach Resort", kind: "birthday" as const, title: "Ama's Birthday", names: ["Ama"], today: "2026-11-23" };

function modelReplies(input: unknown, ok = true) {
  return vi.fn().mockResolvedValue({ ok, json: async () => ({ content: [{ type: "tool_use", input }] }) });
}

describe("draftDetails", () => {
  const original = env.ANTHROPIC_API_KEY;
  beforeEach(() => { (env as { ANTHROPIC_API_KEY?: string }).ANTHROPIC_API_KEY = "test-key"; });
  afterEach(() => { (env as { ANTHROPIC_API_KEY?: string }).ANTHROPIC_API_KEY = original; vi.unstubAllGlobals(); });

  it("refuses when no key is configured", async () => {
    (env as { ANTHROPIC_API_KEY?: string }).ANTHROPIC_API_KEY = undefined;
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
    expect(sent.system).toContain("Never invent");
    expect(sent.tool_choice).toEqual({ type: "tool", name: "fill_details" });
  });

  it("drops malformed model output instead of passing it on", async () => {
    vi.stubGlobal("fetch", modelReplies({ keyDate: "next Saturday" }));
    await expect(draftDetails(base)).rejects.toBeInstanceOf(DraftError);
  });

  it("reports an unavailable service plainly", async () => {
    vi.stubGlobal("fetch", modelReplies({}, false));
    await expect(draftDetails(base)).rejects.toThrow(/unavailable/);
  });
});
