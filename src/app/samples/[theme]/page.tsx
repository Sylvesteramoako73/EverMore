import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { CelebrationSite } from "@/components/site/celebration-site";
import { currentTime } from "@/lib/clock";
import { OCCASION_KINDS } from "@/lib/occasions";
import { SAMPLE_THEMES, sampleCelebration } from "@/lib/samples";
import { getTheme, THEMES } from "@/lib/themes";

export function generateStaticParams() {
  return THEMES.map((t) => ({ theme: t.id }));
}

export async function generateMetadata({ params }: PageProps<"/samples/[theme]">): Promise<Metadata> {
  const { theme } = await params;
  const t = THEMES.find((x) => x.id === theme);
  return t ? { title: `${t.name} sample`, description: t.tagline } : { title: "Sample" };
}

export default function SamplePage(props: PageProps<"/samples/[theme]">) {
  return (
    <Suspense>
      <Sample {...props} />
    </Suspense>
  );
}

async function Sample({ params, searchParams }: PageProps<"/samples/[theme]">) {
  await connection();
  const { theme } = await params;
  if (!THEMES.some((t) => t.id === theme)) notFound();
  const sp = await searchParams;
  // ?occasion=birthday shows another occasion in this theme; ?after=1 shows the page after the day.
  const requested = typeof sp.occasion === "string" ? sp.occasion : null;
  const occasion = OCCASION_KINDS.find((k) => k === requested) ?? SAMPLE_THEMES.find((t) => t.id === theme)!.occasion;
  const after = sp.after === "1";
  const now = currentTime();
  return <CelebrationSite w={sampleCelebration(getTheme(theme).id, { occasion, daysAhead: after ? -400 : 96, now })} now={now} />;
}
