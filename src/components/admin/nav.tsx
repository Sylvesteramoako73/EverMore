"use client";

import { Activity, Flag, Globe, LayoutDashboard, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/pages", label: "Pages", icon: Globe },
  { href: "/admin/reports", label: "Reports", icon: Flag },
  { href: "/admin/activity", label: "Activity", icon: Activity },
] as const;

export function AdminNav() {
  const path = usePathname();
  const active = (href: string) => (href === "/admin" ? path === href : path.startsWith(href));
  return (
    <nav aria-label="Admin">
      <ul className="flex gap-1 overflow-x-auto px-4 pb-2 [scrollbar-width:none] lg:flex-col lg:px-0 lg:pb-0">
        {NAV.map(({ href, label, icon: Icon }) => (
          <li key={href} className="shrink-0">
            <Link
              href={href}
              aria-current={active(href) ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm whitespace-nowrap",
                active(href) ? "bg-navy text-ivory" : "text-navy/80 hover:bg-navy/5 hover:text-navy",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden /> {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** A search box that submits as ?q= (works without JavaScript). */
export function SearchBox({ placeholder, defaultValue }: { placeholder: string; defaultValue: string }) {
  return (
    <form role="search" className="flex gap-2">
      <label className="flex-1">
        <span className="sr-only">{placeholder}</span>
        <input name="q" defaultValue={defaultValue} placeholder={placeholder} className="h-11 w-full rounded-lg border border-input bg-white px-3.5 text-sm" />
      </label>
      <button type="submit" className="h-11 rounded-lg bg-navy px-5 text-sm text-ivory">Search</button>
    </form>
  );
}
