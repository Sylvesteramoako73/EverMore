import type { MetadataRoute } from "next";
import { siteHref } from "@/lib/hosts";
import { THEMES } from "@/lib/themes";

// The public website: the homepage, the policies page and one sample page per design.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteHref("/"), changeFrequency: "weekly", priority: 1 },
    ...THEMES.map((t) => ({ url: siteHref(`/samples/${t.id}`), changeFrequency: "monthly" as const, priority: 0.6 })),
    { url: siteHref("/policies"), changeFrequency: "yearly", priority: 0.3 },
  ];
}
