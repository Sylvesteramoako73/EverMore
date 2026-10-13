import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/auth-forms";
import { AuthHeading } from "../auth-heading";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <AuthHeading title="Reset your password" subtitle="Enter your email and we'll send you a link to choose a new password." />
      <ForgotPasswordForm />
    </>
  );
}
