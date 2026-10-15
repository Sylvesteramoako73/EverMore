import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Logo } from "@/components/brand";
import { EventForm, EventList } from "@/components/couple/event-forms";
import { PhotoManager } from "@/components/couple/photo-manager";
import { PublishControls, PublishSettingsForm } from "@/components/couple/publish-panel";
import { ThemePicker } from "@/components/couple/theme-picker";
import { ColoursEditor } from "@/components/couple/detail-forms";
import { BasicsStep, ContinueButton, DetailsStep } from "@/components/couple/wizard-steps";
import { Skeleton } from "@/components/ui/skeleton";
import { pickCurrentCelebration, requireUser } from "@/lib/dal";
import { appUrl } from "@/lib/env";
import { entitlements } from "@/lib/plans";
import { getOccasion, type OccasionKind } from "@/lib/occasions";
import { THEMES, themesFor } from "@/lib/themes";
import { timeZones } from "@/lib/timezones";
import { listEvents } from "@/server/events";
import { listMedia } from "@/server/media";
import { eventValues, photoItem } from "@/server/views";
import { getCelebration, publishProblems } from "@/server/celebrations";

export const metadata: Metadata = { title: "Create your celebration website", robots: { index: false } };

const STEPS = [
  { n: 1, title: "What are you celebrating?", short: "Occasion" },
  { n: 2, title: "The details", short: "Details" },
  { n: 3, title: "Programme & venues", short: "Programme" },
  { n: 4, title: "Photographs", short: "Photos" },
  { n: 5, title: "Design & colours", short: "Design" },
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
  const mine = await pickCurrentCelebration(user.id);
  const celebration = mine ? await getCelebration(mine.id) : null;

  // You can revisit any step you've reached, but not skip ahead of it.
  const reached = celebration ? Math.max(celebration.onboardingStep, 1) + 1 : 1;
  const requested = Number(sp.step ?? (celebration ? Math.min(reached, 6) : 1));
  const step = Number.isInteger(requested) ? Math.min(Math.max(requested, 1), Math.min(reached, 6)) : 1;
  const current = STEPS[step - 1];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <nav aria-label="Setup progress" className="mb-10">
        <ol className="grid grid-cols-6 gap-1.5 sm:gap-2">
          {STEPS.map((s) => {
            const done = s.n < step;
            const active = s.n === step;
            const reachable = s.n <= reached && celebration;
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
          <BasicsStep
            values={celebration ? { kind: celebration.kind, title: celebration.title, honorees: celebration.honorees, monogram: celebration.monogram } : undefined}
          />
        </div>
      )}

      {celebration && step === 2 && (
        <div className="max-w-3xl">
          <DetailsStep
            kind={celebration.kind}
            zones={timeZones()}
            values={{
              story: celebration.story,
              guestMessage: celebration.guestMessage,
              details: celebration.details,
              keyDate: celebration.keyDate,
              timezone: celebration.timezone,
              subtype: celebration.subtype,
              rsvpDeadline: celebration.rsvpDeadline,
              dressCode: celebration.dressCode,
              announcement: celebration.announcement,
              hashtag: celebration.hashtag,
              contactName: celebration.contactName,
              contactEmail: celebration.contactEmail,
              contactPhone: celebration.contactPhone,
            }}
          />
        </div>
      )}

      {celebration && step === 3 && <EventsStep celebrationId={celebration.id} primaryEventId={celebration.primaryEventId} timezone={celebration.timezone} editing={typeof sp.event === "string" ? sp.event : null} kind={celebration.kind} />}

      {celebration && step === 4 && <PhotosStep celebrationId={celebration.id} heroId={celebration.heroMediaId} />}

      {celebration && step === 5 && (
        <div className="space-y-10">
          <p className="max-w-2xl text-muted-foreground">Every design is complete and works beautifully on phones. Those that suit your occasion best come first. You can change it any time.</p>
          <ThemePicker
            themes={themesFor(celebration.kind, getOccasion(celebration.kind).recommendedThemes)}
            current={celebration.themeId}
            slug={celebration.slug}
            premiumAllowed={entitlements(celebration.plan).premiumThemes}
          />
          <section className="max-w-3xl space-y-4 border-t border-border pt-10">
            <div>
              <h2 className="text-2xl text-navy">Colours of the day</h2>
              <p className="mt-1 text-sm text-muted-foreground">Optional. Shown as swatches so guests can dress to match.</p>
            </div>
            <ColoursEditor colours={celebration.colours} />
          </section>
          <div className="flex justify-end border-t border-border pt-6"><ContinueButton step={6} label="Continue to review" /></div>
        </div>
      )}

      {celebration && step === 6 && <PublishStep celebrationId={celebration.id} />}
    </div>
  );
}

async function EventsStep({ celebrationId, primaryEventId, timezone, editing, kind }: { celebrationId: string; primaryEventId: string | null; timezone: string; editing: string | null; kind: OccasionKind }) {
  const events = (await listEvents(celebrationId)).map(eventValues);
  const target = editing === "new" ? null : events.find((e) => e.id === editing);
  const showForm = editing === "new" || Boolean(target) || events.length === 0;
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_1fr]">
      <div className="space-y-5">
        <p className="text-muted-foreground">
          Add each part of the occasion separately, each with its own time, venue and RSVP. Together they make your programme.
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
            <EventForm key={target?.id ?? "new"} event={target ?? undefined} zones={timeZones()} defaultTimezone={timezone} returnTo="/onboarding?step=3" cancelHref="/onboarding?step=3" suggestions={getOccasion(kind).eventSuggestions} />
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

async function PhotosStep({ celebrationId, heroId }: { celebrationId: string; heroId: string | null }) {
  const photos = (await listMedia(celebrationId)).map(photoItem);
  return (
    <div className="space-y-10">
      <p className="max-w-2xl text-muted-foreground">
        Photos make your page feel like you. Add a main photo now, and a few favourites for your gallery. You can always add more later, including your celebration photos afterwards.
      </p>
      <PhotoManager photos={photos} heroId={heroId} sections={["portrait", "engagement", "gallery"]} />
      <div className="flex justify-end border-t border-border pt-6">
        <ContinueButton step={5} label={photos.length ? "Continue" : "Skip for now"} />
      </div>
    </div>
  );
}

async function PublishStep({ celebrationId }: { celebrationId: string }) {
  const celebration = await getCelebration(celebrationId);
  if (!celebration) redirect("/onboarding");
  const [problems, events] = await Promise.all([publishProblems(celebrationId), listEvents(celebrationId)]);
  const url = appUrl(`/${celebration.slug}`);
  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <section className="space-y-6 rounded-2xl border border-border bg-white p-6 sm:p-8">
        <h2 className="text-2xl text-navy">Your page</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
          <dt className="text-muted-foreground">{getOccasion(celebration.kind).label}</dt>
          <dd className="font-medium">{celebration.title}</dd>
          <dt className="text-muted-foreground">Events</dt>
          <dd>{events.length ? events.map((e) => e.name).join(", ") : "None yet"}</dd>
          <dt className="text-muted-foreground">Design</dt>
          <dd>{THEMES.find((t) => t.id === celebration.themeId)?.name}</dd>
        </dl>
        <PublishControls status={celebration.status} url={url} problems={problems} />
      </section>
      <section className="space-y-4">
        <h2 className="text-2xl text-navy">Address & privacy</h2>
        <PublishSettingsForm slug={celebration.slug} visibility={celebration.visibility} allowIndexing={celebration.allowIndexing} origin={appUrl()} />
      </section>
    </div>
  );
}
