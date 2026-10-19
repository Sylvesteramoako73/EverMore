import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SignInForm } from "@/components/auth/auth-forms";
import { Logo } from "@/components/brand";
import { SignOutButton } from "@/components/dashboard/nav";
import { getCurrentUser } from "@/lib/dal";

export const metadata: Metadata = { title: "Admin sign in", robots: { index: false } };

/** The owner's sign-in: same accounts as everyone else, but it leads straight into the admin area. */
export default function AdminLoginPage() {
  return (
    <main id="main" className="grid min-h-svh place-items-center bg-navy px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Logo href="/" inverted />
          <span className="inline-flex items-center gap-1.5 rounded-full bg-champagne px-3 py-1 text-[0.7rem] font-semibold tracking-[0.2em] text-navy uppercase">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Admin
          </span>
        </div>
        <div className="rounded-3xl bg-ivory p-8 shadow-2xl sm:p-10">
          <Suspense fallback={<p className="text-center text-muted-foreground">Loading…</p>}>
            <AdminSignIn />
          </Suspense>
        </div>
        <p className="mt-6 text-center text-sm text-ivory/60">
          Not the owner? <Link href="/sign-in" className="text-ivory underline underline-offset-4">Sign in to your page</Link>
        </p>
      </div>
    </main>
  );
}

async function AdminSignIn() {
  const user = await getCurrentUser();
  if (user?.role === "admin") redirect("/admin");
  if (user) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="text-3xl text-navy">Not an admin account</h1>
        <p className="text-muted-foreground">
          You&apos;re signed in as <strong className="text-navy">{user.email}</strong>, which doesn&apos;t have admin access. Sign out, then sign in with the owner account.
        </p>
        <div className="flex justify-center gap-4 pt-2">
          <Link href="/dashboard" className="text-sm text-navy underline underline-offset-4">Go to my dashboard</Link>
          <SignOutButton />
        </div>
      </div>
    );
  }
  return (
    <>
      <h1 className="mb-1 text-center text-3xl text-navy">Admin sign in</h1>
      <p className="mb-8 text-center text-sm text-muted-foreground">For the EverMore owner and team.</p>
      <SignInForm googleEnabled={false} defaultNext="/admin" />
    </>
  );
}
