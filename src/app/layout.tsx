import type { Metadata, Viewport } from "next";
import { Toaster } from "@/components/ui/sonner";
import { fontVariables } from "./fonts";
import "./globals.css";

const appUrl = process.env.APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: { default: "EverMore — Your Story. Forever Connected.", template: "%s · EverMore" },
  description:
    "Beautiful wedding websites from a simple guided form. Share invitations, collect RSVPs and keep your memories in one place, long after the wedding.",
  applicationName: "EverMore",
  openGraph: { siteName: "EverMore", type: "website" },
};

export const viewport: Viewport = {
  themeColor: "#101C35",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fontVariables} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-full focus:bg-navy focus:px-4 focus:py-2 focus:text-ivory"
        >
          Skip to content
        </a>
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
