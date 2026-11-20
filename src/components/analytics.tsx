import Script from "next/script";

// Google Analytics 4 for the EverMore website (public pages and the signed in app). The ID is public.
const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? "G-04EGB4QBN4";

export function Analytics() {
  if (process.env.NODE_ENV !== "production") return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="ga-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`}
      </Script>
    </>
  );
}
