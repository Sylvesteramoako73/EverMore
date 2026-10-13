import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Logo } from "@/components/brand";
import { EventForm, EventList } from "@/components/couple/event-forms";
import { PhotoManager } from "@/components/couple/photo-manager";
import { PublishControls, PublishSettingsForm } from "@/components/couple/publish-panel";
import { ThemePicker } from "@/components/couple/theme-picker";
import { ContinueButton, CoupleStep, WeddingInfoStep } from "@/components/couple/wizard-steps";
import { Skeleton } from "@/components/ui/skeleton";
import { listMyWeddings, requireUser } from "@/lib/dal";
import { appUrl } from "@/lib/env";
import { entitlements } from "@/lib/plans";
import { THEMES } from "@/lib/themes";
import { timeZones } from "@/lib/timezones";
import { listEvents } from "@/server/events";
import { listMedia } from "@/server/media";
import { eventValues, photoItem } from "@/server/views";
import { getWedding, publishProblems } from "@/server/weddings";

export const metadata: Metadata = { title: "Create your wedding website", robots: { index: false } };

const STEPS = [
  { n: 1, title: "The two of you", short: "Couple" },
  { n: 2, title: "Your wedding", short: "Wedding" },
  { n: 3, title: "Events & venues", short: "Events" },
  { n: 4, title: "Photographs", short: "Photos" },
  { n: 5, title: "Choose a design", short: "Design" },
  { n: 6, title: "Review & publish", short: "Publish" },
];

export default function OnboardingPage(props: PageProps<"/onboarding">) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b border-border bg-white/70 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo href="/" />
          <Link href="/dashboard" className="text-sm text-navy underline-offset-4 hover:underline">Save & exit</Link>
        </div>
      </header>
      <main id="main" className="flex-1">
        <Suspense fallback={<WizardSkeleton />}>
          <Wizard {...props} />
        </Suspense>
      </main>
    </div>
  );
}

function WizardSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-12" aria-label="Loading" role="status">
      <Skeleton className="h-2 w-full" />
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

async function Wizard({ searchParams }: PageProps<"/onboarding">) {
  const user = await requireUser();
  const sp = await searchParams;
  const [mine] = await listMyWeddings(user.id);
  const wedding = mine ? await getWedding(mine.id) : null;

  // You can revisit any step you've reached, but not skip ahead of it.
  const reached = wedding ? Math.max(wedding.onboardingStep, 1) + 1 : 1;
  const requested = Number(sp.step ?? (wedding ? Math.min(reached, 6) : 1));
  const step = Number.isInteger(requested) ? Math.min(Math.max(requested, 1), Math.min(reached, 6)) : 1;
  const current = STEPS[step - 1];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <nav aria-label="Setup progress" className="mb-10">
        <ol className="grid grid-cols-6 gap-1.5 sm:gap-2">
          {STEPS.map((s) => {
            const done = s.n < step;
            const active = s.n === step;
            const reachable = s.n <= reached && wedding;
            const label = (
              <>
                <span className={`block h-1.5 rounded-full ${done || active ? "bg-navy" : "bg-border"}`} />
                <span className={`mt-2 hidden text-xs sm:block ${active ? "font-semibold text-navy" : "text-muted-foreground"}`}>{s.short}</span>
              </>
            );
            return (
              <li key={s.n} aria-current={active ? "step" : undefined}>
                {reachable && !active ? (
                  <Link href={`/onboarding?step=${s.n}`} className="block" aria-label={`Step ${s.n}: ${s.title}`}>{label}</Link>
                ) : (
                  <span className="block" aria-label={`Step ${s.n}: ${s.title}${done ? " (done)" : ""}`}>{label}</span>
                )}
              </li>
            );
          })}
        </ol>
        <p className="mt-3 text-xs text-muted-foreground sm:hidden">Step {step} of 6 · {current.short}</p>
      </nav>

      <header className="mb-10 max-w-2xl">
        <p className="eyebrow">Step {step} of 6</p>
        <h1 className="mt-3 text-4xl text-navy sm:text-5xl">{current.title}</h1>
      </header>

      {step === 1 && (
        <div className="max-w-3xl">
          <CoupleStep
            values={
              wedding
                ? {
                    partnerOneFullName: wedding.partnerOneFullName,
                    partnerOneDisplayName: wedding.partnerOneDisplayName,
                    partnerTwoFullName: wedding.partnerTwoFullName,
                    partnerTwoDisplayName: wedding.partnerTwoDisplayName,
                    monogram: wedding.monogram,
                    story: wedding.story,
                    guestMessage: wedding.guestMessage,
                    relationshipStartDate: wedding.relationshipStartDate,
                    engagementDate: wedding.engagementDate,
                  }
                : undefined
            }
          />
        </div>
      )}

      {wedding && step === 2 && (
        <div className="max-w-3xl">
          <WeddingInfoStep
            zones={timeZones()}
            values={{
              weddingDate: wedding.weddingDate,
              timezone: wedding.timezone,
              weddingType: wedding.weddingType,
              rsvpDeadline: wedding.rsvpDeadline,
              dressCode: wedding.dressCode,
              announcement: wedding.announcement,
              hashtag: wedding.hashtag,
              contactName: wedding.contactName,
              contactEmail: wedding.contactEmail,
              contactPhone: wedding.contactPhone,
            }}
          />
        </div>
      )}

      {wedding && step === 3 && <EventsStep weddingId={wedding.id} primaryEventId={wedding.primaryEventId} timezone={wedding.timezone} editing={typeof sp.event === "string" ? sp.event : null} />}

      {wedding && step === 4 && <PhotosStep weddingId={wedding.id} heroId={wedding.heroMediaId} />}

      {wedding && step === 5 && (
        <div className="space-y-10">
          <p className="max-w-2xl text-muted-foreground">Every design is complete and works beautifully on phones. Pick one now; you can change it any time.</p>
          <ThemePicker themes={THEMES} current={wedding.themeId} slug={wedding.slug} premiumAllowed={entitlements(wedding.plan).premiumThemes} />
          <div className="flex justify-end border-t border-border pt-6"><ContinueButton step={6} label="Continue to review" /></div>
        </div>
      )}

      {wedding && step === 6 && <PublishStep weddingId={wedding.id} />}
    </div>
  );
}

