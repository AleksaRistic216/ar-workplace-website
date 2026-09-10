import type { Metadata } from "next";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  ISSUES_URL,
  RELEASES_URL,
  formatReleaseDate,
  getReleases,
  relativeTime,
} from "@/lib/release";

// Must be a literal: Next reads segment config statically, so an imported constant is ignored.
// Keep in step with RELEASE_REVALIDATE_SECONDS in lib/release.ts.
export const revalidate = 600;

export const metadata: Metadata = {
  title: "Patch notes — Cross Platform Terminal",
  description:
    "Every Cross Platform Terminal release, with what changed and when it shipped. Pulled from the release repository.",
  alternates: { canonical: "/changelog" },
};

export default async function ChangelogPage() {
  const releases = await getReleases(20);

  /*
   * The release history as structured data.
   *
   * "When was this last updated?" and "is it still maintained?" are among the first things both
   * a buyer and an assistant want to know, and the answer here is unusually good. Leaving it as
   * prose means it has to be inferred from the page; as an `ItemList` of dated `SoftwareApplication`
   * versions it can simply be read.
   */
  const jsonLd =
    releases.length === 0
      ? null
      : {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Cross Platform Terminal release history",
          description:
            "Every stable Cross Platform Terminal release, newest first, with the date it shipped.",
          numberOfItems: releases.length,
          itemListOrder: "https://schema.org/ItemListOrderDescending",
          itemListElement: releases.map((r, i) => ({
            "@type": "ListItem",
            position: i + 1,
            item: {
              "@type": "SoftwareApplication",
              name: `Cross Platform Terminal ${r.version}`,
              applicationCategory: "DeveloperApplication",
              operatingSystem: "Linux, Windows",
              softwareVersion: r.version.replace(/^v/, ""),
              ...(r.publishedAt ? { datePublished: r.publishedAt } : {}),
              url: r.notesUrl,
              ...(r.sections.length > 0
                ? {
                    releaseNotes: r.sections
                      .map((s) => `${s.heading}: ${s.items.join("; ")}`)
                      .join(" — "),
                  }
                : {}),
            },
          })),
        };

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <Navbar />
      <main className="pt-14">
        <section className="py-20 px-6">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-14">
              <p
                className="text-xs font-semibold uppercase tracking-widest mb-3"
                style={{ color: "var(--color-accent)" }}
              >
                Patch notes
              </p>
              <h1
                className="text-3xl md:text-4xl font-bold tracking-tight"
                style={{ color: "var(--color-foreground)" }}
              >
                What shipped, and when
              </h1>
              <p
                className="mt-4 max-w-xl mx-auto text-base leading-relaxed"
                style={{ color: "var(--color-muted)" }}
              >
                Straight from the release repository, not retyped here. Bugs and feature requests
                usually ship the same day —{" "}
                <a
                  href={ISSUES_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--color-accent)" }}
                >
                  open an issue
                </a>{" "}
                and watch it turn up in this list.
              </p>
            </div>

            {releases.length === 0 ? (
              /* Never a spinner or an empty box: GitHub was unreachable, so send them there. */
              <p className="text-center text-sm" style={{ color: "var(--color-muted)" }}>
                The release list could not be loaded just now.{" "}
                <a
                  href={RELEASES_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--color-accent)" }}
                >
                  Read it on GitHub
                </a>
                .
              </p>
            ) : (
              <ol className="flex flex-col gap-5">
                {releases.map((r) => {
                  const when = relativeTime(r.publishedAt);
                  const date = formatReleaseDate(r.publishedAt);
                  return (
                    <li
                      key={r.version}
                      className="rounded-xl border p-6"
                      style={{
                        background: "var(--color-surface)",
                        borderColor: "var(--color-border)",
                      }}
                    >
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-4">
                        <h2
                          className="font-mono text-base font-semibold"
                          style={{ color: "var(--color-foreground)" }}
                        >
                          {r.version}
                        </h2>
                        {/* Absolute date as well as relative: a cached page must not imply
                            something shipped more recently than it did. */}
                        {date && (
                          <span className="text-sm" style={{ color: "var(--color-muted)" }}>
                            {date}
                          </span>
                        )}
                        {when && (
                          <span className="text-xs" style={{ color: "var(--color-muted)", opacity: 0.75 }}>
                            · {when}
                          </span>
                        )}
                        <a
                          href={r.notesUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-auto text-xs cpt-quiet"
                          style={{ color: "var(--color-accent)" }}
                        >
                          On GitHub &rarr;
                        </a>
                      </div>

                      {r.sections.length === 0 ? (
                        <p className="text-sm" style={{ color: "var(--color-muted)" }}>
                          No notes were written for this release.
                        </p>
                      ) : (
                        <div className="flex flex-col gap-4">
                          {r.sections.map((s) => (
                            <div key={s.heading}>
                              <p
                                className="text-[11px] font-semibold uppercase tracking-widest mb-2"
                                style={{ color: "var(--color-accent)" }}
                              >
                                {s.heading}
                              </p>
                              <ul className="flex flex-col gap-1.5">
                                {s.items.map((item, i) => (
                                  <li
                                    key={i}
                                    className="flex gap-2.5 text-sm leading-relaxed"
                                    style={{ color: "var(--color-muted)" }}
                                  >
                                    <span aria-hidden style={{ color: "var(--color-accent)", opacity: 0.6 }}>
                                      &bull;
                                    </span>
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}

            <p className="mt-10 text-center text-xs" style={{ color: "var(--color-muted)" }}>
              Pre-release builds are left out — these are the versions the download page serves.{" "}
              <a
                href={RELEASES_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--color-accent)" }}
              >
                Full history on GitHub
              </a>
              .
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
