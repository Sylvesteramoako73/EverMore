import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/auth-forms";
import { AuthHeading } from "../auth-heading";

export const metadata: Metadata = { title: "Choose a new password" };

export default function ResetPasswordPage() {
  return (
    <>
      <AuthHeading title="Choose a new password" />
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </>
  );
}
