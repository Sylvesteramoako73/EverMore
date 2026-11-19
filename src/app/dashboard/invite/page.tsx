import type { Metadata } from "next";
import { Suspense } from "react";
import { InviteTools, PayoutAccountForm } from "@/components/dashboard/invite";
import { PageSkeleton } from "@/components/dashboard/skeleton";
import { siteUrl } from "@/lib/env";
import { formatMoney } from "@/lib/money";
import { PAGE_PRICE_MINOR } from "@/lib/plans";
import { REFERRAL_DISCOUNT_MINOR, REFERRAL_REWARD_MINOR, REWARD_HOLD_DAYS } from "@/lib/referrals";
import { getOrCreateReferralCode, referralSummary } from "@/server/referrals";
import { loadDashboard } from "../data";

export const metadata: Metadata = { title: "Invite and earn" };

export default function InvitePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Invite />
    </Suspense>
  );
}

async function Invite() {
  const { user } = await loadDashboard();
  const [code, s] = await Promise.all([getOrCreateReferralCode(user.id), referralSummary(user.id)]);
  const link = siteUrl(`/r/${code}`);
  const reward = formatMoney(REFERRAL_REWARD_MINOR);
  const stats = [
    { label: "Friends signed up", value: String(s.signedUp) },
    { label: "Friends who paid", value: String(s.paidFriends) },
    { label: `Waiting (${REWARD_HOLD_DAYS} days)`, value: formatMoney(s.pendingMinor) },
    { label: "Ready to cash out", value: formatMoney(s.availableMinor) },
    { label: "On its way to you", value: formatMoney(s.requestedMinor) },
    { label: "Paid to you", value: formatMoney(s.paidOutMinor) },
  ];
  return (
    <div className="max-w-3xl space-y-8">
      <header>
        <h1 className="text-4xl text-navy">Invite and earn</h1>
        <p className="mt-1 text-muted-foreground">
          Share your link. Your friend saves {formatMoney(REFERRAL_DISCOUNT_MINOR)} on their page, and you earn {reward} in Mobile Money for every friend who pays and publishes.
        </p>
      </header>

      <section aria-labelledby="link-h" className="rounded-2xl bg-white p-6 ring-1 ring-border sm:p-8">
        <h2 id="link-h" className="text-2xl text-navy">Your link</h2>
        <InviteTools link={link} code={code} />
      </section>

      <section aria-labelledby="earn-h" className="rounded-2xl bg-white p-6 ring-1 ring-border sm:p-8">
        <h2 id="earn-h" className="text-2xl text-navy">Your earnings</h2>
        <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {stats.map((x) => (
            <div key={x.label} className="rounded-xl bg-[#f6f3ec] p-4">
              <dt className="text-xs text-muted-foreground">{x.label}</dt>
              <dd className="mt-1 text-2xl text-navy">{x.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-sm text-muted-foreground">
          A reward waits {REWARD_HOLD_DAYS} days after your friend pays, then it is ready to cash out. You can cash out from {formatMoney(s.minPayoutMinor)}. We send it to your Mobile Money number, usually within a week.
        </p>
        <PayoutAccountForm momoNumber={s.momoNumber} momoNetwork={s.momoNetwork} availableMinor={s.availableMinor} minPayoutMinor={s.minPayoutMinor} />
      </section>

      <section aria-labelledby="rules-h" className="rounded-2xl bg-white p-6 ring-1 ring-border sm:p-8">
        <h2 id="rules-h" className="text-2xl text-navy">How it works</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-navy">
          <li>Your friend opens your link, creates an account and builds their page for free.</li>
          <li>When they pay to publish, they pay {formatMoney(PAGE_PRICE_MINOR - REFERRAL_DISCOUNT_MINOR)} instead of {formatMoney(PAGE_PRICE_MINOR)}.</li>
          <li>You earn {reward} once their payment is confirmed and the hold ends.</li>
          <li>Invites to yourself, or to people who already paid for a page, do not earn a reward.</li>
        </ul>
      </section>
    </div>
  );
}
