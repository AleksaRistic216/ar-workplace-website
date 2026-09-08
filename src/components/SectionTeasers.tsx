import Link from "next/link";

/*
 * The bridge from the home page to the four pages the landing page used to be.
 *
 * Each card carries the `id` its section used to own — `#features`, `#cross-platform`, `#pricing`,
 * `#faq`. Those anchors were the whole public URL surface of the old single-page site, and they
 * live in links people have already shared. A hash cannot be redirected server-side (it never
 * reaches the server), so the only way to honour an old `/#pricing` is to keep something at that
 * id: the visitor lands on the card for the thing they asked for, one click from the page itself.
 */
const teasers = [
  {
    id: "features",
    href: "/features",
    eyebrow: "Features",
    title: "Everything in one window",
    body: "A multi-view workspace, a full terminal emulator, the AI workflow pipeline, and an inventory of the AI tooling your repository actually has.",
  },
  {
    id: "cross-platform",
    href: "/cross-platform",
    eyebrow: "Cross-Platform",
    title: "The same keys everywhere",
    body: "The platform quirks CPT resolves on Linux and Windows, and the full keyboard shortcut table.",
  },
  {
    id: "pricing",
    href: "/pricing",
    eyebrow: "Pricing",
    title: "€7.49 a month",
    body: "Pay for a month or a year at a time. Nothing renews on its own, and there is nothing to cancel.",
  },
  {
    id: "faq",
    href: "/faq",
    eyebrow: "FAQ",
    title: "Before you buy",
    body: "Billing, platforms, what updates are included, and how to get a bug looked at.",
  },
];

export default function SectionTeasers() {
  return (
    <section className="py-24 px-6 border-t" style={{ borderColor: "var(--color-border)" }}>
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-5">
        {teasers.map((t) => (
          <Link
            key={t.id}
            id={t.id}
            href={t.href}
            className="group rounded-xl border p-6 flex flex-col gap-2 transition-colors"
            style={{
              background: "var(--color-surface)",
              borderColor: "var(--color-border)",
            }}
          >
            <span
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: "var(--color-accent)" }}
            >
              {t.eyebrow}
            </span>
            <h2
              className="text-xl font-bold tracking-tight"
              style={{ color: "var(--color-foreground)" }}
            >
              {t.title}
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: "var(--color-muted)" }}>
              {t.body}
            </p>
            <span
              className="mt-1 text-sm font-medium inline-flex items-center gap-1.5"
              style={{ color: "var(--color-accent)" }}
            >
              Read more
              <svg
                className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
