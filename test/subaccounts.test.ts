import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.PAYSTACK_SECRET_KEY = "sk_test_unit_secret";
  process.env.ONLINE_GIFTS_ENABLED = "true";
  process.env.GIFT_FEE_PERCENT = "2";
});

const { db } = await import("@/db");
const { fund } = await import("@/db/schema");
const { createFund, startOnlineGift } = await import("@/server/gifts");
const { ensureFundSubaccount, giftFeePercent } = await import("@/server/subaccounts");
const { makeCelebration } = await import("./helpers");

type Call = { url: string; method: string; body: Record<string, unknown> };

/** Stand in for Paystack, remembering what we asked it. */
function fakePaystack(opts: { fail?: boolean } = {}) {
  const calls: Call[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const u = String(url);
      calls.push({ url: u, method: init?.method ?? "GET", body: init?.body ? JSON.parse(String(init.body)) : {} });
      if (opts.fail) return new Response(JSON.stringify({ status: false, message: "Invalid account" }), { status: 400 });
      const data = u.includes("/subaccount") ? { subaccount_code: "ACCT_test123" } : { authorization_url: "https://checkout.paystack.test/x" };
      return new Response(JSON.stringify({ status: true, data }), { status: 200 });
    }),
  );
  return calls;
}

async function fundFor(c: string, momoNumber = "0241234567", momoNetwork = "MTN MoMo") {
  const id = await createFund(c, { title: "Wedding gift", description: "", goalMinor: null, showProgress: true, momoNumber, momoName: "Ama Mensah", momoNetwork });
  return id;
}
const gift = { name: "Kofi", email: "kofi@test.dev", phone: "", message: "", anonymous: false, amountMinor: 5_000 };

describe("host subaccounts for online gifts", () => {
  it("creates a subaccount from the host's Mobile Money details, with our fee", async () => {
    const { celebration: c } = await makeCelebration();
    const id = await fundFor(c.id);
    const calls = fakePaystack();
    try {
      expect(await ensureFundSubaccount(c.id, id)).toEqual({ ok: true, state: "ready" });
      expect(calls[0]).toMatchObject({ method: "POST", body: { settlement_bank: "MTN", account_number: "0241234567", business_name: "Ama Mensah", percentage_charge: 2 } });
      expect(giftFeePercent()).toBe(2);
      const [f] = await db.select().from(fund).where(eq(fund.id, id));
      expect(f?.paystackSubaccountCode).toBe("ACCT_test123");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("does not call Paystack again until the details change, then updates the same subaccount", async () => {
    const { celebration: c } = await makeCelebration();
    const id = await fundFor(c.id, "+233 24 123 4567", "Telecel Cash");
    const calls = fakePaystack();
    try {
      await ensureFundSubaccount(c.id, id);
      await ensureFundSubaccount(c.id, id);
      expect(calls).toHaveLength(1);
      expect(calls[0]?.body).toMatchObject({ settlement_bank: "VOD", account_number: "0241234567" });
      await db.update(fund).set({ momoNumber: "0551112222", momoNetwork: "AT Money" }).where(eq(fund.id, id));
      await ensureFundSubaccount(c.id, id);
      expect(calls[1]).toMatchObject({ method: "PUT", body: { settlement_bank: "ATL", account_number: "0551112222" } });
      expect(calls[1]?.url).toContain("/subaccount/ACCT_test123");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("switches online payment off when Paystack refuses the details", async () => {
    const { celebration: c } = await makeCelebration();
    const id = await fundFor(c.id);
    fakePaystack({ fail: true });
    try {
      expect(await ensureFundSubaccount(c.id, id)).toMatchObject({ ok: false });
      const [f] = await db.select().from(fund).where(eq(fund.id, id));
      expect(f?.paystackSubaccountCode).toBe("");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("splits an online gift to the host and makes them bear Paystack's fee", async () => {
    const { celebration: c } = await makeCelebration();
    const id = await fundFor(c.id);
    let calls = fakePaystack();
    try {
      await ensureFundSubaccount(c.id, id);
      calls = fakePaystack();
      await startOnlineGift(c.id, { ...gift, fundId: id }, "https://evermore.test/x/gift");
      expect(calls[0]?.url).toContain("/transaction/initialize");
      expect(calls[0]?.body).toMatchObject({ amount: 5_000, subaccount: "ACCT_test123", bearer: "subaccount" });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("refuses an online gift for a fund with no subaccount, so money never lands in our balance", async () => {
    const { celebration: c } = await makeCelebration();
    const id = await fundFor(c.id);
    const calls = fakePaystack();
    try {
      await expect(startOnlineGift(c.id, { ...gift, fundId: id }, "https://evermore.test/x/gift")).rejects.toThrow("isn't set up");
      expect(calls).toHaveLength(0);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
