import Link from "next/link";
import { Logo } from "@/components/brand";

/** Shown when a signed-in person opens a page they aren't allowed to see (e.g. the admin area). */
export default function Forbidden() {
  return (
    <main id="main" className="grid min-h-svh place-items-center bg-ivory px-6 text-center">
      <div className="max-w-md">
        <Logo className="justify-center" />
        <h1 className="mt-10 text-4xl text-navy">This area is private</h1>
        <p className="mt-3 text-muted-foreground">You don&apos;t have access to this page. If you think you should, contact the EverMore team.</p>
        <Link href="/dashboard" className="mt-8 inline-block rounded-full bg-navy px-6 py-3 text-sm text-ivory">Go to my dashboard</Link>
      </div>
    </main>
  );
}
