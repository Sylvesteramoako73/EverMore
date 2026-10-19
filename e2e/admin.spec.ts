import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";
import { signUpAndVerify, uniqueEmail } from "./helpers";

// The owner's admin area: only admins get in; they can see the platform, take a page down and
// restore it, and suspend an account.

const year = new Date().getFullYear() + 1;

test("only admins can open the admin area, and admins can moderate", async ({ page, browser }, testInfo) => {
  test.slow();

  // A host with a published page.
  const hostCtx = await browser.newContext({ ...testInfo.project.use });
  const host = await hostCtx.newPage();
  const hostEmail = uniqueEmail(`adminhost-${testInfo.project.name}`);
  await signUpAndVerify(host, hostEmail, "Kofi Mensah");
  await host.getByText("Birthday", { exact: true }).click();
  await host.getByLabel(/Whose birthday/).fill("Kofi Mensah");
  await host.getByRole("button", { name: "Save & continue" }).click();
  await expect(host.getByRole("heading", { level: 1, name: "The details" })).toBeVisible({ timeout: 20_000 });
  await host.getByRole("button", { name: "Save & continue" }).click();
  await host.getByLabel("Event name").fill("Birthday dinner");
  await host.getByLabel("Starts").fill(`${year}-03-03T19:00`);
  await host.getByLabel(/Venue name/).fill("Skybar");
  await host.getByRole("button", { name: "Add event" }).click();
  await host.getByRole("button", { name: "Continue" }).click();
  await host.getByRole("button", { name: "Skip for now" }).click();
  await host.getByRole("button", { name: "Continue to review" }).click();
  await host.getByRole("button", { name: "Publish my page" }).click();
  await expect(host.getByText("Your page is live")).toBeVisible({ timeout: 20_000 });
  const slug = new URL(await host.locator("code").first().innerText()).pathname.slice(1);

  // An ordinary user is turned away.
  await host.goto("/admin");
  await expect(host.getByRole("heading", { name: "This area is private" })).toBeVisible();
  await host.goto("/admin/login");
  await expect(host.getByRole("heading", { name: "Not an admin account" })).toBeVisible();

  // Make a second account an admin with the command-line tool.
  const adminEmail = uniqueEmail(`owner-${testInfo.project.name}`);
  await signUpAndVerify(page, adminEmail, "Sylvester Amoako");
  execFileSync("node", ["scripts/make-admin.mjs", adminEmail], { stdio: "pipe" });
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Platform overview" })).toBeVisible();

  // Signed out, /admin leads to the admin sign-in, which goes straight back into the admin area.
  const fresh = await (await browser.newContext({ ...testInfo.project.use })).newPage();
  await fresh.goto("/admin");
  await expect(fresh).toHaveURL(/\/admin\/login/);
  await expect(fresh.getByRole("heading", { name: "Admin sign in" })).toBeVisible();
  await fresh.getByLabel("Email").fill(adminEmail);
  await fresh.getByLabel("Password").fill("a long enough passphrase");
  await fresh.getByRole("button", { name: /sign in/i }).click();
  await expect(fresh.getByRole("heading", { name: "Platform overview" })).toBeVisible({ timeout: 20_000 });
  if (process.env.SHOTS) {
    const out = await (await browser.newContext({ ...testInfo.project.use })).newPage();
    await out.goto("/admin/login");
    await out.screenshot({ path: `${process.env.SHOTS}/admin-login.png` });
  }

  // Take the host's page down: the public link stops working. Then restore it.
  await page.goto(`/admin/pages?q=${encodeURIComponent(slug)}`);
  const row = page.getByRole("row").filter({ hasText: slug });
  page.once("dialog", (d) => d.accept());
  await row.getByRole("button", { name: "Take down" }).click();
  await expect(row.getByText("Taken down")).toBeVisible({ timeout: 20_000 });
  const guest = await (await browser.newContext()).newPage();
  const res = await guest.goto(`/${slug}`);
  await expect(guest.getByText(/could not be found|not found/i).first()).toBeVisible();
  expect(res).not.toBeNull();
  await row.getByRole("button", { name: "Restore" }).click();
  await expect(row.getByText("Draft")).toBeVisible({ timeout: 20_000 });

  // Suspend the host: they are signed out and can't get back in.
  await page.goto(`/admin/users?q=${encodeURIComponent(hostEmail)}`);
  const userRow = page.getByRole("row").filter({ hasText: hostEmail });
  page.once("dialog", (d) => d.accept());
  await userRow.getByRole("button", { name: "Suspend" }).click();
  await expect(userRow.getByText("Suspended")).toBeVisible({ timeout: 20_000 });
  await host.goto("/dashboard");
  await expect(host).toHaveURL(/sign-in/, { timeout: 20_000 });

  // The actions are in the activity log.
  await page.goto("/admin/activity");
  await expect(page.getByText("suspended an account").first()).toBeVisible();
  await expect(page.getByText("took down a page").first()).toBeVisible();
  if (process.env.SHOTS) {
    for (const p of ["", "/users", "/pages"]) {
      await page.goto(`/admin${p}`);
      await page.screenshot({ path: `${process.env.SHOTS}/admin${p.replace("/", "-") || "-home"}.png`, fullPage: true });
    }
  }
  await hostCtx.close();
});
