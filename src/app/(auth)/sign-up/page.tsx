import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SignUpForm } from "@/components/auth/auth-forms";
import { isGoogleEnabled } from "@/lib/auth";
import { emailVerificationRequired } from "@/lib/env";
import { AuthHeading } from "../auth-heading";

export const metadata: Metadata = { title: "Create your account" };

export default function SignUpPage() {
  return (
    <>
      <AuthHeading
        title="Let's begin your story"
        subtitle={<>Already have an account? <Link href="/sign-in" className="text-navy underline underline-offset-4">Sign in</Link></>}
      />
      <Suspense>
        <SignUpForm googleEnabled={isGoogleEnabled} verifyEmail={emailVerificationRequired} />
      </Suspense>
    </>
  );
}
