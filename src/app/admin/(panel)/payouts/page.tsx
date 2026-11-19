import type { Metadata } from "next";
import { Suspense } from "react";
import { markPayoutPaidAction } from "@/app/actions/referrals";
import { PageSkeleton } from "@/components/dashboard/skeleton";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/dal";
import { formatMoney } from "@/lib/money";
import { listPayouts } from "@/server/referrals";

export const metadata: Metadata = { title: "Payouts" };

export default function PayoutsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Payouts />
    </Suspense>
  );
}

async function Payouts() {
  await requireAdmin();
  const [waiting, done] = await Promise.all([listPayouts("requested"), listPayouts("paid")]);
  const owed = waiting.reduce((a, r) => a + r.payout.amountMinor, 0);
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl text-navy">Payouts</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          Referral rewards that hosts have asked to cash out. Send the amount by Mobile Money, then press Mark as paid. Waiting now: {formatMoney(owed)}.
        </p>
      </header>
      <section aria-labelledby="waiting-h">
        <h2 id="waiting-h" className="mb-3 text-2xl text-navy">To pay ({waiting.length})</h2>
        {waiting.length ? (
          <ul className="grid gap-4 md:grid-cols-2">
            {waiting.map(({ payout: p, name, email }) => (
              <li key={p.id} className="rounded-2xl bg-white p-5 ring-1 ring-border">
                <p className="text-2xl text-navy">{formatMoney(p.amountMinor)}</p>
                <p className="mt-1 text-navy">{name} <span className="text-sm text-muted-foreground">{email}</span></p>
                <p className="mt-2 text-sm text-navy">{p.momoNetwork}: <strong>{p.momoNumber}</strong></p>
                <p className="mt-1 text-xs text-muted-foreground">Asked on {p.createdAt.toISOString().slice(0, 10)}</p>
                <form action={markPayoutPaidAction} className="mt-4 border-t border-border pt-3">
                  <input type="hidden" name="id" value={p.id} />
                  <Button type="submit" variant="gold">Mark as paid</Button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl border border-dashed border-border bg-white p-10 text-center text-muted-foreground">Nobody is waiting to be paid.</p>
        )}
      </section>
      {done.length > 0 && (
        <section aria-labelledby="done-h">
          <h2 id="done-h" className="mb-3 text-2xl text-navy">Paid</h2>
          <ul className="divide-y divide-border rounded-2xl bg-white ring-1 ring-border">
            {done.map(({ payout: p, name }) => (
              <li key={p.id} className="flex flex-wrap justify-between gap-2 px-5 py-3 text-sm text-navy">
                <span>{name}, {p.momoNetwork} {p.momoNumber}</span>
                <span>{formatMoney(p.amountMinor)} on {p.paidAt?.toISOString().slice(0, 10)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
