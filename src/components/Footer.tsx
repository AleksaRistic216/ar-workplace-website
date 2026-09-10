import Image from "next/image";
import Link from "next/link";
import { ISSUES_URL, RELEASES_URL } from "@/lib/release";

type Kind = "route" | "external";

const links: { label: string; href: string; kind: Kind }[] = [
  { label: "Download", href: "/download", kind: "route" },
  { label: "Pricing", href: "/pricing", kind: "route" },
  { label: "FAQ", href: "/faq", kind: "route" },
  // The content hubs live in the footer rather than the navbar: they are entry points for search
  // traffic, not steps in the buying path, and the header is already at its width on mobile.
  { label: "Compare", href: "/vs", kind: "route" },
  { label: "Guides", href: "/guides", kind: "route" },
  { label: "Releases", href: RELEASES_URL, kind: "external" },
  { label: "Report a bug", href: ISSUES_URL, kind: "external" },
];

const linkClass = "text-xs cpt-quiet";
const linkStyle = { color: "var(--color-muted)" };

export default function Footer() {
  return (
    <footer className="mt-auto border-t py-10 px-6" style={{ borderColor: "var(--color-border)" }}>
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-5">
        <div className="flex items-center gap-2.5">
          <Image src="/icon.png" alt="" width={28} height={28} className="rounded" />
          <span className="text-sm font-semibold" style={{ color: "var(--color-foreground)" }}>
            Cross Platform Terminal
          </span>
        </div>

        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {links.map(({ label, href, kind }) => {
            if (kind === "external") {
              return (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                  style={linkStyle}
                >
                  {label}
                </a>
              );
            }
            return (
              <Link key={label} href={href} className={linkClass} style={linkStyle}>
                {label}
              </Link>
            );
          })}
        </nav>

        <p className="text-xs" style={{ color: "var(--color-muted)" }}>
          © {new Date().getFullYear()} Cross Platform Terminal
        </p>
      </div>
    </footer>
  );
}
