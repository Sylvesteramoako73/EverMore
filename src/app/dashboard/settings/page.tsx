import type { Metadata } from "next";
import { Suspense } from "react";
import { PublishControls, PublishSettingsForm } from "@/components/couple/publish-panel";
import { cancelInvite, removeHelper } from "@/app/actions/dashboard";
import { ActionButton } from "@/components/dashboard/bits";
import { GuestFeaturesForm, InviteHelperForm } from "@/components/dashboard/settings";
import { PageSkeleton } from "@/components/dashboard/skeleton";
import { appUrl } from "@/lib/env";
import { entitlements } from "@/lib/plans";
import { listMembers, publishProblems } from "@/server/celebrations";
import { listInvites } from "@/server/members";
import { loadDashboard } from "../data";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Settings />
    </Suspense>
  );
}

async function Settings() {
  const { celebration: c, pageUrl, user, role } = await loadDashboard();
  const [problems, members, invites] = await Promise.all([
    c.status === "published" ? Promise.resolve([]) : publishProblems(c.id),
    listMembers(c.id),
    listInvites(c.id),
  ]);
  const owner = role === "owner";
  const ROLE = { owner: "Owner", cohost: "Co-host", planner: "Planner" } as const;

  return (
    <div className="max-w-3xl space-y-10">
      <header>
        <h1 className="text-4xl text-navy">Settings</h1>
        <p className="mt-1 text-muted-foreground">Your page address, who can see it, and what guests can do.</p>
      </header>

      <section aria-labelledby="status-h" className="rounded-2xl bg-white p-6 ring-1 ring-border sm:p-8">
        <h2 id="status-h" className="mb-4 text-2xl text-navy">Status</h2>
        <PublishControls status={c.status} url={pageUrl} problems={problems} />
      </section>

      <section aria-labelledby="address-h" className="rounded-2xl bg-white p-6 ring-1 ring-border sm:p-8">
        <h2 id="address-h" className="mb-4 text-2xl text-navy">Address &amp; privacy</h2>
        <PublishSettingsForm slug={c.slug} visibility={c.visibility} allowIndexing={c.allowIndexing} origin={appUrl()} />
      </section>

      <section id="people" aria-labelledby="people-h" className="scroll-mt-24 rounded-2xl bg-white p-6 ring-1 ring-border sm:p-8">
        <h2 id="people-h" className="text-2xl text-navy">People who manage this page</h2>
        <p className="mt-1 mb-5 text-sm text-muted-foreground">Invite your partner, family or a planner to help with guests, replies, messages and photos.</p>
        <ul className="divide-y divide-border rounded-xl ring-1 ring-border">
          {members.map((m) => (
            <li key={m.userId} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="font-medium text-navy">{m.name}{m.userId === user.id && <span className="text-muted-foreground"> (you)</span>}</p>
                <p className="truncate text-sm text-muted-foreground">{m.email} · {ROLE[m.role]}</p>
              </div>
              {owner && m.role !== "owner" && (
                <ActionButton action={removeHelper.bind(null, m.userId)} confirm={`Remove ${m.name}? They'll no longer be able to manage this page.`} className="text-destructive">Remove</ActionButton>
              )}
            </li>
          ))}
          {invites.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate font-medium text-navy">{i.email}</p>
                <p className="text-sm text-muted-foreground">Invited as {ROLE[i.role].toLowerCase()} · waiting to accept</p>
              </div>
              {owner && <ActionButton action={cancelInvite.bind(null, i.id)}>Cancel</ActionButton>}
            </li>
          ))}
        </ul>
        {owner ? (
          <div className="mt-6"><InviteHelperForm plannerAllowed={entitlements(c.plan).plannerMembers} /></div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">Only the page owner can invite or remove people.</p>
        )}
      </section>

      <section id="guests" aria-labelledby="guests-h" className="scroll-mt-24 rounded-2xl bg-white p-6 ring-1 ring-border sm:p-8">
        <h2 id="guests-h" className="mb-4 text-2xl text-navy">What guests can do</h2>
        <GuestFeaturesForm
          values={{
            rsvpEnabled: c.rsvpEnabled,
            openRsvp: c.openRsvp,
            defaultPartySize: c.defaultPartySize,
            mealOptions: c.mealOptions,
            askDietary: c.askDietary,
            guestbookEnabled: c.guestbookEnabled,
            guestbookModeration: c.guestbookModeration,
            guestUploadsEnabled: c.guestUploadsEnabled,
            guestUploadsModeration: c.guestUploadsModeration,
            giftMessage: c.giftMessage,
            giftLinks: c.giftLinks,
            thankYouMessage: c.thankYouMessage,
            hiddenSections: c.hiddenSections,
            tableFinderEnabled: c.tableFinderEnabled,
            livestreamUrl: c.livestreamUrl,
          }}
        />
      </section>
    </div>
  );
}
