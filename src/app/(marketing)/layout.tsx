import Script from "next/script";
import { WhatsAppButton } from "@/components/marketing/whatsapp-button";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/chrome";

export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <MarketingHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <MarketingFooter />
      <WhatsAppButton number="233557001326" />
      <Script
        src="https://chatbot-m8tu.onrender.com/widget/widget.js"
        data-api-url="https://chatbot-m8tu.onrender.com/api/chat"
        data-site-key="sk_live_3e1d654e6904f03b47df49bf2894f11e"
        strategy="lazyOnload"
      />
    </>
  );
}
