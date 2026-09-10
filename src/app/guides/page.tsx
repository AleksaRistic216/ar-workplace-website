import type { Metadata } from "next";
import Link from "next/link";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { GUIDES } from "@/lib/guides";

export const metadata: Metadata = {
  title: "Guides",
  description:
    "Practical answers on cross-platform terminal setups, persistent shell sessions, tmux on Windows, GPU rendering and keeping track of coding agents.",
  alternates: { canonical: "/guides" },
};

export default function GuidesIndexPage() {
  return (
    <>
      <Navbar />
      {/* pt-14 reserves the fixed header's height; the section supplies its own breathing room. */}
      <main className="pt-14">
        <section className="py-20 px-6">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-14">
              <p
                className="text-xs font-semibold uppercase tracking-widest mb-3"
                style={{ color: "var(--color-accent)" }}
              >
                Guides
              </p>
              <h1
                className="text-3xl md:text-4xl font-bold tracking-tight"
                style={{ color: "var(--color-foreground)" }}
              >
                Answers, including when the answer is not CPT
              </h1>
              <p
                className="mt-4 max-w-xl mx-auto text-base leading-relaxed"
                style={{ color: "var(--color-muted)" }}
              >
                Each of these covers the free options first. If one of them solves your problem,
                take it — we would rather be the page that helped than the page that sold.
              </p>
            </div>

            <ul className="flex flex-col gap-4">
              {GUIDES.map((g) => (
                <li key={g.slug}>
                  <Link
                    href={`/guides/${g.slug}`}
                    className="block rounded-xl border p-5 cpt-quiet"
                    style={{
                      background: "var(--color-surface)",
                      borderColor: "var(--color-border)",
                    }}
                  >
                    <span
                      className="block text-base font-semibold mb-1.5"
                      style={{ color: "var(--color-foreground)" }}
                    >
                      {g.title}
                    </span>
                    <span
                      className="block text-sm leading-relaxed"
                      style={{ color: "var(--color-muted)" }}
                    >
                      {g.summary}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
