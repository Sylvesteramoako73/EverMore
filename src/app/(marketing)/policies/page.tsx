import type { Metadata } from "next";
import { PHOTO_CREDITS } from "@/lib/samples";

export const metadata: Metadata = { title: "Privacy, retention & terms" };

// Plain-language summary. Have a lawyer review before launch; this is a product draft, not legal advice.
export default function PoliciesPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <p className="eyebrow">Trust</p>
      <h1 className="mt-4 text-5xl text-navy">Privacy, retention &amp; terms</h1>
      <p className="mt-4 rounded-lg bg-blush px-4 py-3 text-sm text-navy">
        Draft summary for early access. It describes how the product works today and will be replaced by reviewed legal terms before general launch.
      </p>

      <section id="privacy" className="mt-12 scroll-mt-24 space-y-4 leading-relaxed text-navy/90">
        <h2 className="text-3xl text-navy">Privacy</h2>
        <p>Your guest list, guests&apos; contact details, RSVPs, photographs and private memories are personal data. Only members of your wedding (you, your partner and anyone you invite) can see them in the dashboard.</p>
        <p>Guests see only what you publish. Their email addresses and replies are visible to you, not to other guests. Photos you mark private, and all photos on private pages, are only served through short-lived signed links.</p>
        <p>We count page views as a simple daily number. We don&apos;t track individual visitors or sell data.</p>
      </section>

      <section id="retention" className="mt-12 scroll-mt-24 space-y-4 leading-relaxed text-navy/90">
        <h2 className="text-3xl text-navy">Retention</h2>
        <p>Your wedding page and memories stay online while your account is active and in good standing. We don&apos;t delete your page when the wedding date passes.</p>
        <p>If paid plans are introduced, we will explain what happens to pages on each plan before any change applies, and give you time to export your data.</p>
        <p>You can export your guest list and RSVPs as a spreadsheet at any time, and delete your wedding or your whole account from your settings. Deletion removes your photos and data from our systems; backups age out within 30 days.</p>
      </section>

      <section id="terms" className="mt-12 scroll-mt-24 space-y-4 leading-relaxed text-navy/90">
        <h2 className="text-3xl text-navy">Terms (summary)</h2>
        <p>Only upload photographs and content you have the right to share. Don&apos;t use EverMore to harass, deceive or impersonate others. We may remove content that breaks these rules, and we keep a record of such actions.</p>
      </section>
      <section id="credits" className="mt-12 scroll-mt-24 space-y-4 leading-relaxed text-navy/90">
        <h2 className="text-3xl text-navy">Photo credits</h2>
        <p>Sample pages and this website use photographs from <a className="underline" href="https://unsplash.com" rel="noopener noreferrer">Unsplash</a>, used under the Unsplash licence. Names and events on sample pages are fictional. Thank you to:</p>
        <p className="text-sm text-muted-foreground">{[...new Set(PHOTO_CREDITS.map((c) => c.by))].join(", ")}.</p>
      </section>
    </article>
  );
}
