import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { expect, type Page } from "@playwright/test";

const OUTBOX = path.join(process.cwd(), "data", "outbox");

/** The newest email in the development outbox addressed to `to` (polls briefly). */
export async function latestEmail(to: string, subjectIncludes: string) {
  for (let i = 0; i < 40; i++) {
    const files = (await readdir(OUTBOX).catch(() => [] as string[])).filter((f) => f.endsWith(".json")).sort().reverse();
    for (const f of files) {
      const msg = JSON.parse(await readFile(path.join(OUTBOX, f), "utf8")) as { to: string; subject: string; text: string };
      if (msg.to === to && msg.subject.includes(subjectIncludes)) return msg;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`No "${subjectIncludes}" email for ${to}`);
}

export function linkIn(text: string) {
  const match = text.match(/https?:\/\/\S+/);
  if (!match) throw new Error("No link in email");
  return match[0];
}

export const uniqueEmail = (label: string) => `${label}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;

/** Sign up, confirm the email from the outbox, and land on onboarding. */
export async function signUpAndVerify(page: Page, email: string, name = "Ama Mensah") {
  await page.goto("/sign-up");
  await page.getByLabel("Your name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("a long enough passphrase");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible({ timeout: 30_000 });
  const mail = await latestEmail(email, "Confirm your email");
  // The link points at APP_URL; follow it on the server under test.
  const link = new URL(linkIn(mail.text));
  await page.goto(link.pathname + link.search);
  await expect(page).toHaveURL(/\/onboarding/, { timeout: 30_000 });
}
