import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { normaliseReferralCode, REFERRAL_COOKIE, REFERRAL_COOKIE_DAYS } from "@/lib/referrals";

/** An invite link: remember who sent the visitor for 30 days (the first invite wins), then go to sign up. */
export async function GET(request: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code: raw } = await ctx.params;
  const code = normaliseReferralCode(raw);
  const jar = await cookies();
  if (code && !jar.get(REFERRAL_COOKIE)) {
    jar.set(REFERRAL_COOKIE, code, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: REFERRAL_COOKIE_DAYS * 86_400 });
  }
  return NextResponse.redirect(new URL("/sign-up", request.url), 307);
}
