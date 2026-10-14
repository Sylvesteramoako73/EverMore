import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { basicsSchema, celebrationInfoSchema } from "@/lib/validation";
import { addGuestUpload, listShared, setMediaStatus } from "@/server/media";
import { getCelebration } from "@/server/celebrations";
import { makeCelebration } from "./helpers";

describe("occasions", () => {
  it("asks for the right people per occasion", () => {
    expect(basicsSchema.safeParse({ kind: "wedding", honoree0: "Ama Mensah" }).success).toBe(false);
    expect(basicsSchema.safeParse({ kind: "birthday", honoree0: "" }).success).toBe(false);
    expect(basicsSchema.safeParse({ kind: "outing", title: "" }).success).toBe(false);

    const birthday = basicsSchema.parse({ kind: "birthday", honoree0: "Kwame Asante" });
    expect(birthday).toMatchObject({ title: "Kwame's Birthday", honorees: [{ fullName: "Kwame Asante", displayName: "Kwame" }] });

    const funeral = basicsSchema.parse({ kind: "funeral", honoree0: "Esther Owusu", honoree0Display: "Madam Esther Owusu" });
    expect(funeral.title).toBe("Celebrating the Life of Madam Esther Owusu");

    // An outing has no honorees; a second name typed for a birthday is ignored.
    expect(basicsSchema.parse({ kind: "outing", title: "Akosombo Getaway", honoree0: "x" }).honorees).toEqual([]);
    expect(basicsSchema.parse({ kind: "birthday", honoree0: "Kwame", honoree1: "Extra" }).honorees).toHaveLength(1);
  });

  it("keeps occasion details together and turns a packing list into lines", () => {
    const parsed = celebrationInfoSchema.parse({
      timezone: "Africa/Accra",
      meetingPoint: "Accra Mall",
      packingList: "Swimwear\n\n  Sunscreen  \nHat",
      turningAge: "50",
    });
    expect(parsed.details).toMatchObject({ meetingPoint: "Accra Mall", packingList: ["Swimwear", "Sunscreen", "Hat"], turningAge: 50 });
    expect(celebrationInfoSchema.safeParse({ timezone: "Africa/Accra", turningAge: "200" }).success).toBe(false);
  });

  it("builds a readable address from any title", async () => {
    const { celebration } = await makeCelebration({ kind: "outing", title: "Akosombo Getaway!", withEvent: false });
    expect(celebration.slug).toBe("akosombo-getaway");
    expect((await getCelebration(celebration.id))?.kind).toBe("outing");
  });
});

describe("guest uploads", () => {
  async function photo() {
    const png = await sharp({ create: { width: 40, height: 30, channels: 3, background: "#C69A4A" } }).png().toBuffer();
    return new File([new Uint8Array(png)], "moment.png", { type: "image/png" });
  }

  it("holds moderated uploads until the host approves them", async () => {
    const { celebration } = await makeCelebration();
    const up = await addGuestUpload(celebration.id, "free", await photo(), { guestName: "Esi", moderated: true });
    expect(up.status).toBe("pending");
    expect((await listShared(celebration.id, { onlyApproved: true })).total).toBe(0);
    expect((await listShared(celebration.id, { onlyApproved: false, status: "pending" })).items[0]).toMatchObject({ guestName: "Esi", source: "guest" });

    expect(await setMediaStatus(celebration.id, up.id, "approved")).toBe(true);
    expect((await listShared(celebration.id, { onlyApproved: true })).total).toBe(1);
  });

  it("publishes immediately when moderation is off, and rejects non-media files", async () => {
    const { celebration } = await makeCelebration();
    const up = await addGuestUpload(celebration.id, "free", await photo(), { guestName: "Kojo", moderated: false });
    expect(up.status).toBe("approved");
    const fake = new File([new Uint8Array([1, 2, 3])], "x.png", { type: "image/png" });
    await expect(addGuestUpload(celebration.id, "free", fake, { guestName: "Kojo", moderated: false })).rejects.toThrow(/couldn't read/i);
  });

  it("does not let one host moderate another host's uploads", async () => {
    const a = await makeCelebration();
    const b = await makeCelebration();
    const up = await addGuestUpload(b.celebration.id, "free", await photo(), { guestName: "Ama", moderated: true });
    expect(await setMediaStatus(a.celebration.id, up.id, "approved")).toBe(false);
  });
});
