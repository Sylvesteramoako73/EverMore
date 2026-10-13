import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SignInForm } from "@/components/auth/auth-forms";
import { isGoogleEnabled } from "@/lib/auth";
import { AuthHeading } from "../auth-heading";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <>
      <AuthHeading
        title="Welcome back"
        subtitle={<>New to EverMore? <Link href="/sign-up" className="text-navy underline underline-offset-4">Create an account</Link></>}
      />
      <Suspense>
        <SignInForm googleEnabled={isGoogleEnabled} />
      </Suspense>
    </>
  );
}
