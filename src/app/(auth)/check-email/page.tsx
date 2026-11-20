import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckEmail } from "@/components/auth/auth-forms";
import { TrackEvent } from "@/components/track";
import { DevOutbox } from "@/components/auth/dev-outbox";
import { AuthHeading } from "../auth-heading";

export const metadata: Metadata = { title: "Check your email" };

export default function CheckEmailPage() {
  return (
    <>
      <AuthHeading title="Check your inbox" />
      <TrackEvent name="sign_up" />
      <Suspense>
        <CheckEmail />
      </Suspense>
      <Suspense>
        <DevOutbox />
      </Suspense>
    </>
  );
}
