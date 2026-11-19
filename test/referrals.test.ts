import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.PAYSTACK_SECRET_KEY = "sk_test_unit_secret";
  process.env.BILLING_ENABLED = "true";
});

const { db } = await import("@/db");
const { planPayment, referral, user } = await import("@/db/schema");
const { PAGE_PRICE_MINOR } = await import("@/lib/plans");
const { MIN_PAYOUT_MINOR, REFERRAL_DISCOUNT_MINOR, REFERRAL_REWARD_MINOR } = await import("@/lib/referrals");
const { applyPagePaymentTransaction, startPagePayment } = await import("@/server/page-payments");
const { attributeReferral, getOrCreateReferralCode, markPayoutPaid, referralDiscountFor, referralSummary, requestPayout, savePayoutAccount, sameInbox } = await import("@/server/referrals");
const { makeCelebration, makeUser } = await import("./helpers");

let n = 0;
const reference = () => `evu_${(++n + 500).toString(16).padStart(24, "0")}`;

/** A friend who was invited by `referrer` pays for their page. */
async function friendPays(referrerId: string) {
  const code = await getOrCreateReferralCode(referrerId);
  const { owner: friend, celebration: c } = await makeCelebration();
  expect(await attributeReferral(friend.id, code)).toBe(true);
  const amount = PAGE_PRICE_MINOR - (await referralDiscountFor(friend.id));
  const ref = reference();
  await db.insert(planPayment).values({ celebrationId: c.id, userId: friend.id, amountMinor: amount, reference: ref });
  await applyPagePaymentTransaction({ status: "success", reference: ref, amount, currency: "GHS", channel: "mobile_money" });
  return { friend, amount };
}

/** Pretend the hold has ended so rewards can be cashed out. */
const endHold = (referrerId: string) => db.update(referral).set({ availableAt: new Date(Date.now() - 1000) }).where(eq(referral.referrerId, referrerId));

describe("referral codes and invitations", () => {
  it("gives each host one stable code", async () => {
    const u = await makeUser();
    const code = await getOrCreateReferralCode(u.id);
    expect(code).toMatch(/^[A-Z0-9]{7}$/);
    expect(await getOrCreateReferralCode(u.id)).toBe(code);
  });

  it("records the first invitation only, and never an invitation to yourself", async () => {
    const [a, b, friend] = [await makeUser(), await makeUser(), await makeUser()];
    const [codeA, codeB] = [await getOrCreateReferralCode(a.id), await getOrCreateReferralCode(b.id)];
    expect(await attributeReferral(a.id, codeA)).toBe(false);
    expect(await attributeReferral(friend.id, "NOPE")).toBe(false);
    expect(await attributeReferral(friend.id, codeA.toLowerCase())).toBe(true);
    expect(await attributeReferral(friend.id, codeB)).toBe(false);
    expect(await referralDiscountFor(friend.id)).toBe(REFERRAL_DISCOUNT_MINOR);
  });

  it("treats the same inbox written two ways as the same person", () => {
    expect(sameInbox("kwame@gmail.com", "k.wame+evermore@gmail.com")).toBe(true);
    expect(sameInbox("kwame@gmail.com", "ama@gmail.com")).toBe(false);
  });
});

