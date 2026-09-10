import Link from "next/link";

import { COMPARISON_ROWS, CPT_ROW, type Competitor } from "@/lib/competitors";
import { formatReleaseDate } from "@/lib/release";

/**
 * One "CPT vs X" page.
 *
 * The two columns of the comparison table carry equal weight on purpose, and the competitor's
 * strengths are printed above CPT's rather than below them. These pages are read by people who
 * already chose the other tool; leading with the concession is what buys the rest of the page a
 * hearing. See the note at the top of lib/competitors.ts.
 */
export default function Comparison({ competitor: c }: { competitor: Competitor }) {
  const verified = formatReleaseDate(`${c.verifiedOn}T00:00:00Z`);

  return (
    <section className="py-20 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-14">
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: "var(--color-accent)" }}
          >
            Comparison
          </p>
          <h1
            className="text-3xl md:text-4xl font-bold tracking-tight"
            style={{ color: "var(--color-foreground)" }}
          >
            Cross Platform Terminal vs {c.name}
          </h1>
          <p
            className="mt-4 max-w-2xl text-base leading-relaxed"
            style={{ color: "var(--color-muted)" }}
          >
            {c.what}{" "}
            <a
              href={c.url}
              target="_blank"
              rel="noopener noreferrer"
              className="cpt-quiet"
              style={{ color: "var(--color-accent)" }}
            >
              {c.name}&rsquo;s own site &rarr;
            </a>
          </p>
        </div>

        {/* Side by side, on the axes a buyer actually decides on. */}
        <div
          className="rounded-xl border overflow-x-auto"
          style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <table className="w-full text-sm border-collapse min-w-[42rem]">
            <caption className="sr-only">
              Cross Platform Terminal compared with {c.name}
            </caption>
            <thead>
              <tr>
                <th
                  scope="col"
                  className="text-left font-medium px-5 py-3.5 border-b w-[9.5rem]"
                  style={{ color: "var(--color-muted)", borderColor: "var(--color-border)" }}
                >
                  <span className="sr-only">Feature</span>
                </th>
                <th
                  scope="col"
                  className="text-left font-semibold px-5 py-3.5 border-b"
                  style={{ color: "var(--color-accent)", borderColor: "var(--color-border)" }}
                >
                  {CPT_ROW.name}
                </th>
                <th
                  scope="col"
                  className="text-left font-semibold px-5 py-3.5 border-b"
                  style={{ color: "var(--color-foreground)", borderColor: "var(--color-border)" }}
                >
                  {c.name}
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row, i) => (
                <tr key={row.label}>
                  <th
                    scope="row"
                    className="text-left align-top font-medium px-5 py-3.5"
                    style={{
                      color: "var(--color-muted)",
                      borderTop: i === 0 ? undefined : "1px solid var(--color-border)",
                    }}
                  >
                    {row.label}
                  </th>
                  <td
                    className="align-top px-5 py-3.5 leading-relaxed"
                    style={{
                      color: "var(--color-foreground)",
                      borderTop: i === 0 ? undefined : "1px solid var(--color-border)",
                    }}
                  >
                    {row.cpt}
                  </td>
                  <td
                    className="align-top px-5 py-3.5 leading-relaxed"
                    style={{
                      color: "var(--color-muted)",
                      borderTop: i === 0 ? undefined : "1px solid var(--color-border)",
                    }}
                  >
                    {row.of(c)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid md:grid-cols-2 gap-5 mt-12">
          <Panel title={`Where ${c.name} is the better choice`} items={c.wins} tone="neutral" />
          <Panel title="Where CPT is the better choice" items={c.cptWins} tone="accent" />
        </div>

        <div
          className="mt-12 rounded-xl border p-6"
          style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <p
            className="text-[11px] font-semibold uppercase tracking-widest mb-3"
            style={{ color: "var(--color-accent)" }}
          >
            The short version
          </p>
          <p className="text-base leading-relaxed" style={{ color: "var(--color-foreground)" }}>
            {c.verdict}
          </p>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link
            href="/download"
            className="text-sm px-5 py-2.5 rounded-md font-medium cpt-accent-btn"
          >
            Download CPT
          </Link>
          <Link href="/pricing" className="text-sm cpt-quiet" style={{ color: "var(--color-muted)" }}>
            See pricing &rarr;
          </Link>
          <Link href="/vs" className="text-sm cpt-quiet" style={{ color: "var(--color-muted)" }}>
            All comparisons &rarr;
          </Link>
        </div>

        {/* Where every claim in the table came from. A comparison without this is just an advert. */}
        <div className="mt-12 pt-6 border-t" style={{ borderColor: "var(--color-border)" }}>
          <p className="text-xs leading-relaxed" style={{ color: "var(--color-muted)" }}>
            {c.name} details checked against{" "}
            {c.sources.map((s, i) => (
              <span key={s.url}>
                {i > 0 && (i === c.sources.length - 1 ? " and " : ", ")}
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--color-accent)" }}
                >
                  {s.label}
                </a>
              </span>
            ))}
            {verified ? ` on ${verified}` : null}. Projects move; if something here is out of date
            or wrong,{" "}
            <a
              href="https://github.com/AleksaRistic216/ar-workspace-release/issues"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--color-accent)" }}
            >
              tell us
            </a>{" "}
            and it gets fixed.
          </p>
        </div>
      </div>
    </section>
  );
}

function Panel({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "neutral" | "accent";
}) {
  const bullet = tone === "accent" ? "var(--color-accent)" : "var(--color-muted)";
  return (
    <div
      className="rounded-xl border p-6"
      style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
    >
      <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--color-foreground)" }}>
        {title}
      </h2>
      <ul className="flex flex-col gap-3">
        {items.map((item, i) => (
          <li
            key={i}
            className="flex gap-2.5 text-sm leading-relaxed"
            style={{ color: "var(--color-muted)" }}
          >
            <span aria-hidden style={{ color: bullet, opacity: 0.7 }}>
              &bull;
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
