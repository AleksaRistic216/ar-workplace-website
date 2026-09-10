/*
 * Supported platforms.
 *
 * The source of truth is the "Supported platforms" table in `docs/testing.md` in the CPT repo,
 * plus the glibc note directly under it. Two things in there constrain this list and are easy to
 * get wrong:
 *
 *   1. `x86-64 only`. There is no ARM asset for either OS.
 *   2. **Debian 12 is a source-build target, not a download target.** The published tar.gz and
 *      AppImage are built on Ubuntu 24.04 and carry glibc 2.39; bookworm has 2.36, so the
 *      binaries do not start there (`GLIBC_2.39 not found`). Listing it unqualified would send a
 *      buyer to a download that cannot run. Hence the `note` field.
 *
 * "How it is tested" is shown deliberately. This site's cadence claim is evidenced rather than
 * asserted (see the release strip), and the same applies here: "gates every PR" is a stronger
 * statement than "supported", and it is checkable.
 *
 * Marks are tinted monograms rather than distribution logos, for the same reason the agent list
 * uses them: those logos are trademarks and there are no licensed assets here.
 */

type Row = { name: string; tested: string; mark: string; tint: string; note?: string };

const windows: Row[] = [
  { name: "Windows 11", tested: "Manual pre-release QA", mark: "11", tint: "#4cc2ff" },
  { name: "Windows 10", tested: "Manual pre-release QA", mark: "10", tint: "#4cc2ff" },
  { name: "Windows Server 2025", tested: "Gates every PR", mark: "S", tint: "#8b949e" },
];

const linux: Row[] = [
  { name: "Ubuntu 24.04 LTS", tested: "Gates every PR · builds the releases", mark: "U", tint: "#e95420" },
  { name: "Ubuntu 26.04 LTS", tested: "Tested nightly", mark: "U", tint: "#e95420" },
  { name: "Debian 13 (trixie)", tested: "Tested nightly", mark: "D", tint: "#d70a53" },
  { name: "Fedora 43 & 44", tested: "Tested nightly", mark: "F", tint: "#51a2da" },
  { name: "Arch (rolling)", tested: "Tested nightly", mark: "A", tint: "#1793d1" },
  {
    name: "Debian 12 (bookworm)",
    tested: "Gates every PR",
    mark: "D",
    tint: "#d70a53",
    note: "Build from source — the published binaries need glibc 2.39",
  },
];

function WindowsIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M3 12V6.75l6-1.32v6.57H3zM21 12v-6.75l-6-1.32v8.07H21zM3 13.5h6v6.57l-6-1.32V13.5zM15 13.5h6v5.25l-6-1.32V13.5z" />
    </svg>
  );
}

function LinuxIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12.504 0c-.155 0-.315.008-.48.021C7.576.191 3.924 3.58 3.217 7.94c-.284 1.718-.143 3.331.393 4.772.08.21.156.396.217.529.054.12.098.205.126.254l.08.133a4.47 4.47 0 01.464 1.01c.093.372.078.684-.033.96-.278.693-1.184 1.28-1.888 2.063-.27.302-.5.63-.634.996-.136.368-.164.79-.054 1.222.185.723.68 1.287 1.34 1.619.659.333 1.46.43 2.218.292.759-.137 1.455-.476 1.971-.971.515-.495.857-1.152.954-1.908.118-.928-.13-1.69-.5-2.4a10.72 10.72 0 01-.37-.813c-.115-.29-.192-.553-.203-.771-.013-.248.04-.432.186-.587.296-.317.845-.488 1.415-.574.573-.087 1.19-.082 1.748-.025.558.057 1.05.18 1.374.363.327.184.486.42.444.714-.04.283-.24.59-.527.836-.284.245-.65.435-1.04.547-.39.11-.8.134-1.15.068a2.09 2.09 0 01-.857-.37.528.528 0 00-.724.137.524.524 0 00.127.726c.37.267.81.435 1.296.514.487.08 1.02.057 1.537-.083.517-.139.998-.39 1.39-.738.39-.348.683-.801.77-1.344.09-.554-.053-1.092-.39-1.54-.336-.447-.836-.787-1.432-1.01-.597-.222-1.28-.316-1.944-.332a10.57 10.57 0 00-.81.021c.098-.23.21-.477.33-.734.318-.69.702-1.44 1.015-2.206.316-.77.555-1.558.555-2.3 0-2.656-2.15-4.806-4.805-4.806z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

function Group({
  icon,
  title,
  subtitle,
  rows,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  rows: Row[];
}) {
  return (
    <div
      className="rounded-xl border p-6"
      style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
    >
      <div className="flex items-center gap-2.5 mb-5">
        <span style={{ color: "var(--color-accent)" }}>{icon}</span>
        <h3 className="font-semibold text-sm" style={{ color: "var(--color-foreground)" }}>
          {title}
        </h3>
        <span className="ml-auto text-[11px] font-mono" style={{ color: "var(--color-muted)" }}>
          {subtitle}
        </span>
      </div>

      <ul className="flex flex-col gap-3.5">
        {rows.map((r) => (
          <li key={r.name} className="flex items-start gap-3">
            <span
              aria-hidden
              className="flex items-center justify-center w-6 h-6 rounded-md font-mono text-[10px] font-semibold shrink-0 mt-0.5"
              style={{ background: `${r.tint}22`, color: r.tint }}
            >
              {r.mark}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium" style={{ color: "var(--color-foreground)" }}>
                {r.name}
              </p>
              <p className="text-xs" style={{ color: "var(--color-muted)" }}>
                {r.tested}
              </p>
              {r.note && (
                <p className="text-xs mt-0.5" style={{ color: "var(--color-accent)", opacity: 0.85 }}>
                  {r.note}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Platforms() {
  return (
    <section className="py-20 px-6 border-t" style={{ borderColor: "var(--color-border)" }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: "var(--color-accent)" }}
          >
            Supported platforms
          </p>
          <h2
            className="text-3xl md:text-4xl font-bold tracking-tight"
            style={{ color: "var(--color-foreground)" }}
          >
            Where it runs, and how we know
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-base" style={{ color: "var(--color-muted)" }}>
            Every one of these builds and runs the test suite in CI — three of them on every
            single pull request, the rest every night. All x86-64.
          </p>
        </div>

        {/* `items-start` so the shorter Windows card is not padded out to the Linux one's height. */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <Group icon={<WindowsIcon />} title="Windows" subtitle="x86-64" rows={windows} />
          <Group icon={<LinuxIcon />} title="Linux" subtitle="x86-64" rows={linux} />
        </div>

        <div
          className="mt-6 rounded-xl border p-5 flex items-center gap-3"
          style={{ background: "var(--color-surface)", borderColor: "var(--color-border)", opacity: 0.75 }}
        >
          <span style={{ color: "var(--color-muted)" }}>
            <AppleIcon />
          </span>
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--color-foreground)" }}>
              macOS
            </p>
            <p className="text-xs" style={{ color: "var(--color-muted)" }}>
              In progress. Nothing in CI builds it yet and there is no release artifact — the
              download page will list it the day there is one.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
