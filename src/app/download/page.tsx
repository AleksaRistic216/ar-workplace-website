import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { RELEASES_URL, formatSize, getLatestRelease, type ReleaseAsset } from "@/lib/release";

// Must be a literal: Next reads segment config statically, so an imported constant is ignored.
// Keep in step with RELEASE_REVALIDATE_SECONDS in lib/release.ts.
export const revalidate = 600;

// Same origin as sitemap.ts, robots.ts and metadataBase — a mismatch puts absolute URLs in the
// structured data that point somewhere the site is not served from.
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.crossplatformterminal.com";

export const metadata: Metadata = {
  title: "Download Cross Platform Terminal — Linux & Windows",
  description:
    "Download the latest Cross Platform Terminal build. No installer: extract the archive and run it. Linux AppImage and tar.gz, Windows ZIP.",
  alternates: { canonical: "/download" },
};

function LinuxIcon() {
  return (
    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12.504 0c-.155 0-.315.008-.48.021C7.576.191 3.924 3.58 3.217 7.94c-.284 1.718-.143 3.331.393 4.772.08.21.156.396.217.529.054.12.098.205.126.254l.08.133a4.47 4.47 0 01.464 1.01c.093.372.078.684-.033.96-.278.693-1.184 1.28-1.888 2.063-.27.302-.5.63-.634.996-.136.368-.164.79-.054 1.222.185.723.68 1.287 1.34 1.619.659.333 1.46.43 2.218.292.759-.137 1.455-.476 1.971-.971.515-.495.857-1.152.954-1.908.118-.928-.13-1.69-.5-2.4a10.72 10.72 0 01-.37-.813c-.115-.29-.192-.553-.203-.771-.013-.248.04-.432.186-.587.296-.317.845-.488 1.415-.574.573-.087 1.19-.082 1.748-.025.558.057 1.05.18 1.374.363.327.184.486.42.444.714-.04.283-.24.59-.527.836-.284.245-.65.435-1.04.547-.39.11-.8.134-1.15.068a2.09 2.09 0 01-.857-.37.528.528 0 00-.724.137.524.524 0 00.127.726c.37.267.81.435 1.296.514.487.08 1.02.057 1.537-.083.517-.139.998-.39 1.39-.738.39-.348.683-.801.77-1.344.09-.554-.053-1.092-.39-1.54-.336-.447-.836-.787-1.432-1.01-.597-.222-1.28-.316-1.944-.332a10.57 10.57 0 00-.81.021c.098-.23.21-.477.33-.734.318-.69.702-1.44 1.015-2.206.316-.77.555-1.558.555-2.3 0-2.656-2.15-4.806-4.805-4.806z" />
    </svg>
  );
}

function WindowsIcon() {
  return (
    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M3 12V6.75l6-1.32v6.57H3zM21 12v-6.75l-6-1.32v8.07H21zM3 13.5h6v6.57l-6-1.32V13.5zM15 13.5h6v5.25l-6-1.32V13.5z" />
    </svg>
  );
}

