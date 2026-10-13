import { expect, test } from "@playwright/test";
import { signUpAndVerify, uniqueEmail } from "./helpers";

// Milestone 1: a couple registers, completes the guided form, picks a theme, previews, publishes,
// and shares a working URL and QR code. A guest then opens the page and replies.

const year = new Date().getFullYear() + 1;

test("a couple creates, publishes and shares their wedding website", async ({ page, browser }, testInfo) => {
  test.slow();
  const email = uniqueEmail(`couple-${testInfo.project.name}`);
  await signUpAndVerify(page, email);

  // Step 1: the two of you
  await expect(page.getByRole("heading", { level: 1, name: "The two of you" })).toBeVisible();
  await page.getByLabel("Your full name").fill("Ama Mensah");
  await page.getByLabel("Your partner's full name").fill("Kofi Boateng");
  await page.getByLabel(/A message to your guests/).fill("We can't wait to celebrate with you.");
  await page.getByRole("button", { name: "Save & continue" }).click();

  // Step 2: wedding details
  await expect(page.getByRole("heading", { level: 1, name: "Your wedding" })).toBeVisible({ timeout: 20_000 });
  await page.getByLabel(/Your timezone/).selectOption("Africa/Accra");
  await page.getByLabel(/Wedding hashtag/).fill("AmaAndKofi");
  await page.getByRole("button", { name: "Save & continue" }).click();

  // Step 3: events. Two celebrations, different venues.
  await expect(page.getByRole("heading", { level: 1, name: "Events & venues" })).toBeVisible({ timeout: 20_000 });
  await page.getByLabel("Event name").fill("Traditional wedding");
  await page.getByLabel("Starts").fill(`${year}-06-11T10:00`);
  await page.getByLabel(/Venue name/).fill("The Family Home");
  await page.getByRole("button", { name: "Add event" }).click();
  await page.getByRole("link", { name: "+ Add another event" }).click();
  await page.getByLabel("Event name").fill("Church ceremony");
  await page.getByLabel("Starts").fill(`${year}-06-12T14:00`);
  await page.getByLabel(/Venue name/).fill("Holy Trinity Cathedral");
  await page.getByLabel(/Dress code/).fill("Formal");
  await page.getByRole("button", { name: "Add event" }).click();
  await expect(page.getByRole("heading", { name: "Church ceremony" })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 4: photos (skipped here; covered by its own test)
  await expect(page.getByRole("heading", { level: 1, name: "Photographs" })).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Skip for now" }).click();

  // Step 5: theme
  await expect(page.getByRole("heading", { level: 1, name: "Choose a design" })).toBeVisible({ timeout: 20_000 });
  await page.getByText("Romantic Garden").click();
  await expect(page.getByText("Applying theme…")).toBeHidden({ timeout: 20_000 });
  await page.getByRole("button", { name: "Continue to review" }).click();

  // Step 6: publish
  await expect(page.getByRole("heading", { level: 1, name: "Review & publish" })).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Publish my page" }).click();
  await expect(page.getByText("Your page is live")).toBeVisible({ timeout: 20_000 });
  const url = await page.locator("code").first().innerText();
  const slug = new URL(url).pathname.split("/").pop()!;
  expect(slug).toMatch(/^ama-and-kofi/); // a suffix is added if an earlier couple took the name

  // A guest opens the link in a fresh, signed-out browser.
  const guestContext = await browser.newContext({ ...testInfo.project.use });
  const guest = await guestContext.newPage();
  const res = await guest.goto(`/w/${slug}`);
  expect(res?.status()).toBe(200);
  await expect(guest.getByRole("heading", { level: 1 })).toContainText("Ama");
  await expect(guest.getByRole("heading", { name: "Church ceremony" })).toBeVisible();

  // The QR code encodes the canonical public URL.
  const qr = await guest.request.get(`/w/${slug}/qr?format=svg`);
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
