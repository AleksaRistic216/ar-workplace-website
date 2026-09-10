import Link from "next/link";

import { getReleases, relativeTime } from "@/lib/release";

/*
 * The last few releases, with when they shipped.
 *
 * The "bugs fixed fast" pillar has always been an assertion. This is the evidence for it, and it
 * is real data rather than a number someone typed: the dates come from the release repository,
 * so on a quiet fortnight this section will say so. That is the deal — a cadence claim backed by
 * a live feed can embarrass you, which is exactly why it is worth more than a promise.
 *
 * A server component so the fetch is cached once for everyone; see `RELEASE_REVALIDATE_SECONDS`.
 */
export default async function ReleaseStrip() {
  const releases = await getReleases(5);

  // Nothing to show beats an empty box or an error: the pillar's claim still stands on its own.
  if (releases.length === 0) return null;

  return (
    <section className="py-16 px-6 border-t" style={{ borderColor: "var(--color-border)" }}>
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 mb-6">
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-2"
              style={{ color: "var(--color-accent)" }}
            >
              Shipping
            </p>
            <h2
              className="text-2xl md:text-3xl font-bold tracking-tight"
              style={{ color: "var(--color-foreground)" }}
            >
              The last few releases
            </h2>
          </div>
          <Link href="/changelog" className="text-sm cpt-quiet" style={{ color: "var(--color-accent)" }}>
            All patch notes &rarr;
          </Link>
        </div>

        <ol className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)" }}>
          {releases.map((r, i) => {
            const when = relativeTime(r.publishedAt);
            const count = r.sections.reduce((n, s) => n + s.items.length, 0);
            return (
              <li
                key={r.version}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-5 py-3 border-b last:border-b-0 text-sm"
                style={{
                  borderColor: "var(--color-border)",
                  background: i % 2 === 0 ? "var(--color-surface)" : "transparent",
                }}
              >
                <span className="font-mono text-xs px-2 py-0.5 rounded"
                  style={{ background: "var(--color-surface-2)", color: "var(--color-foreground)" }}>
                  {r.version}
                </span>
                {when && <span style={{ color: "var(--color-muted)" }}>{when}</span>}
                {count > 0 && (
                  <span className="ml-auto text-xs" style={{ color: "var(--color-muted)" }}>
                    {count} {count === 1 ? "change" : "changes"}
                  </span>
                )}
              </li>
            );
          })}
        </ol>

        <p className="mt-4 text-sm leading-relaxed" style={{ color: "var(--color-muted)" }}>
          Report a bug or ask for a feature and it is usually shipped the same day. The dates above
          are pulled straight from the release repository, so you can check that rather than take
          our word for it.
        </p>
      </div>
    </section>
  );
}
