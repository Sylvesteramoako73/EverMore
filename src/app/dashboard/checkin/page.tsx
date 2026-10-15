import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckInDesk } from "@/components/dashboard/checkin";
import { PageSkeleton } from "@/components/dashboard/skeleton";
import { listGuests } from "@/server/guests";
import { loadDashboard } from "../data";

export const metadata: Metadata = { title: "Check-in" };

export default function CheckInPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CheckIn />
    </Suspense>
  );
}

async function CheckIn() {
  const { celebration: c } = await loadDashboard();
  const guests = await listGuests(c.id);
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-4xl text-navy">Check-in</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          For ushers at the door. Each guest&apos;s personal page shows an entry pass with a QR code. Scan it, or search by name, and record how many people arrived.
          Invite your ushers as planners from Settings so they can use this page on their phones.
        </p>
      </header>
      {guests.length ? (
        <CheckInDesk
          guests={guests.map((g) => ({ id: g.id, name: g.name, phone: g.phone, tableName: g.tableName, maxPartySize: g.maxPartySize, checkedInCount: g.checkedInCount }))}
        />
      ) : (
        <p className="rounded-2xl border border-dashed border-border bg-white p-10 text-center text-muted-foreground">Add your guest list first. Check-in works from the invitations on the Guests page.</p>
      )}
    </div>
  );
}
