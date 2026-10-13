import { Logo } from "@/components/brand";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-svh lg:grid-cols-[1fr_1.1fr]">
      <aside className="relative hidden overflow-hidden bg-navy p-12 text-ivory lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden className="absolute -right-24 -bottom-24 h-96 w-96 rounded-full border border-champagne/30" />
        <div aria-hidden className="absolute -right-4 -bottom-40 h-96 w-96 rounded-full border border-champagne/20" />
        <Logo inverted />
        <blockquote className="relative max-w-md">
          <p className="font-display text-4xl leading-tight">&ldquo;Every love story is beautiful, but yours deserves a home.&rdquo;</p>
          <footer className="mt-6 text-sm tracking-[0.2em] text-champagne uppercase">Your Story. Forever Connected.</footer>
        </blockquote>
      </aside>
      <main id="main" className="flex flex-col px-5 py-8 sm:px-10">
        <div className="lg:hidden">
          <Logo />
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">{children}</div>
      </main>
    </div>
  );
}