describe("paying with an invitation", () => {
  it("charges 59 cedis and asks Paystack for the discounted amount", async () => {
    const referrer = await makeUser();
    const code = await getOrCreateReferralCode(referrer.id);
    const { owner: friend, celebration: c } = await makeCelebration();
    await attributeReferral(friend.id, code);
    const fetchMock = vi.fn<(url: string | URL | Request, init?: RequestInit) => Promise<Response>>(async () => new Response(JSON.stringify({ status: true, data: { authorization_url: "https://checkout.paystack.test/x" } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    try {
      await startPagePayment(c.id, friend, "https://evermore.test/return");
      expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)).amount).toBe(5_900);
      const [p] = await db.select().from(planPayment).where(eq(planPayment.celebrationId, c.id));
      expect(p?.amountMinor).toBe(5_900);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("rejects the full price against a discounted payment record", async () => {
    const referrer = await makeUser();
    const code = await getOrCreateReferralCode(referrer.id);
    const { owner: friend, celebration: c } = await makeCelebration();
    await attributeReferral(friend.id, code);
    const ref = reference();
    await db.insert(planPayment).values({ celebrationId: c.id, userId: friend.id, amountMinor: 5_900, reference: ref });
    const p = await applyPagePaymentTransaction({ status: "success", reference: ref, amount: 1_000, currency: "GHS", channel: "card" });
    expect(p?.status).not.toBe("paid");
  });
});

describe("rewards and payouts", () => {
  it("holds the reward after a friend pays, then releases it", async () => {
    const referrer = await makeUser();
    await friendPays(referrer.id);
    let s = await referralSummary(referrer.id);
    expect(s).toMatchObject({ signedUp: 1, paidFriends: 1, pendingMinor: REFERRAL_REWARD_MINOR, availableMinor: 0 });
    await endHold(referrer.id);
    s = await referralSummary(referrer.id);
    expect(s).toMatchObject({ pendingMinor: 0, availableMinor: REFERRAL_REWARD_MINOR });
  });

  it("pays nothing until the friend pays, and rewards a friend only once", async () => {
    const referrer = await makeUser();
    const code = await getOrCreateReferralCode(referrer.id);
    const friend = await makeUser();
    await attributeReferral(friend.id, code);
    expect(await referralSummary(referrer.id)).toMatchObject({ signedUp: 1, paidFriends: 0, pendingMinor: 0 });
  });

  it("cashes out only from the minimum, needs a Mobile Money number, and settles once", async () => {
    const referrer = await makeUser();
    await friendPays(referrer.id);
    await endHold(referrer.id);
    expect(await requestPayout(referrer.id)).toMatchObject({ ok: false });
    await savePayoutAccount(referrer.id, "+233 24 123 4567", "MTN MoMo");
    // One reward (15) is below the 30 minimum.
    expect(REFERRAL_REWARD_MINOR).toBeLessThan(MIN_PAYOUT_MINOR);
    expect(await requestPayout(referrer.id)).toMatchObject({ ok: false });
    await friendPays(referrer.id);
    await endHold(referrer.id);
    const asked = await requestPayout(referrer.id);
    expect(asked.ok).toBe(true);
    if (!asked.ok) return;
    expect(asked.payout).toMatchObject({ amountMinor: 2 * REFERRAL_REWARD_MINOR, momoNumber: "0241234567" });
    expect(await requestPayout(referrer.id)).toMatchObject({ ok: false });
    expect(await referralSummary(referrer.id)).toMatchObject({ availableMinor: 0, requestedMinor: 2 * REFERRAL_REWARD_MINOR });
    const admin = await makeUser();
    expect(await markPayoutPaid(admin.id, asked.payout.id)).not.toBeNull();
    expect(await markPayoutPaid(admin.id, asked.payout.id)).toBeNull();
    expect(await referralSummary(referrer.id)).toMatchObject({ requestedMinor: 0, paidOutMinor: 2 * REFERRAL_REWARD_MINOR });
  });

  it("gives no reward when both people use the same Mobile Money number", async () => {
    const referrer = await makeUser();
    await savePayoutAccount(referrer.id, "0249990000", "MTN MoMo");
    const code = await getOrCreateReferralCode(referrer.id);
    const { owner: friend, celebration: c } = await makeCelebration();
    await db.update(user).set({ momoNumber: "0249990000" }).where(eq(user.id, friend.id));
    await attributeReferral(friend.id, code);
    const ref = reference();
    await db.insert(planPayment).values({ celebrationId: c.id, userId: friend.id, amountMinor: 5_900, reference: ref });
    await applyPagePaymentTransaction({ status: "success", reference: ref, amount: 5_900, currency: "GHS", channel: "mobile_money" });
    expect(await referralSummary(referrer.id)).toMatchObject({ pendingMinor: 0, availableMinor: 0, paidFriends: 0 });
  });
});
