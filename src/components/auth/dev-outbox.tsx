import "server-only";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { connection } from "next/server";
import { env, isProduction } from "@/lib/env";

/**
 * Local development only: with no email provider configured, emails land in ./data/outbox.
 * This shows the newest few with their links so you can confirm an account without opening files.
 * Renders nothing in production or when a real provider is set up.
 */
export async function DevOutbox() {
  await connection();
  if (isProduction || env.RESEND_API_KEY) return null;

  const dir = path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "outbox");
  const files = (await readdir(dir).catch(() => [] as string[])).filter((f) => f.endsWith(".json")).sort().reverse().slice(0, 3);
  const messages = await Promise.all(
    files.map(async (f) => {
      const m = JSON.parse(await readFile(path.join(dir, f), "utf8")) as { to: string; subject: string; text: string; at: string };
      return { ...m, link: m.text.match(/https?:\/\/\S+/)?.[0] ?? null };
    }),
  );
  if (messages.length === 0) return null;

  return (
    <aside className="mt-10 rounded-xl border border-dashed border-champagne/60 bg-white p-4 text-left text-sm">
      <p className="font-semibold text-navy">Development outbox</p>
      <p className="mt-1 text-xs text-muted-foreground">No email provider is set up locally, so emails are saved here instead. Only visible in development.</p>
      <ul className="mt-3 space-y-3">
        {messages.map((m) => (
          <li key={m.at + m.to}>
            <p className="text-navy">{m.subject}</p>
            <p className="text-xs text-muted-foreground">To {m.to} · {new Date(m.at).toLocaleTimeString()}</p>
            {m.link && <a href={m.link} className="mt-1 inline-block font-medium text-champagne-deep underline">Open the link</a>}
          </li>
        ))}
      </ul>
    </aside>
  );
}
