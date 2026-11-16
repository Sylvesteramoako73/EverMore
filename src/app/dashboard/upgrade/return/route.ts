import { connection } from "next/server";
import { appUrl } from "@/lib/env";
import { verifyUpgrade } from "@/server/upgrades";

/** Paystack sends the host back here after checkout. We verify with Paystack, then show the outcome. */
export async function GET(request: Request) {
  await connection();
  const reference = new URL(request.url).searchParams.get("reference") ?? "";
  const payment = await verifyUpgrade(reference);
  const result = payment?.status === "paid" ? "thanks" : payment?.status === "failed" ? "failed" : "pending";
  return Response.redirect(appUrl(`/dashboard/upgrade?result=${result}`), 303);
}
