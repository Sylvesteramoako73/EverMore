import type { Metadata } from "next";
import { Suspense } from "react";
import { PublishControls, PublishSettingsForm } from "@/components/couple/publish-panel";
import { GuestFeaturesForm } from "@/components/dashboard/settings";
import { PageSkeleton } from "@/components/dashboard/skeleton";
import { appUrl } from "@/lib/env";
import { publishProblems } from "@/server/celebrations";
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
  const { celebration: c, pageUrl } = await loadDashboard();
  const problems = c.status === "published" ? [] : await publishProblems(c.id);

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
          }}
        />
      </section>
    </div>
  );
}
