import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

// The Paystack key must be in place before the env module is first loaded.
vi.hoisted(() => {
  process.env.PAYSTACK_SECRET_KEY = "sk_test_unit_secret";
});

const { handlePaystackWebhook, parseAmount } = await import("./gifts");
const { formatMoney } = await import("@/lib/money");

describe("parseAmount", () => {
  it("reads cedis into pesewas", () => {
    expect(parseAmount("150")).toBe(15_000);
    expect(parseAmount("150.5")).toBe(15_050);
    expect(parseAmount("1,200.00")).toBe(120_000);
    expect(parseAmount("GH₵ 50")).toBe(5_000);
  });

  it("rejects nonsense, tiny and huge amounts", () => {
    for (const bad of ["", "abc", "-5", "0.50", "1.234", "100000.01", "1e3"]) expect(parseAmount(bad)).toBeNull();
  });
});

describe("formatMoney", () => {
  it("shows cedis with the symbol", () => {
    expect(formatMoney(120_000)).toBe("GH₵ 1,200");
    expect(formatMoney(15_050)).toBe("GH₵ 150.50");
  });
});

describe("Paystack webhook", () => {
  const body = JSON.stringify({ event: "transfer.success", data: { reference: "x" } });
  const sign = (raw: string, key = "sk_test_unit_secret") => createHmac("sha512", key).update(raw).digest("hex");

  it("accepts a correctly signed event", async () => {
    expect(await handlePaystackWebhook(body, sign(body))).toBe(true);
  });

  it("rejects a missing, wrong or forged signature", async () => {
    expect(await handlePaystackWebhook(body, null)).toBe(false);
    expect(await handlePaystackWebhook(body, "deadbeef")).toBe(false);
    expect(await handlePaystackWebhook(body, sign(body, "someone-elses-key"))).toBe(false);
    expect(await handlePaystackWebhook(body.replace("transfer", "charge"), sign(body))).toBe(false);
  });
});
