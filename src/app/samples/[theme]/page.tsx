import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { WeddingSite } from "@/components/wedding/wedding-site";
import { currentTime } from "@/lib/clock";
import { sampleWedding } from "@/lib/samples";
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
  // ?after=1 shows the same sample after the wedding: thank-you note and marriage counter.
  const married = (await searchParams).after === "1";
  const now = currentTime();
  return <WeddingSite w={sampleWedding(getTheme(theme).id, { daysAhead: married ? -400 : 96, now })} now={now} />;
}
