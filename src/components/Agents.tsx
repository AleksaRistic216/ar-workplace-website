/*
 * The agents CPT recognises.
 *
 * The source of truth is `kRules` in `src/terminal/AgentCatalog.cpp` — one row per agent, in
 * priority order, which is the order used here. The labels are copied from that table verbatim
 * (including `opencode`, which is lower-case there). Adding an agent in the product is adding a
 * row; check this list against that table on every `/release-sync`.
 *
 * Why monograms rather than the real logos: these are other companies' trademarks and we have no
 * licensed assets for them. A hand-drawn approximation of someone's logo is worse than an honest
 * initial, so each agent gets a tinted monogram instead.
 */
const agents = [
  { label: "Claude Code", mark: "C", tint: "#d97757" },
  { label: "GitHub Copilot", mark: "G", tint: "#8b949e" },
  { label: "Codex CLI", mark: "O", tint: "#74aa9c" },
  { label: "Gemini CLI", mark: "G", tint: "#4285f4" },
  { label: "Aider", mark: "A", tint: "#7dd88f" },
  { label: "Cursor Agent", mark: "C", tint: "#a78bfa" },
  { label: "opencode", mark: "o", tint: "#56d4d4" },
  { label: "Amp", mark: "A", tint: "#e06c9f" },
];

export default function Agents() {
  return (
    <section className="py-16 px-6 border-t" style={{ borderColor: "var(--color-border)" }}>
      <div className="max-w-4xl mx-auto text-center">
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{ color: "var(--color-accent)" }}
        >
          Agents
        </p>
        <h2
          className="text-2xl md:text-3xl font-bold tracking-tight"
          style={{ color: "var(--color-foreground)" }}
        >
          Whichever agent you already use
        </h2>
        <p className="mt-4 max-w-2xl mx-auto text-sm leading-relaxed" style={{ color: "var(--color-muted)" }}>
          CPT recognises each of these by reading the process tree and its arguments, so it still
          finds them behind <code className="font-mono text-xs">npx</code>,{" "}
          <code className="font-mono text-xs">uv</code>,{" "}
          <code className="font-mono text-xs">node</code> or a virtualenv shim — and then badges
          the pane, spins the tab, and tells working apart from waiting on you.
        </p>

        <ul className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
          {agents.map((a) => (
            <li
              key={a.label}
              className="inline-flex items-center gap-2 rounded-full border pl-1.5 pr-3.5 py-1.5 text-sm"
              style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
            >
              <span
                aria-hidden
                className="flex items-center justify-center w-6 h-6 rounded-full font-mono text-[11px] font-semibold shrink-0"
                style={{ background: `${a.tint}22`, color: a.tint }}
              >
                {a.mark}
              </span>
              <span style={{ color: "var(--color-foreground)" }}>{a.label}</span>
            </li>
          ))}
        </ul>

        <p className="mt-6 text-xs" style={{ color: "var(--color-muted)" }}>
          Running something else? Ask for it — new agents are a row in a table.
        </p>
      </div>
    </section>
  );
}
