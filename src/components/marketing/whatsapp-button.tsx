import { MessageCircle } from "lucide-react";

/** Floating chat button, bottom right on every marketing page. */
export function WhatsAppButton({ number }: { number: string }) {
  const text = encodeURIComponent("Hello EverMore, I have a question about creating a page.");
  return (
    <a
      href={`https://wa.me/${number}?text=${text}`}
      target="_blank"
      rel="noopener"
      className="fixed right-4 bottom-4 z-30 grid h-14 w-14 place-items-center rounded-full bg-navy text-ivory shadow-xl ring-1 ring-white/20 transition hover:scale-105 hover:bg-navy-soft focus-visible:ring-2 focus-visible:ring-champagne focus-visible:outline-none sm:right-6 sm:bottom-6"
    >
      <MessageCircle className="h-6 w-6" aria-hidden />
      <span className="sr-only">Chat with us on WhatsApp (opens in a new tab)</span>
    </a>
  );
}
