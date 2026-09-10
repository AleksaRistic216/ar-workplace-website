import type { MetadataRoute } from "next";

import { COMPETITORS } from "@/lib/competitors";
import { GUIDES } from "@/lib/guides";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.crossplatformterminal.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${BASE_URL}/download`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    // The pages the landing page was split into. Each has its own title and description, and is
    // the canonical home of what used to be an anchor on "/". The feature grid stayed on "/".
    ...["cross-platform", "pricing", "faq"].map((path) => ({
      url: `${BASE_URL}/${path}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    // Changes whenever a release goes out, which is often — hence its own entry.
    {
      url: `${BASE_URL}/changelog`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    },
    // The two content hubs and everything under them. Enumerated from the same arrays the pages
    // are built from, so a comparison or guide added to lib/ cannot be left out of the sitemap.
    ...["vs", "guides"].map((path) => ({
      url: `${BASE_URL}/${path}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...COMPETITORS.map((c) => ({
      url: `${BASE_URL}/vs/${c.slug}`,
      // The date the competitor's facts were last checked is the honest lastModified here: it is
      // when the page's content was last known to be true, not when the file was touched.
      lastModified: new Date(`${c.verifiedOn}T00:00:00Z`),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...GUIDES.map((g) => ({
      url: `${BASE_URL}/guides/${g.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
