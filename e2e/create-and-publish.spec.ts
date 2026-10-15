import { expect, test } from "@playwright/test";
import { signUpAndVerify, uniqueEmail } from "./helpers";

// Milestone 1: a host registers, completes the guided form, picks a design, publishes,
// and shares a working URL and QR code. A guest then opens the page and replies.

const year = new Date().getFullYear() + 1;

test("a couple creates, publishes and shares their wedding page", async ({ page, browser }, testInfo) => {
  test.slow();
  await signUpAndVerify(page, uniqueEmail(`couple-${testInfo.project.name}`));

  // Step 1: what & who
  await expect(page.getByRole("heading", { level: 1, name: "What are you celebrating?" })).toBeVisible();
  await page.getByText("Wedding", { exact: true }).click();
  await page.getByLabel("Your full name").fill("Ama Mensah");
  await page.getByLabel("Your partner's full name").fill("Kofi Boateng");
  await page.getByRole("button", { name: "Save & continue" }).click();

  // Step 2: details
  await expect(page.getByRole("heading", { level: 1, name: "The details" })).toBeVisible({ timeout: 20_000 });
  await page.getByLabel(/Your timezone/).selectOption("Africa/Accra");
  await page.getByLabel(/A short message to guests/).fill("We can't wait to celebrate with you.");
  await page.getByRole("button", { name: "Save & continue" }).click();

  // Step 3: programme. Two parts of the day, different venues.
  await expect(page.getByRole("heading", { level: 1, name: "Programme & venues" })).toBeVisible({ timeout: 20_000 });
  await page.getByLabel("Event name").fill("Traditional wedding");
  await page.getByLabel("Starts").fill(`${year}-06-11T10:00`);
  await page.getByLabel(/Venue name/).fill("The Family Home");
  await page.getByRole("button", { name: "Add event" }).click();
  await page.getByRole("link", { name: "+ Add another event" }).click();
  await page.getByLabel("Event name").fill("Church ceremony");
  await page.getByLabel("Starts").fill(`${year}-06-12T14:00`);
  await page.getByLabel(/Venue name/).fill("Holy Trinity Cathedral");
  await page.getByLabel(/^Dress code/).fill("Formal");
  await page.getByRole("button", { name: "Add event" }).click();
  await expect(page.getByRole("heading", { name: "Church ceremony" })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 4: photos (skipped here)
  await expect(page.getByRole("heading", { level: 1, name: "Photographs" })).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Skip for now" }).click();

  // Step 5: design & colours
  await expect(page.getByRole("heading", { level: 1, name: "Design & colours" })).toBeVisible({ timeout: 20_000 });
  await page.getByText("Romantic Garden", { exact: true }).click();
  await expect(page.getByText("Applying theme…")).toBeHidden({ timeout: 20_000 });
  await page.getByRole("button", { name: /Taupe, Mocha, Ivory/ }).click();
  await page.getByRole("button", { name: "Save colours" }).click();
  await expect(page.getByText("Colours saved.")).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Continue to review" }).click();

  // Step 6: publish
  await expect(page.getByRole("heading", { level: 1, name: "Review & publish" })).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Publish my page" }).click();
  await expect(page.getByText("Your page is live")).toBeVisible({ timeout: 20_000 });
  const url = await page.locator("code").first().innerText();
  const slug = new URL(url).pathname.slice(1);
  expect(slug).toMatch(/^ama-and-kofi/); // a suffix is added if an earlier couple took the name

  // A guest opens the link in a fresh, signed-out browser.
  const guestContext = await browser.newContext({ ...testInfo.project.use });
  const guest = await guestContext.newPage();
  const res = await guest.goto(`/${slug}`);
  expect(res?.status()).toBe(200);
  await expect(guest.getByRole("heading", { level: 1 })).toContainText("Ama");
  await expect(guest.getByRole("heading", { name: "Taupe, Mocha & Ivory" })).toBeVisible();

  // The page is coloured from the chosen colours: mocha for the dark bands, a readable taupe-based accent.
  const vars = await guest.locator("#top").evaluate((el) => ({
    band: el.style.getPropertyValue("--w-band"),
    accent: el.style.getPropertyValue("--w-accent"),
  }));
  expect(vars.band).toBe("#291811");
  expect(vars.accent).toMatch(/^#[0-9A-F]{6}$/);
  if (process.env.SHOTS) await guest.screenshot({ path: `${process.env.SHOTS}/coloured.png`, fullPage: true });

  // The QR code encodes the canonical public URL.
  const qr = await guest.request.get(`/${slug}/qr?format=svg`);
  expect(qr.status()).toBe(200);
  expect(qr.headers()["content-type"]).toContain("image/svg+xml");

  // The guest replies: yes to the church, no to the traditional ceremony.
  const rsvp = guest.locator("#rsvp");
  await rsvp.getByRole("group", { name: /Church ceremony/ }).getByText("Will attend").click();
  await rsvp.getByRole("group", { name: /Traditional wedding/ }).getByText("Can't attend").click();
  await rsvp.getByLabel("Your name").fill("Esi Owusu");
  await rsvp.getByLabel("Email").fill("esi@example.com");
  await rsvp.getByRole("button", { name: "Send RSVP" }).click();
  await expect(guest.getByText(/We've noted which celebrations you'll join/)).toBeVisible({ timeout: 20_000 });
  await guestContext.close();
});

test("a family creates a celebration-of-life page without a countdown", async ({ page, browser }, testInfo) => {
  test.slow();
  await signUpAndVerify(page, uniqueEmail(`family-${testInfo.project.name}`), "Kojo Owusu");

  await page.getByText("Funeral & memorial", { exact: true }).click();
  await page.getByLabel("Full name of your loved one").fill("Esther Owusu");
  await page.getByLabel("Display name").first().fill("Madam Esther Owusu");
  await page.getByRole("button", { name: "Save & continue" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "The details" })).toBeVisible({ timeout: 20_000 });
  await page.getByLabel("Date of birth").fill("1948-03-14");
  await page.getByLabel("Date of passing").fill("2026-08-02");
  await page.getByLabel(/One person per line/).fill("Michael Owusu — Son\nAbena Owusu — Daughter");
  await page.getByRole("button", { name: "Save & continue" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "Programme & venues" })).toBeVisible({ timeout: 20_000 });
  await page.getByLabel("Event name").fill("Burial Service");
  await page.getByLabel("Starts").fill(`${year}-02-07T08:00`);
  await page.getByLabel(/Venue name/).fill("Presbyterian Church");
  await page.getByRole("button", { name: "Add event" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Skip for now" }).click();
  await page.getByRole("button", { name: "Continue to review" }).click();
  await page.getByRole("button", { name: "Publish my page" }).click();
  await expect(page.getByText("Your page is live")).toBeVisible({ timeout: 20_000 });
  const slug = new URL(await page.locator("code").first().innerText()).pathname.slice(1);

  const guest = await (await browser.newContext({ ...testInfo.project.use })).newPage();
  await guest.goto(`/${slug}`);
  await expect(guest.getByRole("heading", { level: 1 })).toHaveText("Celebrating the Life of Madam Esther Owusu");
  await expect(guest.getByText("In loving memory").first()).toBeVisible();
  await expect(guest.getByText("14 March 1948 – 2 August 2026")).toBeVisible();
  await expect(guest.getByRole("timer")).toHaveCount(0);
  await expect(guest.getByRole("heading", { name: "Order of Events" })).toBeVisible();
  await expect(guest.getByRole("heading", { name: "The Family" })).toBeVisible();
  await expect(guest.getByText("Michael Owusu")).toBeVisible();

  // The printable funeral brochure.
  await guest.goto(`/${slug}/programme`);
  await expect(guest.getByText("Order of Service")).toBeVisible();
  await expect(guest.getByRole("heading", { name: "Celebrating the Life of Madam Esther Owusu" })).toBeVisible();
  await expect(guest.getByText("Burial Service")).toBeVisible();
  if (process.env.SHOTS) await guest.screenshot({ path: `${process.env.SHOTS}/brochure.png`, fullPage: true });
});
