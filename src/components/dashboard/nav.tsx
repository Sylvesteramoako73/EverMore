"use client";

import { Camera, Gift, Home, LogOut, MailCheck, MessageSquareHeart, PenLine, ScanLine, Settings, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { switchCelebration } from "@/app/actions/dashboard";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export const DASHBOARD_NAV = [
  { href: "/dashboard", label: "Overview", icon: Home },
  { href: "/dashboard/guests", label: "Guests", icon: Users },
  { href: "/dashboard/rsvps", label: "RSVPs", icon: MailCheck },
  { href: "/dashboard/messages", label: "Messages", icon: MessageSquareHeart },
  { href: "/dashboard/photos", label: "Photos", icon: Camera },
  { href: "/dashboard/gifts", label: "Gifts", icon: Gift },
  { href: "/dashboard/checkin", label: "Check-in", icon: ScanLine },
  { href: "/dashboard/edit", label: "Edit page", icon: PenLine },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
] as const;

/** Sidebar on large screens, a horizontally scrolling tab bar on phones. */
export function DashboardNav({ badges = {} }: { badges?: Partial<Record<string, number>> }) {
  const path = usePathname();
  const active = (href: string) => (href === "/dashboard" ? path === href : path.startsWith(href));
  return (
    <nav aria-label="Dashboard">
      <ul className="flex gap-1 overflow-x-auto px-4 pb-2 [scrollbar-width:none] lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
        {DASHBOARD_NAV.map(({ href, label, icon: Icon }) => {
          const n = badges[href];
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                aria-current={active(href) ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm whitespace-nowrap transition-colors",
                  active(href) ? "bg-navy text-ivory" : "text-navy/80 hover:bg-navy/5 hover:text-navy",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                <span className="flex-1">{label}</span>
                {n ? (
                  <span className={cn("rounded-full px-1.5 text-[0.7rem] font-semibold", active(href) ? "bg-champagne text-navy" : "bg-champagne/20 text-champagne-deep")}>
                    {n}
                    <span className="sr-only"> waiting</span>
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function SignOutButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await authClient.signOut();
          router.push("/");
          router.refresh();
        })
      }
      className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-navy disabled:opacity-50"
    >
      <LogOut className="h-4 w-4" aria-hidden /> {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}

/** For people who manage more than one celebration (e.g. planners). */
export function CelebrationSwitcher({ current, options }: { current: string; options: { id: string; title: string; live: boolean }[] }) {
  const [pending, start] = useTransition();
  return (
    <label className="flex min-w-0 items-center gap-2 text-sm">
      <span className="sr-only">Celebration</span>
      <select
        value={current}
        disabled={pending}
        onChange={(e) => {
          const id = e.target.value;
          start(async () => { await switchCelebration(id); });
        }}
        className="h-9 max-w-[16rem] truncate rounded-full border border-border bg-white px-3 text-navy"
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.title}{o.live ? "" : " (draft)"}</option>
        ))}
      </select>
    </label>
  );
}
