import type { MetadataRoute } from "next";

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
  ];
}