function MacIcon() {
  return (
    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

function DownloadButton({ asset, label }: { asset: ReleaseAsset; label: string }) {
  return (
    <a
      href={asset.url}
      className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg text-sm font-medium cpt-accent-btn"
    >
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
        />
      </svg>
      {label}
      <span style={{ opacity: 0.75 }}>· {formatSize(asset.size)}</span>
    </a>
  );
}

/** Shown when an expected asset is missing from the release — never as a loading state. */
function MissingAsset({ label }: { label: string }) {
  return (
    <a
      href={RELEASES_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center w-full px-4 py-2.5 rounded-lg text-sm font-medium border cpt-quiet"
      style={{ borderColor: "var(--color-border)", color: "var(--color-muted)" }}
    >
      {label} — find it on GitHub
    </a>
  );
}

function PlatformCard({
  icon,
  name,
  detail,
  children,
  dimmed,
}: {
  icon: React.ReactNode;
  name: string;
  detail: string;
  children: React.ReactNode;
  dimmed?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-6 flex flex-col gap-4${dimmed ? " opacity-50" : ""}`}
      style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
    >
      <div className="flex items-center gap-3">
        <span style={{ color: dimmed ? "var(--color-muted)" : "var(--color-accent)" }}>{icon}</span>
        <h2 className="font-semibold text-sm" style={{ color: "var(--color-foreground)" }}>
          {name}
        </h2>
      </div>
      <p className="text-xs leading-relaxed" style={{ color: "var(--color-muted)" }}>
        {detail}
      </p>
      <div className="mt-auto flex flex-col gap-2">{children}</div>
    </div>
  );
}

export default async function DownloadPage() {
  const release = await getLatestRelease();

  /*
   * The current build as structured data: version, date, and the actual download URLs.
   *
   * This is the page an assistant is sent to when someone asks "where do I get it and what do I
   * need to run it", so the answer is spelled out rather than left to be scraped off buttons —
   * including the glibc floor, which is the one thing that decides whether the Linux download
   * will start at all.
   */
  const jsonLd = release
    ? {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "Cross Platform Terminal (CPT)",
        applicationCategory: "DeveloperApplication",
        operatingSystem: "Linux, Windows",
        processorRequirements: "x86-64",
        softwareVersion: release.version.replace(/^v/, ""),
        ...(release.publishedAt ? { datePublished: release.publishedAt } : {}),
        softwareRequirements:
          "Linux with glibc 2.39 or newer, or Windows 10 / 11. No installer: extract the archive and run it.",
        installUrl: `${SITE_URL}/download`,
        downloadUrl: [release.linuxAppImage, release.linuxTarGz, release.windows]
          .filter((a): a is ReleaseAsset => a !== null)
          .map((a) => a.url),
        releaseNotes: `${SITE_URL}/changelog`,
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <Navbar />
      <main className="flex-1 flex flex-col items-center justify-center px-6 pt-32 pb-24">
        <div className="max-w-3xl w-full mx-auto">
          <div className="text-center mb-12">
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-3"
              style={{ color: "var(--color-accent)" }}
            >
              Download
            </p>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ color: "var(--color-foreground)" }}>
              Get Cross Platform Terminal
            </h1>

            {release ? (
              <p className="mt-3 text-sm" style={{ color: "var(--color-muted)" }}>
                Latest release{" "}
                <span style={{ color: "var(--color-foreground)" }}>{release.version}</span>
                {release.publishedAt && (
                  <>
                    {" · "}
                    {new Date(release.publishedAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </>
                )}
                {" · "}
                <a
                  href={release.notesUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cpt-quiet"
                  style={{ color: "var(--color-accent)" }}
                >
                  release notes
                </a>
              </p>
            ) : (
              <p className="mt-3 text-sm" style={{ color: "var(--color-muted)" }}>
                Release information is unavailable right now.{" "}
                <a
                  href={RELEASES_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--color-accent)" }}
                >
                  Download from GitHub
                </a>
              </p>
            )}
          </div>

          {/*
            * Said before the buttons, not after. CPT will not run without a licence, and finding
            * that out at a sign-in wall after downloading is the worst possible moment to learn it.
            */}
          <div
            className="mb-10 rounded-xl border px-5 py-4 text-sm text-center"
            style={{ borderColor: "var(--color-border)", background: "var(--color-surface)", color: "var(--color-muted)" }}
          >
            <span style={{ color: "var(--color-foreground)" }}>CPT needs a subscription to run.</span> Grab
            the build for your platform below — there is no installer, just extract and run — then sign
            in when the app asks.{" "}
            <Link href="/pricing" className="font-medium" style={{ color: "var(--color-accent)" }}>
              Not subscribed yet? €7.49/month.
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <PlatformCard
              icon={<LinuxIcon />}
              name="Linux"
              detail="x86_64 · AppImage (run anywhere) or tar.gz (extract and run)"
            >
              {release?.linuxAppImage ? (
                <DownloadButton asset={release.linuxAppImage} label="AppImage" />
              ) : (
                <MissingAsset label="AppImage" />
              )}
              {release?.linuxTarGz ? (
                <DownloadButton asset={release.linuxTarGz} label="tar.gz" />
              ) : (
                <MissingAsset label="tar.gz" />
              )}
            </PlatformCard>

            <PlatformCard
              icon={<WindowsIcon />}
              name="Windows"
              detail="x86_64 · ZIP archive, no installer required"
            >
              {release?.windows ? (
                <DownloadButton asset={release.windows} label=".zip" />
              ) : (
                <MissingAsset label=".zip" />
              )}
            </PlatformCard>

            <PlatformCard icon={<MacIcon />} name="macOS" detail="Coming soon" dimmed>
              <div
                className="w-full px-4 py-2.5 rounded-lg text-sm font-medium text-center cursor-not-allowed"
                style={{ background: "var(--color-surface-2)", color: "var(--color-muted)" }}
              >
                Not yet available
              </div>
            </PlatformCard>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
