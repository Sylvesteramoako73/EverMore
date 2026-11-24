import { describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.BILLING_ENABLED = "true";
});

const { getCelebration, publishCelebration } = await import("@/server/celebrations");
const { approvePageFree, listAllCelebrations, revokeFreeAccess, setCelebrationTakenDown } = await import("@/server/admin");
const { needsPayment } = await import("@/lib/plans");
const { makeCelebration } = await import("./helpers");

describe("admin approving a page without payment", () => {
  it("makes an unpaid page live and treats it as paid", async () => {
    const { celebration: c } = await makeCelebration();
    expect((await publishCelebration(c.id)).ok).toBe(false);
    expect(await approvePageFree(c.id)).toBe(true);
    const after = await getCelebration(c.id);
    expect(after?.status).toBe("published");
    expect(after?.plan).toBe("complimentary");
    expect(after?.publishedAt).toBeTruthy();
    expect(needsPayment("complimentary")).toBe(false);
  });

  it("shows the plan in the admin list", async () => {
    const { celebration: c } = await makeCelebration();
    await approvePageFree(c.id);
    const row = (await listAllCelebrations("", 500)).find((r) => r.id === c.id);
    expect(row?.plan).toBe("complimentary");
  });

  it("does not approve a page that was taken down", async () => {
    const { celebration: c } = await makeCelebration();
    await setCelebrationTakenDown(c.id, true);
    expect(await approvePageFree(c.id)).toBe(false);
    expect((await getCelebration(c.id))?.status).toBe("archived");
  });

  it("removing free access puts the page back behind payment", async () => {
    const { celebration: c } = await makeCelebration();
    await approvePageFree(c.id);
    expect(await revokeFreeAccess(c.id)).toBe(true);
    const after = await getCelebration(c.id);
    expect(after?.plan).toBe("free");
    expect(after?.status).toBe("draft");
    expect(await revokeFreeAccess(c.id)).toBe(false);
  });
});
