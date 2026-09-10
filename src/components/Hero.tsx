import TerminalDemo from "@/components/TerminalDemo";

/*
 * The four claims, in the order set out under "What CPT is selling" in `docs/architecture.md`.
 * That section is the canonical statement, not this array — change it there first.
 *
 * The order is load-bearing. "Terminal first, AI second" is the positioning itself, so the
 * terminal claim precedes the AI one on the page as well as in the sentence.
 */
const claims = [
  {
    heading: "The same on every platform",
    body: "Linux and Windows today, macOS in progress. Same layout, same behaviour — across PowerShell, cmd, Git bash, WSL and whatever your $SHELL is.",
  },
  {
    heading: "The same keys, everywhere",
    body: "One set of bindings on every platform: Ctrl+Shift+C and Ctrl+Shift+V copy and paste on Windows and Linux alike, and every action — panes, views, docks, zoom — has a key and rebinds. Alt+key still passes through to the shell, so an agent CLI keeps its own.",
  },
  {
    heading: "A terminal first",
    body: "PTY-backed, full VT, tabs and scrollback. The AI tooling is the best second job it does — not the reason it exists.",
  },
  {
    heading: "Shells that outlive the window",
    body: "Turn it on and your terminals move into a background daemon. Close the app, open it again, and that half-hour build is still running.",
  },
  {
    heading: "GPU-accelerated",
    body: "The entire terminal grid renders in a single draw call. Smooth at any size, on any of them.",
  },
];

export default function Hero() {
  return (
    <section className="relative pt-28 pb-20 px-6 overflow-hidden">
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% -10%, rgba(224,112,64,0.10) 0%, transparent 70%)",
        }}
      />

      <div className="relative max-w-5xl mx-auto">
        {/* Badge */}
        <div className="flex justify-center mb-7">
          <span
            className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1 rounded-full border"
            style={{
              color: "var(--color-accent)",
              borderColor: "rgba(224,112,64,0.3)",
              background: "rgba(224,112,64,0.08)",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            Available for Linux &amp; Windows — macOS in progress
          </span>
        </div>

        {/* Headline */}
        <h1
          className="text-center font-bold text-4xl sm:text-5xl lg:text-6xl leading-[1.08] tracking-tight max-w-3xl mx-auto"
          style={{ color: "var(--color-foreground)" }}
        >
          One terminal.
          <br />
          <span style={{ color: "var(--color-accent)" }}>Every platform.</span>
        </h1>

        <p
          className="mt-5 text-center text-base md:text-lg max-w-2xl mx-auto leading-relaxed"
          style={{ color: "var(--color-muted)" }}
        >
          A GPU-accelerated terminal that behaves identically wherever you work, keeps your shells
          running after you close it, and happens to be the best place to run an AI agent.
        </p>

        {/*
         * The four claims. No call to action here by design — the nav carries Download and the
         * teasers carry Pricing, so the hero's whole job is to say what CPT is.
         */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6 max-w-3xl mx-auto text-left">
          {claims.map((c) => (
            <div key={c.heading} className="flex gap-3">
              <svg
                className="w-4 h-4 mt-0.5 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                style={{ color: "var(--color-accent)" }}
                aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <p className="text-sm font-semibold mb-1" style={{ color: "var(--color-foreground)" }}>
                  {c.heading}
                </p>
                <p className="text-sm leading-relaxed" style={{ color: "var(--color-muted)" }}>
                  {c.body}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* The product, running */}
        <div className="mt-14 max-w-4xl mx-auto">
          <TerminalDemo />
        </div>
      </div>
    </section>
  );
}
