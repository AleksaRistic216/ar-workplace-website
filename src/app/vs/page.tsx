import type { Metadata } from "next";
import Link from "next/link";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { COMPETITORS } from "@/lib/competitors";

export const metadata: Metadata = {
  title: "CPT compared with other terminals",
  description:
    "Cross Platform Terminal next to WezTerm, Alacritty, kitty, Ghostty, Windows Terminal, Warp, Tabby and Hyper — platforms, price, persistence and agent support, including where each one wins.",
  alternates: { canonical: "/vs" },
};

export default function ComparisonsIndexPage() {
  return (
    <>
      <Navbar />
      {/* pt-14 reserves the fixed header's height; the section supplies its own breathing room. */}
      <main className="pt-14">
        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-14">
              <p
                className="text-xs font-semibold uppercase tracking-widest mb-3"
                style={{ color: "var(--color-accent)" }}
              >
                Comparisons
              </p>
              <h1
                className="text-3xl md:text-4xl font-bold tracking-tight"
                style={{ color: "var(--color-foreground)" }}
              >
                How CPT compares
              </h1>
              <p
                className="mt-4 max-w-2xl mx-auto text-base leading-relaxed"
                style={{ color: "var(--color-muted)" }}
              >
                Most of these are free, open source and very good. Each page says where the other
                one wins before it says where CPT does, and every claim links to the
                documentation it was checked against.
              </p>
            </div>

            <ul className="grid sm:grid-cols-2 gap-4">
              {COMPETITORS.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/vs/${c.slug}`}
                    className="block h-full rounded-xl border p-5 cpt-quiet"
                    style={{
                      background: "var(--color-surface)",
                      borderColor: "var(--color-border)",
                    }}
                  >
                    <span
                      className="block text-base font-semibold mb-1.5"
                      style={{ color: "var(--color-foreground)" }}
                    >
                      CPT vs {c.name}
                    </span>
                    <span
                      className="block text-sm leading-relaxed"
                      style={{ color: "var(--color-muted)" }}
                    >
                      {c.what}
                    </span>
                    <span
                      className="block mt-3 text-xs font-medium"
                      style={{ color: "var(--color-accent)" }}
                    >
                      {c.price === "Free" ? "Free" : c.price.split(";")[0]} &middot; {c.windows}
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
