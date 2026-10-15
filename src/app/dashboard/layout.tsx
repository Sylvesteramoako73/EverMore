import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { Suspense } from "react";
import { Logo } from "@/components/brand";
import { DashboardNav, SignOutButton } from "@/components/dashboard/nav";
import { loadDashboard, waitingCounts } from "./data";

export const metadata: Metadata = { title: { default: "Dashboard", template: "%s · EverMore dashboard" }, robots: { index: false } };

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <div className="min-h-svh bg-[#f6f3ec]">
      <header className="sticky top-0 z-30 border-b border-border bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Logo href="/dashboard" />
          <div className="flex min-w-0 items-center gap-5">
            <Suspense>
              <PageLink />
            </Suspense>
            <SignOutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl gap-8 pt-4 lg:grid lg:grid-cols-[210px_minmax(0,1fr)] lg:px-6 lg:pt-8">
        <aside className="border-b border-border lg:sticky lg:top-24 lg:self-start lg:border-0">
          <Suspense fallback={<DashboardNav />}>
            <NavWithBadges />
          </Suspense>
        </aside>
        <main id="main" className="min-w-0 px-4 py-8 sm:px-6 lg:px-0 lg:py-0 lg:pb-16">
          {children}
        </main>
      </div>
    </div>
  );
}

async function NavWithBadges() {
  const { celebration } = await loadDashboard();
  const waiting = await waitingCounts(celebration.id);
  return <DashboardNav badges={{ "/dashboard/messages": waiting.messages, "/dashboard/photos": waiting.photos }} />;
}

async function PageLink() {
  const { celebration } = await loadDashboard();
  const live = celebration.status === "published";
  return (
    <a
      href={`/${celebration.slug}`}
      target="_blank"
      rel="noopener"
      className="hidden min-w-0 items-center gap-2 rounded-full border border-border bg-white px-3 py-1.5 text-sm text-navy hover:border-navy sm:inline-flex"
    >
      <span className={`h-2 w-2 shrink-0 rounded-full ${live ? "bg-success" : "bg-amber-500"}`} aria-hidden />
      <span className="truncate">{celebration.title}</span>
      <span className="sr-only">({live ? "live" : "draft"}, opens in a new tab)</span>
      <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
    </a>
  );
}
