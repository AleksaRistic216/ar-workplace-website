"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Real routes since the landing page was split up; these were "/#features" and friends.
const links = [
  { label: "Features", href: "/features" },
  { label: "Cross-Platform", href: "/cross-platform" },
  { label: "Pricing", href: "/pricing" },
  { label: "FAQ", href: "/faq" },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 border-b"
      style={{
        background: "rgba(12, 12, 15, 0.85)",
        backdropFilter: "blur(12px)",
        borderColor: "var(--color-border)",
      }}
    >
      <nav className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 font-semibold text-[15px]">
          <Image src="/icon.png" alt="" width={28} height={28} className="rounded" />
          <span style={{ color: "var(--color-foreground)" }}>Cross Platform Terminal</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-7">
          {links.map(({ label, href }) => {
            const active = pathname === href;
            return (
              <Link
                key={label}
                href={href}
                aria-current={active ? "page" : undefined}
                className="text-sm cpt-quiet"
                style={{ color: active ? "var(--color-foreground)" : "var(--color-muted)" }}
              >
                {label}
              </Link>
            );
          })}
          <Link href="/download" className="text-sm px-4 py-1.5 rounded-md font-medium cpt-accent-btn">
            Download
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2 rounded cpt-quiet"
          style={{ color: "var(--color-muted)" }}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          className="md:hidden border-t px-6 py-4 flex flex-col gap-4"
          style={{ borderColor: "var(--color-border)", background: "var(--color-background)" }}
        >
          {links.map(({ label, href }) => {
            const active = pathname === href;
            return (
              <Link
                key={label}
                href={href}
                aria-current={active ? "page" : undefined}
                className="text-sm cpt-quiet"
                style={{ color: active ? "var(--color-foreground)" : "var(--color-muted)" }}
                onClick={() => setMenuOpen(false)}
              >
                {label}
              </Link>
            );
          })}
          <Link
            href="/download"
            className="text-sm px-4 py-2 rounded-md text-center font-medium cpt-accent-btn"
            onClick={() => setMenuOpen(false)}
          >
            Download
          </Link>
        </div>
      )}
    </header>
  );
}
