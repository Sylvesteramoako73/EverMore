import type { Metadata } from "next";
import { Check } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { payForPage } from "@/app/actions/dashboard";
import { PageSkeleton } from "@/components/dashboard/skeleton";
import { Button } from "@/components/ui/button";
import { formatLongDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { billingEnabled, entitlements, PAGE_PRICE_MINOR, PAID_PLAN } from "@/lib/plans";
import { paidPagePayment, pagePaymentsAvailable } from "@/server/page-payments";
import { loadDashboard } from "../data";

export const metadata: Metadata = { title: "Payment" };

export default function PaymentPage(props: PageProps<"/dashboard/payment">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Payment {...props} />
    </Suspense>
  );
}

const NOTICES: Record<string, { tone: "good" | "bad" | "wait"; text: string }> = {
  thanks: { tone: "good", text: "Payment received. Thank you." },
  failed: { tone: "bad", text: "The payment didn't go through and you haven't been charged. You can try again." },
  pending: { tone: "wait", text: "We're still waiting for the payment to be confirmed. Your page will be ready to go live as soon as it is, usually within a minute." },
  error: { tone: "bad", text: "We couldn't start the payment. Please try again in a moment." },
  "not-allowed": { tone: "bad", text: "Only the page owner or a co-host can pay for this page." },
};

const TONE = { good: "bg-success/10 text-success", bad: "bg-destructive/10 text-destructive", wait: "bg-champagne/15 text-champagne-deep" } as const;

async function Payment({ searchParams }: PageProps<"/dashboard/payment">) {
  const [{ celebration: c, role }, sp] = await Promise.all([loadDashboard(), searchParams]);
  const paid = c.plan === PAID_PLAN;
  const live = c.status === "published";
  const notice = typeof sp.result === "string" ? NOTICES[paid && sp.result === "pending" ? "thanks" : sp.result] : undefined;
  const receipt = paid ? await paidPagePayment(c.id) : null;
  const limits = entitlements();
  const price = formatMoney(PAGE_PRICE_MINOR);
  const included = [
    "Your page live at its own address, with a QR code",
    "Every design",
    `Up to ${limits.maxEvents} events and ${limits.maxGuests.toLocaleString("en-GH")} invitations`,
    "RSVPs, guestbook and guest photo sharing",
    `Up to ${limits.maxMembers} people managing the page`,
    "A memory page after the day",
  ];

  return (
    <div className="max-w-3xl space-y-8">
      <header>
        <h1 className="text-4xl text-navy">Payment</h1>
        <p className="mt-1 text-muted-foreground">
          {paid ? `${c.title} is paid for.` : `Building and previewing is free. Publishing ${c.title} costs ${price}, paid once. No subscription, nothing to renew.`}
        </p>
      </header>

      {notice && <p role="status" className={`rounded-xl p-4 text-sm font-medium ${TONE[notice.tone]}`}>{notice.text}</p>}

      <section aria-labelledby="pay-h" className="rounded-2xl bg-white p-6 ring-1 ring-border sm:p-8">
        {paid ? (
          <>
            <h2 id="pay-h" className="text-2xl text-navy">{live ? "Your page is live" : "You're all set to publish"}</h2>
            <p className="mt-2 text-muted-foreground">
              {receipt?.paidAt
                ? `Paid ${formatMoney(receipt.amountMinor, receipt.currency)} on ${formatLongDate(receipt.paidAt, c.timezone)}. Reference ${receipt.reference}.`
                : "This page doesn't need a payment."}
            </p>
            {!live && <Button asChild className="mt-6"><Link href="/dashboard/settings">Publish my page</Link></Button>}
          </>
        ) : !billingEnabled() ? (
          <>
            <h2 id="pay-h" className="text-2xl text-navy">Nothing to pay for now</h2>
            <p className="mt-2 text-muted-foreground">EverMore is in early access, so you can publish this page at no charge.</p>
          </>
        ) : !pagePaymentsAvailable() ? (
          <>
            <h2 id="pay-h" className="text-2xl text-navy">Payment is coming soon</h2>
            <p className="mt-2 text-muted-foreground">Online payment isn&apos;t switched on yet. Please check back shortly.</p>
          </>
        ) : role === "planner" ? (
          <>
            <h2 id="pay-h" className="text-2xl text-navy">Ask the page owner</h2>
            <p className="mt-2 text-muted-foreground">Only the page owner or a co-host can pay for this page.</p>
          </>
        ) : (
          <>
            <h2 id="pay-h" className="text-2xl text-navy">{price}, paid once</h2>
            <p className="mt-2 text-muted-foreground">Pay securely with Mobile Money or card through Paystack. Your page goes live as soon as the payment is confirmed, and stays for as long as it is online.</p>
            <form action={payForPage} className="mt-6">
              <Button type="submit" variant="gold" size="lg">Pay {price} and publish</Button>
            </form>
          </>
        )}
      </section>

      <section aria-labelledby="included-h" className="rounded-2xl bg-white p-6 ring-1 ring-border sm:p-8">
        <h2 id="included-h" className="text-2xl text-navy">What&apos;s included</h2>
        <ul className="mt-4 space-y-2.5 text-navy">
          {included.map((i) => (
            <li key={i} className="flex gap-2.5"><Check className="mt-1 h-4 w-4 shrink-0 text-champagne" aria-hidden /> {i}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
