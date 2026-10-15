import type { Metadata } from "next";
import { Check, Download, Trash2, X } from "lucide-react";
import { Suspense } from "react";
import { markGift, removeFund, removeGift } from "@/app/actions/dashboard";
import { ActionButton } from "@/components/dashboard/bits";
import { EditFund, FundForm } from "@/components/dashboard/gifts";
import { PageSkeleton } from "@/components/dashboard/skeleton";
import { Button } from "@/components/ui/button";
import { formatLongDate } from "@/lib/dates";
import { paymentsEnabled } from "@/lib/env";
import { formatMoney } from "@/lib/money";
import { fundTotals, listFunds, listGifts } from "@/server/gifts";
import { loadDashboard } from "../data";

export const metadata: Metadata = { title: "Gifts" };

export default function GiftsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Gifts />
    </Suspense>
  );
}

const SUGGESTED: Record<string, string> = {
  wedding: "Wedding gift",
  funeral: "Funeral contributions",
  outing: "Trip fund",
  naming: "Blessings for the baby",
  birthday: "Birthday gift",
};

async function Gifts() {
  const { celebration: c } = await loadDashboard();
  const [funds, totals, gifts] = await Promise.all([listFunds(c.id), fundTotals(c.id), listGifts(c.id)]);
  const online = paymentsEnabled();
  const confirmed = gifts.filter((g) => g.status === "confirmed");
  const total = confirmed.reduce((n, g) => n + g.amountMinor, 0);
  const waiting = gifts.filter((g) => g.status === "pending" && g.method === "momo_direct");
  const fundName = new Map(funds.map((f) => [f.id, f.title]));

  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl text-navy">{c.kind === "funeral" ? "Contributions" : "Gifts"}</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            {formatMoney(total)} received from {confirmed.length} {confirmed.length === 1 ? "person" : "people"}
            {waiting.length ? ` · ${waiting.length} waiting for you to confirm` : ""}
          </p>
        </div>
        {gifts.length > 0 && (
          <Button asChild variant="outline">
            <a href="/dashboard/gifts/export" download><Download className="h-4 w-4" aria-hidden /> Download as spreadsheet</a>
          </Button>
        )}
      </header>

      <p className="rounded-xl bg-white p-4 text-sm text-muted-foreground ring-1 ring-border">
        {online
          ? "Guests can pay online by Mobile Money (MTN, Telecel, AT) or card through Paystack, and online gifts are confirmed automatically. Guests can also send to your MoMo number directly and tell you here."
          : "Guests send Mobile Money straight to the number you add, then tell you here so you can confirm and thank them. Online payment by MoMo or card can be switched on later with a Paystack account."}
      </p>

      {waiting.length > 0 && (
        <section aria-labelledby="confirm-h">
          <h2 id="confirm-h" className="mb-3 text-2xl text-navy">Did you receive these?</h2>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl bg-white ring-1 ring-champagne">
            {waiting.map((g) => (
              <li key={g.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-navy">{g.name} · {formatMoney(g.amountMinor, g.currency)}</p>
                  <p className="text-sm text-muted-foreground">
                    {[g.phone, fundName.get(g.fundId ?? ""), formatLongDate(g.createdAt, c.timezone)].filter(Boolean).join(" · ")}
                  </p>
                  {g.message && <p className="mt-1 text-sm text-navy italic">&ldquo;{g.message}&rdquo;</p>}
                </div>
                <div className="flex gap-2">
                  <ActionButton variant="outline" action={markGift.bind(null, g.id, "confirmed")}>
                    <Check className="h-4 w-4" aria-hidden /> Received
                  </ActionButton>
                  <ActionButton action={markGift.bind(null, g.id, "failed")}>
                    <X className="h-4 w-4" aria-hidden /> Not received
                  </ActionButton>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="funds-h" className="space-y-4">
        <h2 id="funds-h" className="text-2xl text-navy">Your funds</h2>
        {funds.map((f) => {
          const t = totals.get(f.id) ?? { raised: 0, count: 0 };
          const pct = f.goalMinor ? Math.min(100, Math.round((t.raised / f.goalMinor) * 100)) : null;
          return (
            <div key={f.id} className="rounded-2xl bg-white p-6 ring-1 ring-border">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xl text-navy">{f.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatMoney(t.raised, f.currency)}
                    {f.goalMinor ? ` of ${formatMoney(f.goalMinor, f.currency)}` : ""} · {t.count} {t.count === 1 ? "gift" : "gifts"}
                    {f.momoNumber && ` · ${f.momoNetwork} ${f.momoNumber}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <EditFund
                    fund={{
                      id: f.id,
                      title: f.title,
                      description: f.description,
                      goal: f.goalMinor ? String(f.goalMinor / 100) : "",
                      showProgress: f.showProgress,
                      momoNumber: f.momoNumber,
                      momoName: f.momoName,
                      momoNetwork: f.momoNetwork,
                    }}
                  />
                  <ActionButton action={removeFund.bind(null, f.id)} confirm={`Delete "${f.title}"? Gifts already received are kept.`} className="text-destructive">
                    <Trash2 className="h-4 w-4" aria-hidden /><span className="sr-only">Delete fund</span>
                  </ActionButton>
                </div>
              </div>
              {pct !== null && (
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${pct}% of goal`}>
                  <div className="h-full rounded-full bg-champagne" style={{ width: `${pct}%` }} />
                </div>
              )}
            </div>
          );
        })}
        {funds.length === 0 && (
          <div className="rounded-2xl bg-white p-6 ring-1 ring-border">
            <h3 className="mb-4 text-xl text-navy">Start collecting gifts</h3>
            <FundForm suggestedTitle={SUGGESTED[c.kind] ?? "Gifts"} />
          </div>
        )}
        {funds.length > 0 && funds.length < 5 && (
          <details className="group rounded-2xl bg-white p-6 ring-1 ring-border">
            <summary className="cursor-pointer list-none text-lg text-navy [&::-webkit-details-marker]:hidden">+ Add another fund</summary>
            <div className="mt-4"><FundForm /></div>
          </details>
        )}
      </section>

      {gifts.length > 0 && (
        <section aria-labelledby="all-h">
          <h2 id="all-h" className="mb-3 text-2xl text-navy">Everyone who gave</h2>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl bg-white ring-1 ring-border">
            {gifts.map((g) => (
              <li key={g.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-navy">
                    {g.name} <span className="font-normal text-muted-foreground">· {formatMoney(g.amountMinor, g.currency)}</span>
                    {g.anonymous && <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">hidden from guests</span>}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {[
                      g.method === "paystack" ? `Online${g.channel ? ` (${g.channel})` : ""}` : "Direct MoMo",
                      fundName.get(g.fundId ?? ""),
                      g.phone,
                      g.email,
                      formatLongDate(g.createdAt, c.timezone),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {g.message && <p className="mt-1 text-sm text-navy italic">&ldquo;{g.message}&rdquo;</p>}
                </div>
                <span
                  className={`w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    g.status === "confirmed" ? "bg-success/10 text-success" : g.status === "failed" ? "bg-destructive/10 text-destructive" : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {g.status === "confirmed" ? "Received" : g.status === "failed" ? (g.method === "paystack" ? "Payment failed" : "Not received") : "Waiting"}
                </span>
                {g.method === "momo_direct" && g.status !== "pending" && (
                  <ActionButton action={removeGift.bind(null, g.id)} confirm="Delete this record?" className="text-muted-foreground">
                    <Trash2 className="h-4 w-4" aria-hidden /><span className="sr-only">Delete</span>
                  </ActionButton>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
