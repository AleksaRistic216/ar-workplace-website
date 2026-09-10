import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import GuideBody from "@/components/GuideBody";
import { GUIDES, guideBySlug } from "@/lib/guides";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const g = guideBySlug(slug);
  if (!g) return {};

  return {
    title: g.metaTitle,
    description: g.description,
    alternates: { canonical: `/guides/${g.slug}` },
    openGraph: { type: "article", title: g.title, description: g.description },
  };
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = guideBySlug(slug);
  if (!guide) notFound();

  const related = guide.related
    .map((s) => guideBySlug(s))
    .filter((g): g is NonNullable<typeof g> => Boolean(g));

  /*
   * Marked up as a TechArticle for the same reason the changelog carries an ItemList: these pages
   * are written to be quoted by answer engines as much as clicked from a results page, and a
   * machine should not have to infer what the page is from its prose.
   */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: guide.title,
    description: guide.description,
    author: { "@type": "Organization", name: "Limitless Soft" },
    publisher: { "@type": "Organization", name: "Limitless Soft" },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />
      {/* pt-14 reserves the fixed header's height; the section supplies its own breathing room. */}
      <main className="pt-14">
        <article className="py-20 px-6">
          <div className="max-w-3xl mx-auto">
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-3"
              style={{ color: "var(--color-accent)" }}
            >
              <Link href="/guides" className="cpt-quiet" style={{ color: "inherit" }}>
                Guides
              </Link>
            </p>
            <h1
              className="text-3xl md:text-4xl font-bold tracking-tight mb-10"
              style={{ color: "var(--color-foreground)" }}
            >
              {guide.title}
            </h1>

            <GuideBody blocks={guide.blocks} />

            <div
              className="mt-14 pt-8 border-t flex flex-wrap items-center gap-4"
              style={{ borderColor: "var(--color-border)" }}
            >
              <Link
                href="/download"
                className="text-sm px-5 py-2.5 rounded-md font-medium cpt-accent-btn"
              >
                Download CPT
              </Link>
              <Link
                href="/pricing"
                className="text-sm cpt-quiet"
                style={{ color: "var(--color-muted)" }}
              >
                €7.49 a month &rarr;
              </Link>
            </div>

            {related.length > 0 && (
              <div className="mt-12">
                <h2
                  className="text-sm font-semibold mb-4"
                  style={{ color: "var(--color-foreground)" }}
                >
                  Related
                </h2>
                <ul className="flex flex-col gap-3">
                  {related.map((r) => (
                    <li key={r.slug}>
                      <Link
                        href={`/guides/${r.slug}`}
                        className="text-sm cpt-quiet"
                        style={{ color: "var(--color-accent)" }}
                      >
                        {r.title} &rarr;
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
