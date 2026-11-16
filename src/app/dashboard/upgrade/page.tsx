import type { Metadata } from "next";
import { Check } from "lucide-react";
import { Suspense } from "react";
import { startPremiumUpgrade } from "@/app/actions/dashboard";
import { PageSkeleton } from "@/components/dashboard/skeleton";
import { Button } from "@/components/ui/button";
import { formatLongDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { billingEnabled, PLAN_LIST, PREMIUM_PRICE_MINOR } from "@/lib/plans";
import { paidUpgrade, upgradesAvailable } from "@/server/upgrades";
import { loadDashboard } from "../data";

export const metadata: Metadata = { title: "Upgrade" };

export default function UpgradePage(props: PageProps<"/dashboard/upgrade">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Upgrade {...props} />
    </Suspense>
  );
}

const NOTICES: Record<string, { tone: "good" | "bad" | "wait"; text: string }> = {
  thanks: { tone: "good", text: "Payment received. This page is now Premium. Thank you." },
  failed: { tone: "bad", text: "The payment didn't go through and you haven't been charged. You can try again." },
  pending: { tone: "wait", text: "We're still waiting for the payment to be confirmed. This page will switch to Premium as soon as it is, usually within a minute." },
  error: { tone: "bad", text: "We couldn't start the payment. Please try again in a moment." },
  "not-allowed": { tone: "bad", text: "Only the page owner or a co-host can upgrade this page." },
};

const TONE = { good: "bg-success/10 text-success", bad: "bg-destructive/10 text-destructive", wait: "bg-champagne/15 text-champagne-deep" } as const;

async function Upgrade({ searchParams }: PageProps<"/dashboard/upgrade">) {
  const [{ celebration: c, role }, sp] = await Promise.all([loadDashboard(), searchParams]);
  const premium = c.plan === "premium";
  const notice = typeof sp.result === "string" ? NOTICES[premium && sp.result === "pending" ? "thanks" : sp.result] : undefined;
  const receipt = premium ? await paidUpgrade(c.id) : null;
  const { free, premium: p } = PLAN_LIST;
  const price = formatMoney(PREMIUM_PRICE_MINOR);
  const rows: [string, string, string][] = [
    ["Designs", "Standard designs", "Every design, including premium"],
    ["Events", `Up to ${free.maxEvents}`, `Up to ${p.maxEvents}`],
    ["Invitations", `Up to ${free.maxGuests.toLocaleString("en-GH")}`, `Up to ${p.maxGuests.toLocaleString("en-GH")}`],
    ["Photos", `Up to ${free.maxPhotos}`, `Up to ${p.maxPhotos}`],
    ["People managing the page", `Up to ${free.maxMembers}`, `Up to ${p.maxMembers}, with planner access`],
  ];

  return (
    <div className="max-w-3xl space-y-8">
      <header>
        <h1 className="text-4xl text-navy">{premium ? "Premium" : "Upgrade to Premium"}</h1>
        <p className="mt-1 text-muted-foreground">
          {premium ? `${c.title} has everything EverMore offers.` : `One payment of ${price} for ${c.title}. No subscription, nothing to renew.`}
        </p>
      </header>

      {notice && <p role="status" className={`rounded-xl p-4 text-sm font-medium ${TONE[notice.tone]}`}>{notice.text}</p>}

      <section aria-labelledby="compare-h" className="overflow-hidden rounded-2xl bg-white ring-1 ring-border">
        <h2 id="compare-h" className="sr-only">What each plan includes</h2>
        <table className="w-full text-left text-sm">
          <thead className="bg-navy/5 text-navy">
            <tr>
              <th scope="col" className="p-4 font-medium"><span className="sr-only">Feature</span></th>
              <th scope="col" className="p-4 font-medium">Free</th>
              <th scope="col" className="p-4 font-medium">Premium</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map(([label, a, b]) => (
              <tr key={label}>
                <th scope="row" className="p-4 font-medium text-navy">{label}</th>
                <td className="p-4 text-muted-foreground">{a}</td>
                <td className="p-4 text-navy"><Check className="mr-1.5 inline h-4 w-4 text-champagne" aria-hidden />{b}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section aria-labelledby="pay-h" className="rounded-2xl bg-white p-6 ring-1 ring-border sm:p-8">
        {premium ? (
          <>
            <h2 id="pay-h" className="text-2xl text-navy">You&apos;re all set</h2>
            <p className="mt-2 text-muted-foreground">
              {receipt?.paidAt
                ? `Paid ${formatMoney(receipt.amountMinor, receipt.currency)} on ${formatLongDate(receipt.paidAt, c.timezone)}. Reference ${receipt.reference}.`
                : "This page is on Premium."}
            </p>
          </>
        ) : !billingEnabled() ? (
          <>
            <h2 id="pay-h" className="text-2xl text-navy">Everything is included for now</h2>
            <p className="mt-2 text-muted-foreground">EverMore is in early access, so this page already has every Premium feature at no charge.</p>
          </>
        ) : !upgradesAvailable() ? (
          <>
            <h2 id="pay-h" className="text-2xl text-navy">Premium is coming soon</h2>
            <p className="mt-2 text-muted-foreground">Online payment isn&apos;t switched on yet. Please check back shortly.</p>
          </>
        ) : role === "planner" ? (
          <>
            <h2 id="pay-h" className="text-2xl text-navy">Ask the page owner</h2>
            <p className="mt-2 text-muted-foreground">Only the page owner or a co-host can upgrade this page.</p>
          </>
        ) : (
          <>
            <h2 id="pay-h" className="text-2xl text-navy">{price}, paid once</h2>
            <p className="mt-2 text-muted-foreground">Pay securely with Mobile Money or card through Paystack. Premium applies to this celebration straight after payment and stays for as long as the page is online.</p>
            <form action={startPremiumUpgrade} className="mt-6">
              <Button type="submit" variant="gold" size="lg">Upgrade for {price}</Button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
