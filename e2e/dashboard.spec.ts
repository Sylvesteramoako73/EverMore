import { expect, test, type Page } from "@playwright/test";
import { signUpAndVerify, uniqueEmail } from "./helpers";

// The host dashboard: share the page, build a guest list with personal links, see replies,
// export them, and look after guestbook messages.

const year = new Date().getFullYear() + 1;

async function quickWedding(page: Page) {
  await page.getByText("Wedding", { exact: true }).click();
  await page.getByLabel("Your full name").fill("Abena Asante");
  await page.getByLabel("Your partner's full name").fill("Yaw Darko");
  await page.getByRole("button", { name: "Save & continue" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "The details" })).toBeVisible({ timeout: 20_000 });
  await page.getByLabel(/Your timezone/).selectOption("Africa/Accra");
  await page.getByRole("button", { name: "Save & continue" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Programme & venues" })).toBeVisible({ timeout: 20_000 });
  await page.getByLabel("Event name").fill("Wedding ceremony");
  await page.getByLabel("Starts").fill(`${year}-08-08T10:00`);
  await page.getByLabel(/Venue name/).fill("Christ Church");
  await page.getByRole("button", { name: "Add event" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Skip for now" }).click();
  await page.getByRole("button", { name: "Continue to review" }).click();
  await page.getByRole("button", { name: "Publish my page" }).click();
  await expect(page.getByText("Your page is live")).toBeVisible({ timeout: 20_000 });
  return new URL(await page.locator("code").first().innerText()).pathname.slice(1);
}

test("a host manages guests, replies and messages from the dashboard", async ({ page, browser }, testInfo) => {
  test.slow();
  await signUpAndVerify(page, uniqueEmail(`host-${testInfo.project.name}`), "Abena Asante");
  const slug = await quickWedding(page);

  // Overview
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { level: 1, name: "Welcome back, Abena" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Share your page" })).toBeVisible();

  // Guests: add one with a Ghanaian number; WhatsApp opens with their number and personal link.
  await page.goto("/dashboard/guests");
  await expect(page.getByText("No guests yet")).toBeVisible();
  const add = page.getByRole("region", { name: "Add a guest" }).or(page.locator("section", { has: page.getByRole("heading", { name: "Add a guest" }) }));
  await add.getByLabel("Name or household").fill("Auntie Esi & family");
  await add.getByLabel(/Phone/).fill("024 123 4567");
  await add.getByLabel("People on this invitation").fill("3");
  await add.getByRole("button", { name: "Add guest" }).click();
  const item = page.getByRole("listitem").filter({ hasText: "Auntie Esi & family" });
  await expect(item).toBeVisible({ timeout: 20_000 });
  const wa = await item.getByRole("link", { name: "WhatsApp" }).getAttribute("href");
  expect(wa).toContain("https://wa.me/233241234567?text=");
  const personal = decodeURIComponent(wa!).match(/https?:\/\/\S+\?invite=[\w-]+/)![0];

  // The guest replies through their personal link.
  const guestCtx = await browser.newContext({ ...testInfo.project.use });
  const guest = await guestCtx.newPage();
  const link = new URL(personal);
  await guest.goto(link.pathname + link.search);
  const rsvp = guest.locator("#rsvp");
  await rsvp.getByText("Joyfully accepts").click();
  await rsvp.getByLabel("Your name").fill("Esi Owusu");
  await rsvp.getByLabel("Email").fill("esi.owusu@example.com");
  await rsvp.getByRole("button", { name: "Send RSVP" }).click();
  await expect(rsvp.getByText(/can't wait to celebrate with you/)).toBeVisible({ timeout: 20_000 });

  // A message in the guestbook.
  const book = guest.getByRole("region", { name: "Guestbook" });
  await book.getByLabel("Your name").fill("Kofi");
  await book.getByLabel("Your message").fill("Congratulations, you two!");
  await book.getByRole("button", { name: "Leave a message" }).click();
  await expect(guest.getByText("Congratulations, you two!")).toBeVisible({ timeout: 20_000 });
  await guestCtx.close();

  // The reply shows on the guest list and the RSVPs page, and exports to CSV.
  await page.reload();
  await expect(page.getByRole("listitem").filter({ hasText: "Auntie Esi & family" }).getByText("Coming")).toBeVisible();
  await page.goto("/dashboard/rsvps");
  await expect(page.getByText("Esi Owusu")).toBeVisible();
  const csv = await page.request.get("/dashboard/rsvps/export");
  expect(csv.headers()["content-type"]).toContain("text/csv");
  expect(await csv.text()).toContain("Esi Owusu");

  // Messages: hide, then show again.
  await page.goto("/dashboard/messages");
  const msg = page.getByRole("listitem").filter({ hasText: "Congratulations, you two!" });
  await msg.getByRole("button", { name: "Hide" }).click();
  await expect(page.getByRole("heading", { name: /^Hidden/ })).toBeVisible({ timeout: 20_000 });
  await page.getByRole("listitem").filter({ hasText: "Congratulations, you two!" }).getByRole("button", { name: "Show again" }).click();
  await expect(page.getByRole("heading", { name: /^Hidden/ })).toHaveCount(0, { timeout: 20_000 });

  // Settings: turn on message approval.
  await page.goto("/dashboard/settings");
  await page.getByLabel("Approve messages before they appear").check();
  await page.getByRole("button", { name: "Save guest settings" }).click();
  await expect(page.getByText("Saved. Your page is up to date.")).toBeVisible({ timeout: 20_000 });

  expect(slug).toMatch(/^abena-and-yaw/);

  // Invite a co-host. Without an email provider the link is shown to the host.
  await page.getByLabel("Their email").fill(uniqueEmail("cohost"));
  await page.getByRole("button", { name: "Send invitation" }).click();
  const notice = page.getByText(/share this link with them: /);
  await expect(notice).toBeVisible({ timeout: 20_000 });
  const join = new URL((await notice.innerText()).match(/https?:\/\/\S+/)![0]);
  await expect(page.getByText("waiting to accept")).toBeVisible();

  const helperCtx = await browser.newContext({ ...testInfo.project.use });
  const helper = await helperCtx.newPage();
  await signUpAndVerify(helper, uniqueEmail(`helper-${testInfo.project.name}`), "Kwesi Mensah");
  await helper.goto(join.pathname);
  await expect(helper.getByRole("heading", { name: "Help manage Abena & Yaw" })).toBeVisible();
  await helper.getByRole("button", { name: /Accept as Kwesi Mensah/ }).click();
  await expect(helper).toHaveURL(/\/dashboard$/, { timeout: 20_000 });
  await helper.goto("/dashboard/guests");
  await expect(helper.getByText("Auntie Esi & family", { exact: true })).toBeVisible();
  await helperCtx.close();

  // Gifts: the host adds a fund with MoMo details; a guest says they sent MoMo; the host confirms.
  await page.goto("/dashboard/gifts");
  await expect(page.getByRole("heading", { name: "Start collecting gifts" })).toBeVisible();
  await page.getByLabel("MoMo number").fill("024 555 0101");
  await page.getByLabel("Name on the account").fill("Abena Asante");
  await page.getByRole("button", { name: "Add fund" }).click();
  await expect(page.getByText("Fund added.")).toBeVisible({ timeout: 20_000 });

  const giverCtx = await browser.newContext({ ...testInfo.project.use });
  const giver = await giverCtx.newPage();
  await giver.goto(`/${slug}`);
  const gifts = giver.getByRole("region", { name: "Gifts" });
  await expect(gifts.getByText("024 555 0101")).toBeVisible();
  await gifts.getByRole("button", { name: "Give a gift" }).click();
  await gifts.getByRole("button", { name: "200", exact: true }).click();
  await gifts.getByLabel("Your name").fill("Uncle Kwame");
  await gifts.getByRole("button", { name: /I've sent it/ }).click();
  await expect(gifts.getByText(/Thank you, Uncle! The hosts will confirm/)).toBeVisible({ timeout: 20_000 });

  await page.reload();
  const pendingGift = page.getByRole("listitem").filter({ hasText: "Uncle Kwame · GH₵ 200" });
  await pendingGift.getByRole("button", { name: "Received", exact: true }).click();
  await expect(page.getByText(/GH₵ 200 received from 1 person/)).toBeVisible({ timeout: 20_000 });

  await giver.reload();
  await expect(giver.getByRole("region", { name: "Gifts" }).getByText("GH₵ 200", { exact: true })).toBeVisible();
  await expect(giver.getByText("Uncle Kwame")).toBeVisible();
  await giverCtx.close();

  // Optional: screenshots for a visual check (SHOTS=<dir>).
  if (process.env.SHOTS) {
    for (const p of ["", "/guests", "/rsvps", "/messages", "/gifts", "/settings"]) {
      await page.goto(`/dashboard${p}`);
      await page.waitForTimeout(800);
      await page.screenshot({ path: `${process.env.SHOTS}/dash${p.replace("/", "-") || "-home"}.png`, fullPage: true });
    }
  }
});
