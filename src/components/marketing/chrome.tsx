import Link from "next/link";
import { Logo } from "@/components/brand";
import { SiteHeader } from "@/components/marketing/site-header";
import { appHref } from "@/lib/hosts";

export function MarketingHeader() {
  return <SiteHeader signInHref={appHref("/sign-in")} signUpHref={appHref("/sign-up")} />;
}

export function MarketingFooter() {
  return (
    <footer className="bg-navy text-ivory/80">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="space-y-4">
          <Logo inverted />
          <p className="max-w-xs text-sm leading-relaxed">Your Story. Forever Connected. Pages for life&apos;s moments that welcome your guests and keep your memories.</p>
        </div>
        <FooterCol title="Product" links={[["/#how-it-works", "How it works"], ["/#designs", "Designs"], ["/#pricing", "Pricing"], ["/samples/timeless-elegance", "See a sample"]]} />
        <FooterCol title="Hosts" links={[[appHref("/sign-up"), "Create your page"], [appHref("/sign-in"), "Sign in"], ["/#faq", "FAQ"]]} />
        <FooterCol title="Trust" links={[["/policies#privacy", "Privacy"], ["/policies#retention", "Data retention"], ["/policies#terms", "Terms"], ["/policies#credits", "Photo credits"]]} />
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-4 py-6 text-xs text-ivory/60 sm:px-6">© EverMore. Made for the moments that matter.</p>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-[0.2em] text-champagne uppercase">{title}</p>
      <ul className="mt-4 space-y-2.5 text-sm">
        {links.map(([href, label]) => (
          <li key={href}><Link href={href} className="hover:text-ivory">{label}</Link></li>
        ))}
      </ul>
    </div>
  );
}
