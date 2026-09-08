import Link from "next/link";

import TerminalDemo from "@/components/TerminalDemo";
import UpdateFootnote from "@/components/UpdateFootnote";

const pills = [
  "No installation — extract and run",
  "Fully keyboard-driven",
  "Linux · Windows · macOS soon",
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
          One workspace.
          <br />
          <span style={{ color: "var(--color-accent)" }}>Every platform.</span>
        </h1>

        <p
          className="mt-5 text-center text-base md:text-lg max-w-xl mx-auto leading-relaxed"
          style={{ color: "var(--color-muted)" }}
        >
          A GPU-accelerated terminal and dockable workspace that behaves identically on Linux and
          Windows. Same shortcuts, same layout, same muscle memory.
        </p>

        {/* CTA */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/pricing" className="px-6 py-3 rounded-lg font-semibold text-sm cpt-accent-btn">
            Subscribe — €7.49/month
          </Link>
          <Link
            href="/download"
            className="px-6 py-3 rounded-lg font-medium text-sm border cpt-quiet"
            style={{ borderColor: "var(--color-border)", color: "var(--color-muted)" }}
          >
            Download the app
          </Link>
        </div>

        <p className="mt-4 text-center text-xs" style={{ color: "var(--color-muted)" }}>
          CPT needs a subscription to run. €7.49 a month or €67.41 a year, paid a period at a
          time — nothing auto-renews, and every update is included while you are subscribed.
          <UpdateFootnote />
        </p>

        {/* Trust pills */}
        <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {pills.map((pill) => (
            <span
              key={pill}
              className="inline-flex items-center gap-1.5 text-xs"
              style={{ color: "var(--color-muted)" }}
            >
              <svg
                className="w-3.5 h-3.5 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                style={{ color: "var(--color-accent)" }}
                aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              {pill}
            </span>
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
