import type { MetadataRoute } from "next";
import { siteHref } from "@/lib/hosts";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/dashboard", "/admin", "/onboarding", "/join/", "/r/", "/sign-in", "/sign-up"] }],
    sitemap: siteHref("/sitemap.xml"),
  };
}
