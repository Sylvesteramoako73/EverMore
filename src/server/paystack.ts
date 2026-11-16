import "server-only";
import { env } from "@/lib/env";

const PAYSTACK = "https://api.paystack.co";

export type PaystackTransaction = { status: string; reference: string; amount: number; currency: string; channel: string; authorization?: { bank?: string } };

/** Call the Paystack API with our secret key. Throws with Paystack's message when a call fails. */
export async function paystack<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${PAYSTACK}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json", ...init?.headers },
    signal: AbortSignal.timeout(15_000),
  });
  const body = (await res.json().catch(() => ({}))) as { status?: boolean; message?: string; data?: T };
  if (!res.ok || !body.status || !body.data) throw new Error(body.message ?? `Paystack error ${res.status}`);
  return body.data;
}
