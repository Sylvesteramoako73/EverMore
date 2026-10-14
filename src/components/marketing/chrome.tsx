import Link from "next/link";
import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/#occasions", label: "Occasions" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#designs", label: "Designs" },
  { href: "/#after", label: "After the day" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
];

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-navy/5 bg-ivory/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-7 text-sm text-navy/80">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="transition-colors hover:text-navy">{n.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/sign-up">Create your page</Link>
          </Button>
        </div>
      </div>
    </header>
  );
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
        <FooterCol title="Hosts" links={[["/sign-up", "Create your page"], ["/sign-in", "Sign in"], ["/#faq", "FAQ"]]} />
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
