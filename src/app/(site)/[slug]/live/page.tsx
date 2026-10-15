import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Slideshow, type Slide } from "@/components/site/slideshow";
import { loadPublicCelebration } from "@/server/public-celebration";
import { memberCheck } from "@/server/viewer";

export const metadata: Metadata = { title: "Live slideshow", robots: { index: false } };

/** Full-screen slideshow of guests' photos and messages, for a projector or TV at the venue. */
export default function LivePage(props: PageProps<"/[slug]/live">) {
  return (
    <Suspense fallback={<div className="min-h-svh bg-black" />}>
      <Live {...props} />
    </Suspense>
  );
}

async function Live({ params, searchParams }: PageProps<"/[slug]/live">) {
  await connection();
  const { slug } = await params;
  const sp = await searchParams;
  const result = await loadPublicCelebration(slug, {
    inviteToken: typeof sp.invite === "string" ? sp.invite : null,
    isMember: memberCheck(),
    sharedLimit: 60,
  });
  if (result.kind !== "ok") notFound();
  const w = result.view;

  const photos: Slide[] = [...w.shared.items.filter((i) => i.kind === "photo"), ...(w.shared.items.length < 6 ? w.gallery : [])].map((p) => ({
    kind: "photo",
    id: p.id,
    src: p.src,
    caption: "guestName" in p && typeof p.guestName === "string" && p.guestName ? `Shared by ${p.guestName}` : p.caption,
  }));
  const messages: Slide[] = w.guestbook.entries.slice(0, 30).map((e) => ({ kind: "message", id: e.id, text: e.message, name: e.name }));
  // Interleave: two photos, then a message.
  const slides: Slide[] = [];
  let m = 0;
  photos.forEach((p, i) => {
    slides.push(p);
    if (i % 2 === 1 && m < messages.length) slides.push(messages[m++]);
  });
  slides.push(...messages.slice(m));

  return <Slideshow title={w.title} url={w.shareUrl} slides={slides} />;
}
