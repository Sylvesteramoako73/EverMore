import type { Metadata } from "next";
import { ArrowRight, CalendarDays, Eye, Image as ImageIcon, Palette, PenLine, Sparkles } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/dashboard/skeleton";
import { getOccasion } from "@/lib/occasions";
import { getTheme } from "@/lib/themes";
import { loadDashboard } from "../data";

export const metadata: Metadata = { title: "Edit page" };

export default function EditPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Edit />
    </Suspense>
  );
}

async function Edit() {
  const { celebration: c } = await loadDashboard();
  const occasion = getOccasion(c.kind);
  const cards = [
    { step: 1, icon: Sparkles, title: "Occasion & names", text: `${occasion.label} · ${c.title}` },
    { step: 2, icon: PenLine, title: "The details", text: "Date, story, message to guests, dress code and RSVP contacts." },
    { step: 3, icon: CalendarDays, title: "Programme & venues", text: "Events, times, venues, maps and venue photos." },
    { step: 4, icon: ImageIcon, title: "Photographs", text: "Your main photo and gallery." },
    { step: 5, icon: Palette, title: "Design & colours", text: `${getTheme(c.themeId).name}, plus your colours of the day.` },
  ];
  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl text-navy">Edit your page</h1>
          <p className="mt-1 text-muted-foreground">Changes appear on your page as soon as you save. Printed QR codes keep working.</p>
        </div>
        <a href={`/${c.slug}`} target="_blank" rel="noopener" className="inline-flex items-center gap-2 text-sm font-medium text-champagne-deep hover:underline">
          <Eye className="h-4 w-4" aria-hidden /> Preview your page
        </a>
      </header>
      <ul className="grid gap-4 md:grid-cols-2">
        {cards.map(({ step, icon: Icon, title, text }) => (
          <li key={step}>
            <Link href={`/onboarding?step=${step}`} className="group flex h-full items-start gap-4 rounded-2xl bg-white p-6 ring-1 ring-border transition-shadow hover:shadow-md">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-blush text-navy"><Icon className="h-5 w-5" aria-hidden /></span>
              <span className="flex-1">
                <span className="block text-xl text-navy">{title}</span>
                <span className="mt-1 block text-sm text-muted-foreground">{text}</span>
              </span>
              <ArrowRight className="mt-1 h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