async function EventsStep({ weddingId, primaryEventId, timezone, editing }: { weddingId: string; primaryEventId: string | null; timezone: string; editing: string | null }) {
  const events = (await listEvents(weddingId)).map(eventValues);
  const target = editing === "new" ? null : events.find((e) => e.id === editing);
  const showForm = editing === "new" || Boolean(target) || events.length === 0;
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_1fr]">
      <div className="space-y-5">
        <p className="text-muted-foreground">
          Add each celebration separately: a traditional ceremony, a church or civil ceremony, the reception… each with its own date, venue and RSVP.
        </p>
        <EventList events={events} primaryEventId={primaryEventId} editHrefPrefix="/onboarding?step=3&event=" />
        {!showForm && (
          <Link href="/onboarding?step=3&event=new" className="inline-flex h-10 items-center rounded-full border border-dashed border-navy/40 px-5 text-sm text-navy hover:bg-white">
            + Add another event
          </Link>
        )}
      </div>
      <div>
        {showForm ? (
          <div className="rounded-2xl border border-border bg-white/60 p-5 sm:p-7">
            <h2 className="mb-6 text-2xl text-navy">{target ? `Edit ${target.name}` : events.length ? "Add an event" : "Add your first event"}</h2>
            <EventForm key={target?.id ?? "new"} event={target ?? undefined} zones={timeZones()} defaultTimezone={timezone} returnTo="/onboarding?step=3" cancelHref="/onboarding?step=3" />
          </div>
        ) : (
          <div className="flex h-full items-end justify-end">
            <ContinueButton step={4} />
          </div>
        )}
        {showForm && events.length > 0 && (
          <div className="mt-6 flex justify-end"><ContinueButton step={4} label="Skip, continue to photos" /></div>
        )}
      </div>
    </div>
  );
}

async function PhotosStep({ weddingId, heroId }: { weddingId: string; heroId: string | null }) {
  const photos = (await listMedia(weddingId)).map(photoItem);
  return (
    <div className="space-y-10">
      <p className="max-w-2xl text-muted-foreground">
        Photos make your page feel like you. Add a main photo now, and a few favourites for your gallery. You can always add more later, including your wedding photos afterwards.
      </p>
      <PhotoManager photos={photos} heroId={heroId} sections={["portrait", "engagement", "gallery"]} />
      <div className="flex justify-end border-t border-border pt-6">
        <ContinueButton step={5} label={photos.length ? "Continue" : "Skip for now"} />
      </div>
    </div>
  );
}

async function PublishStep({ weddingId }: { weddingId: string }) {
  const wedding = await getWedding(weddingId);
  if (!wedding) redirect("/onboarding");
  const [problems, events] = await Promise.all([publishProblems(weddingId), listEvents(weddingId)]);
  const url = appUrl(`/w/${wedding.slug}`);
  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <section className="space-y-6 rounded-2xl border border-border bg-white p-6 sm:p-8">
        <h2 className="text-2xl text-navy">Your page</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
          <dt className="text-muted-foreground">Couple</dt>
          <dd className="font-medium">{wedding.partnerOneDisplayName} &amp; {wedding.partnerTwoDisplayName}</dd>
          <dt className="text-muted-foreground">Events</dt>
          <dd>{events.length ? events.map((e) => e.name).join(", ") : "None yet"}</dd>
          <dt className="text-muted-foreground">Design</dt>
          <dd>{THEMES.find((t) => t.id === wedding.themeId)?.name}</dd>
        </dl>
        <PublishControls status={wedding.status} url={url} problems={problems} />
      </section>
      <section className="space-y-4">
        <h2 className="text-2xl text-navy">Address & privacy</h2>
        <PublishSettingsForm slug={wedding.slug} visibility={wedding.visibility} allowIndexing={wedding.allowIndexing} origin={appUrl()} />
      </section>
    </div>
  );
}
