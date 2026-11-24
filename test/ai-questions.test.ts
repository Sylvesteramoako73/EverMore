import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { askQuestions, DEFAULT_QUESTIONS } from "@/server/ai-questions";
import { OCCASION_KINDS } from "@/lib/occasions";
import { env } from "@/lib/env";

const base = { sentence: "Our wedding is on 12 December in Takoradi", kind: "wedding" as const, title: "Ama & Kofi", names: ["Ama", "Kofi"], today: "2026-11-24" };
const replies = (content: unknown, ok = true) => vi.fn().mockResolvedValue({ ok, json: async () => ({ choices: [{ message: { content: typeof content === "string" ? content : JSON.stringify(content) } }] }) });

describe("askQuestions", () => {
  const original = env.GROQ_API_KEY;
  beforeEach(() => { (env as { GROQ_API_KEY?: string }).GROQ_API_KEY = "k"; });
  afterEach(() => { (env as { GROQ_API_KEY?: string }).GROQ_API_KEY = original; vi.unstubAllGlobals(); });

  it("has defaults for every occasion", () => {
    for (const k of OCCASION_KINDS) expect(DEFAULT_QUESTIONS[k].length).toBeGreaterThanOrEqual(3);
  });
  it("returns cleaned questions, at most five, no exclamation marks or dashes", async () => {
    const f = replies({ questions: ["What time is the ceremony!", "Where is the reception - and who hosts it?", "Dress code", "What time is the ceremony!", "ok", 7, "A", "B question one?", "C question two?", "D question three?"] });
    vi.stubGlobal("fetch", f);
    const q = await askQuestions(base);
    expect(q.length).toBeLessThanOrEqual(5);
    expect(q.every((x) => x.endsWith("?") && !/!|\s[-–—]\s/.test(x))).toBe(true);
    expect(new Set(q).size).toBe(q.length);
    const sent = JSON.parse(f.mock.calls[0][1].body);
    expect(sent.messages[0].content).toContain("<host_sentence>");
    expect(sent.messages[0].content).toContain("Never suggest");
  });
  it("falls back to the defaults when the model fails or no key is set", async () => {
    vi.stubGlobal("fetch", replies("nope"));
    expect(await askQuestions(base)).toEqual(DEFAULT_QUESTIONS.wedding);
    vi.stubGlobal("fetch", replies({}, false));
    expect(await askQuestions(base)).toEqual(DEFAULT_QUESTIONS.wedding);
    (env as { GROQ_API_KEY?: string }).GROQ_API_KEY = undefined;
    expect(await askQuestions(base)).toEqual(DEFAULT_QUESTIONS.wedding);
  });
  it("uses the defaults without calling the model when almost nothing was written", async () => {
    const f = replies({ questions: ["x?"] });
    vi.stubGlobal("fetch", f);
    expect(await askQuestions({ ...base, sentence: "wedding" })).toEqual(DEFAULT_QUESTIONS.wedding);
    expect(f).not.toHaveBeenCalled();
  });
  it("returns an empty list when the description already covers everything", async () => {
    vi.stubGlobal("fetch", replies({ questions: [] }));
    expect(await askQuestions(base)).toEqual([]);
  });
});
