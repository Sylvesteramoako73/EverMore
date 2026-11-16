import { connection } from "next/server";
import { appUrl } from "@/lib/env";
import { verifyPagePayment } from "@/server/page-payments";

/** Paystack sends the host back here after checkout. We verify with Paystack, then show the outcome. */
export async function GET(request: Request) {
  await connection();
  const reference = new URL(request.url).searchParams.get("reference") ?? "";
  const payment = await verifyPagePayment(reference);
  const result = payment?.status === "paid" ? "thanks" : payment?.status === "failed" ? "failed" : "pending";
  return Response.redirect(appUrl(`/dashboard/payment?result=${result}`), 303);
}
