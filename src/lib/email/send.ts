import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { env, isProduction } from "@/lib/env";

export type EmailMessage = { to: string; subject: string; html: string; text: string };
export type SendResult = { delivered: true; id: string } | { delivered: false; reason: string };

/**
 * Send a transactional email through Resend. Without RESEND_API_KEY (local development, tests),
 * the message is written to ./data/outbox and logged instead, and the result says it was NOT delivered.
 */
export async function sendEmail(message: EmailMessage): Promise<SendResult> {
  if (env.RESEND_API_KEY) {
    const { Resend } = await import("resend");
    const resend = new Resend(env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({ from: env.EMAIL_FROM, ...message });
    if (error || !data) return { delivered: false, reason: error?.message ?? "Unknown email provider error" };
    return { delivered: true, id: data.id };
  }

  if (isProduction) {
    console.error(`[email] RESEND_API_KEY is not set; email "${message.subject}" was not sent.`);
    return { delivered: false, reason: "Email is not configured" };
  }

  const dir = path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "outbox");
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `${Date.now()}-${message.to.replace(/[^a-z0-9@.]/gi, "_")}.json`);
  await writeFile(file, JSON.stringify({ ...message, at: new Date().toISOString() }, null, 2));
  console.info(`[email:dev] To ${message.to}: ${message.subject}\n${message.text}\n(saved to ${file})`);
  return { delivered: false, reason: "Development outbox (no email provider configured)" };
}
