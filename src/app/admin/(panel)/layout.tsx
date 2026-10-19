import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand";
import { AdminNav } from "@/components/admin/nav";
import { SignOutButton } from "@/components/dashboard/nav";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · EverMore admin" }, robots: { index: false } };

/** The owner's area. Every page below checks requireAdmin() itself; this layout is only the frame. */
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="min-h-svh bg-[#f6f3ec]">
      <header className="sticky top-0 z-30 border-b border-border bg-navy text-ivory">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Logo href="/admin" inverted />
            <span className="rounded-full bg-champagne px-2 py-0.5 text-[0.65rem] font-semibold tracking-[0.2em] text-navy uppercase">Admin</span>
          </div>
          <div className="flex items-center gap-5 text-sm">
            <Link href="/dashboard" className="text-ivory/80 hover:text-ivory">My dashboard</Link>
            <span className="[&_button]:text-ivory/80 [&_button:hover]:text-ivory"><SignOutButton /></span>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl gap-8 pt-4 lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:px-6 lg:pt-8">
        <aside className="border-b border-border lg:sticky lg:top-24 lg:self-start lg:border-0">
          <AdminNav />
        </aside>
        <main id="main" className="min-w-0 px-4 py-8 sm:px-6 lg:px-0 lg:py-0 lg:pb-16">{children}</main>
      </div>
    </div>
  );
}
