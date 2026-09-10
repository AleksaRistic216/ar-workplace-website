import Link from "next/link";
import { Fragment, type ReactNode } from "react";

import type { Block } from "@/lib/guides";

/**
 * Renders a guide's blocks.
 *
 * The content in lib/guides.ts is data, not JSX, so that the set stays uniform and can be
 * enumerated by the sitemap and the refresh script. The one thing prose genuinely needs is inline
 * links, so a `[label](href)` form is parsed here rather than letting HTML back into the data.
 */
export default function GuideBody({ blocks }: { blocks: Block[] }) {
  return (
    <div className="flex flex-col gap-6">
      {blocks.map((block, i) => {
        switch (block.kind) {
          case "h2":
            return (
              <h2
                key={i}
                className="text-xl font-semibold tracking-tight mt-6"
                style={{ color: "var(--color-foreground)" }}
              >
                {block.text}
              </h2>
            );

          case "p":
            return (
              <p key={i} className="text-base leading-relaxed" style={{ color: "var(--color-muted)" }}>
                <Inline text={block.text} />
              </p>
            );

          case "list":
          case "steps": {
            const List = block.kind === "steps" ? "ol" : "ul";
            return (
              <List key={i} className="flex flex-col gap-3">
                {block.items.map((item, j) => (
                  <li
                    key={j}
                    className="flex gap-3 text-base leading-relaxed"
                    style={{ color: "var(--color-muted)" }}
                  >
                    <span
                      aria-hidden
                      className={block.kind === "steps" ? "font-mono text-sm pt-0.5" : ""}
                      style={{ color: "var(--color-accent)", opacity: 0.7 }}
                    >
                      {block.kind === "steps" ? `${j + 1}.` : "•"}
                    </span>
                    <span>
                      <Inline text={item} />
                    </span>
                  </li>
                ))}
              </List>
            );
          }

          case "code":
            return (
              <pre
                key={i}
                className="rounded-xl border p-5 overflow-x-auto text-sm leading-relaxed font-mono"
                style={{
                  background: "var(--color-surface)",
                  borderColor: "var(--color-border)",
                  color: "var(--color-foreground)",
                }}
              >
                <code>
                  {block.lines.map((line, j) => (
                    <Fragment key={j}>
                      {/* Comments dimmed rather than syntax-highlighted: these are three-line
                          snippets, and a highlighter would be more machinery than they are worth. */}
                      <span style={line.trimStart().startsWith("#") ? { color: "var(--color-muted)" } : undefined}>
                        {line || " "}
                      </span>
                      {j < block.lines.length - 1 ? "\n" : null}
                    </Fragment>
                  ))}
                </code>
              </pre>
            );

          case "note":
            return (
              <p
                key={i}
                className="rounded-xl border-l-2 pl-5 py-3 text-sm leading-relaxed"
                style={{
                  borderColor: "var(--color-accent)",
                  background: "var(--color-accent-dim)",
                  color: "var(--color-muted)",
                }}
              >
                <Inline text={block.text} />
              </p>
            );
        }
      })}
    </div>
  );
}

const LINK = /\[([^\]]+)\]\(([^)]+)\)/g;

/** Splits `text` on `[label](href)` and renders the pieces. Internal hrefs get a Link. */
function Inline({ text }: { text: string }) {
  const out: ReactNode[] = [];
  let last = 0;

  for (const match of text.matchAll(LINK)) {
    const [whole, label, href] = match;
    const at = match.index ?? 0;

    if (at > last) out.push(text.slice(last, at));

    out.push(
      href.startsWith("/") ? (
        <Link key={at} href={href} className="cpt-quiet" style={{ color: "var(--color-accent)" }}>
          {label}
        </Link>
      ) : (
        <a
          key={at}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="cpt-quiet"
          style={{ color: "var(--color-accent)" }}
        >
          {label}
        </a>
      )
    );

    last = at + whole.length;
  }

  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}
