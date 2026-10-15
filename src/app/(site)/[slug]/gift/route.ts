import { connection } from "next/server";
import { appUrl } from "@/lib/env";
import { verifyOnlineGift } from "@/server/gifts";

/** Paystack sends the guest back here after checkout. We verify with Paystack, then return to the page. */
export async function GET(request: Request, { params }: RouteContext<"/[slug]/gift">) {
  await connection();
  const { slug } = await params;
  const reference = new URL(request.url).searchParams.get("reference") ?? "";
  const g = await verifyOnlineGift(reference);
  const outcome = g?.status === "confirmed" ? "thanks" : g?.status === "failed" ? "failed" : "pending";
  return Response.redirect(appUrl(`/${encodeURIComponent(slug)}?gift=${outcome}#gifts`), 303);
}
