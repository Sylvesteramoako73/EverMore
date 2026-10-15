import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { acceptInvitation } from "@/app/actions/dashboard";
import { Logo } from "@/components/brand";
import { SubmitButton } from "@/components/forms";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/dal";
import { findInvite } from "@/server/members";

export const metadata: Metadata = { title: "Join a celebration", robots: { index: false } };

export default function JoinPage(props: PageProps<"/join/[token]">) {
  return (
    <div className="grid min-h-svh place-items-center bg-[#f6f3ec] px-4 py-12">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-border sm:p-10">
        <Logo className="justify-center" />
        <Suspense fallback={<p className="mt-8 text-muted-foreground">Checking your invitation…</p>}>
          <Join {...props} />
        </Suspense>
      </div>
    </div>
  );
}

async function Join({ params }: PageProps<"/join/[token]">) {
  const { token } = await params;
  const [invite, user] = await Promise.all([findInvite(token), getCurrentUser()]);

  if (!invite || invite.expired || invite.accepted) {
    return (
      <div className="mt-8 space-y-3">
        <h1 className="text-3xl text-navy">This invitation can&apos;t be used</h1>
        <p className="text-muted-foreground">
          {invite?.accepted ? "It has already been accepted." : invite?.expired ? "It has expired." : "The link isn't valid."} Ask whoever invited you to send a new one.
        </p>
        <Button asChild variant="outline" className="mt-4"><Link href="/dashboard">Go to my dashboard</Link></Button>
      </div>
    );
  }

  const role = invite.invite.role === "planner" ? "a planner" : "a co-host";
  const here = `/join/${token}`;
  return (
    <div className="mt-8 space-y-4">
      <p className="eyebrow">You&apos;re invited</p>
      <h1 className="text-3xl text-navy">Help manage {invite.title}</h1>
      <p className="text-muted-foreground">
        {invite.inviter ?? "The host"} has invited you to join as {role}. You&apos;ll be able to manage guests, see RSVPs and look after messages and photos.
      </p>
      {user ? (
        <form action={acceptInvitation.bind(null, token)} className="pt-2">
          <SubmitButton pending="Joining…">Accept as {user.name}</SubmitButton>
          <p className="mt-3 text-xs text-muted-foreground">Signed in as {user.email}.</p>
        </form>
      ) : (
        <div className="flex flex-col gap-2 pt-2">
          <Button asChild><Link href={`/sign-up?next=${encodeURIComponent(here)}`}>Create an account to accept</Link></Button>
          <Button asChild variant="outline"><Link href={`/sign-in?next=${encodeURIComponent(here)}`}>I already have an account</Link></Button>
        </div>
      )}
    </div>
  );
}
