import { handlePaystackWebhook } from "@/server/gifts";

/** Paystack webhook (charge.success). The signature is checked against the raw body. */
export async function POST(request: Request) {
  const raw = await request.text();
  const ok = await handlePaystackWebhook(raw, request.headers.get("x-paystack-signature"));
  return new Response(null, { status: ok ? 200 : 401 });
}
