import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckEmail } from "@/components/auth/auth-forms";
import { DevOutbox } from "@/components/auth/dev-outbox";
import { AuthHeading } from "../auth-heading";

export const metadata: Metadata = { title: "Check your email" };

export default function CheckEmailPage() {
  return (
    <>
      <AuthHeading title="Check your inbox" />
      <Suspense>
        <CheckEmail />
      </Suspense>
      <Suspense>
        <DevOutbox />
      </Suspense>
    </>
  );
}
