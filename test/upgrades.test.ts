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
const { entitlements, PREMIUM_PRICE_MINOR } = await import("@/lib/plans");
const { getCelebration } = await import("@/server/celebrations");
const { handlePaystackWebhook } = await import("@/server/gifts");
const { applyUpgradeTransaction, isUpgradeReference, paidUpgrade, startUpgrade } = await import("@/server/upgrades");
const { makeCelebration } = await import("./helpers");

let n = 0;
const reference = () => `evu_${(++n).toString(16).padStart(24, "0")}`;

async function pendingPayment() {
  const { owner, celebration: c } = await makeCelebration();
  const ref = reference();
  await db.insert(planPayment).values({ celebrationId: c.id, userId: owner.id, amountMinor: PREMIUM_PRICE_MINOR, reference: ref });
  return { owner, c, ref };
}

const success = (ref: string, overrides: Record<string, unknown> = {}) => ({ status: "success", reference: ref, amount: PREMIUM_PRICE_MINOR, currency: "GHS", channel: "mobile_money", ...overrides });

describe("Premium upgrade", () => {
  it("costs 69 cedis and new pages start on Free limits once billing is on", async () => {
    expect(PREMIUM_PRICE_MINOR).toBe(6_900);
    const { celebration: c } = await makeCelebration();
    expect((await getCelebration(c.id))?.plan).toBe("free");
    expect(entitlements("free").premiumThemes).toBe(false);
    expect(entitlements("premium").premiumThemes).toBe(true);
  });

  it("makes the page Premium when Paystack confirms the exact amount", async () => {
    const { c, ref } = await pendingPayment();
    const p = await applyUpgradeTransaction(success(ref));
    expect(p).toMatchObject({ status: "paid", channel: "mobile_money" });
    expect((await getCelebration(c.id))?.plan).toBe("premium");
    expect((await paidUpgrade(c.id))?.reference).toBe(ref);
    // A repeat (webhook after the return page) changes nothing.
    expect((await applyUpgradeTransaction(success(ref)))?.status).toBe("paid");
  });

  it("does not upgrade on a short payment, the wrong currency or a failed charge", async () => {
    for (const bad of [{ amount: 100 }, { currency: "NGN" }, { status: "failed" }, { status: "abandoned" }]) {
      const { c, ref } = await pendingPayment();
      const p = await applyUpgradeTransaction(success(ref, bad));
      expect(p?.status).not.toBe("paid");
      expect((await getCelebration(c.id))?.plan).toBe("free");
    }
  });

  it("ignores references it never issued", async () => {
    expect(await applyUpgradeTransaction(success(reference()))).toBeNull();
    expect(isUpgradeReference("evm_000000000000000000000001")).toBe(false);
  });

  it("upgrades from a signed webhook", async () => {
    const { c, ref } = await pendingPayment();
    const body = JSON.stringify({ event: "charge.success", data: success(ref) });
    const signature = createHmac("sha512", "sk_test_unit_secret").update(body).digest("hex");
    expect(await handlePaystackWebhook(body, signature)).toBe(true);
    expect((await getCelebration(c.id))?.plan).toBe("premium");
  });

  it("refuses to charge again for a page that is already Premium", async () => {
    const { owner, celebration: c } = await makeCelebration();
    await db.update(celebration).set({ plan: "premium" }).where(eq(celebration.id, c.id));
    await expect(startUpgrade(c.id, owner, "https://evermore.test/dashboard/upgrade/return")).rejects.toThrow("already Premium");
  });
});
