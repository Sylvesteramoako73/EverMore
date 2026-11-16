import { createHmac } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";

// The Paystack key and billing switch must be in place before the env module is first loaded.
vi.hoisted(() => {
  process.env.PAYSTACK_SECRET_KEY = "sk_test_unit_secret";
  process.env.BILLING_ENABLED = "true";
});

const { db } = await import("@/db");
const { celebration, planPayment } = await import("@/db/schema");
const { PAGE_PRICE_MINOR } = await import("@/lib/plans");
const { getCelebration, publishCelebration } = await import("@/server/celebrations");
const { handlePaystackWebhook } = await import("@/server/gifts");
const { applyPagePaymentTransaction, isPagePaymentReference, paidPagePayment, startPagePayment } = await import("@/server/page-payments");
const { makeCelebration } = await import("./helpers");

let n = 0;
const reference = () => `evu_${(++n).toString(16).padStart(24, "0")}`;

async function pendingPayment() {
  const { owner, celebration: c } = await makeCelebration();
  const ref = reference();
  await db.insert(planPayment).values({ celebrationId: c.id, userId: owner.id, amountMinor: PAGE_PRICE_MINOR, reference: ref });
  return { owner, c, ref };
}

const success = (ref: string, overrides: Record<string, unknown> = {}) => ({ status: "success", reference: ref, amount: PAGE_PRICE_MINOR, currency: "GHS", channel: "mobile_money", ...overrides });

describe("paying to publish", () => {
  it("costs 69 cedis and an unpaid page cannot be published", async () => {
    expect(PAGE_PRICE_MINOR).toBe(6_900);
    const { celebration: c } = await makeCelebration();
    expect(await publishCelebration(c.id)).toEqual({ ok: false, problems: ["Pay GH₵ 69 to publish your page."] });
    expect((await getCelebration(c.id))?.status).toBe("draft");
  });

  it("publishes the page when Paystack confirms the exact amount", async () => {
    const { c, ref } = await pendingPayment();
    const p = await applyPagePaymentTransaction(success(ref));
    expect(p).toMatchObject({ status: "paid", channel: "mobile_money" });
    expect(await getCelebration(c.id)).toMatchObject({ plan: "premium", status: "published" });
    expect((await paidPagePayment(c.id))?.reference).toBe(ref);
    // A repeat (webhook after the return page) changes nothing.
    expect((await applyPagePaymentTransaction(success(ref)))?.status).toBe("paid");
  });

  it("marks a page that isn't ready as paid without publishing it", async () => {
    const { owner, celebration: c } = await makeCelebration({ withEvent: false });
    const ref = reference();
    await db.insert(planPayment).values({ celebrationId: c.id, userId: owner.id, amountMinor: PAGE_PRICE_MINOR, reference: ref });
    await applyPagePaymentTransaction(success(ref));
    expect(await getCelebration(c.id)).toMatchObject({ plan: "premium", status: "draft" });
  });

  it("does not accept a short payment, the wrong currency or a failed charge", async () => {
    for (const bad of [{ amount: 100 }, { currency: "NGN" }, { status: "failed" }, { status: "abandoned" }]) {
      const { c, ref } = await pendingPayment();
      const p = await applyPagePaymentTransaction(success(ref, bad));
      expect(p?.status).not.toBe("paid");
      expect(await getCelebration(c.id)).toMatchObject({ plan: "free", status: "draft" });
    }
  });

  it("takes a page that was live before charging began offline until it is paid for", async () => {
    const { c, ref } = await pendingPayment();
    // Published in the database from the early access days, never paid.
    await db.update(celebration).set({ status: "published" }).where(eq(celebration.id, c.id));
    expect((await getCelebration(c.id))?.status).toBe("draft");
    await applyPagePaymentTransaction(success(ref));
    expect((await getCelebration(c.id))?.status).toBe("published");
  });

  it("ignores references it never issued", async () => {
    expect(await applyPagePaymentTransaction(success(reference()))).toBeNull();
    expect(isPagePaymentReference("evm_000000000000000000000001")).toBe(false);
  });

  it("accepts the payment from a signed webhook", async () => {
    const { c, ref } = await pendingPayment();
    const body = JSON.stringify({ event: "charge.success", data: success(ref) });
    const signature = createHmac("sha512", "sk_test_unit_secret").update(body).digest("hex");
    expect(await handlePaystackWebhook(body, signature)).toBe(true);
    expect((await getCelebration(c.id))?.plan).toBe("premium");
  });

  it("refuses to charge again for a page that is already paid for", async () => {
    const { owner, celebration: c } = await makeCelebration();
    await db.update(celebration).set({ plan: "premium" }).where(eq(celebration.id, c.id));
    await expect(startPagePayment(c.id, owner, "https://evermore.test/dashboard/payment/return")).rejects.toThrow("already paid");
  });
});
