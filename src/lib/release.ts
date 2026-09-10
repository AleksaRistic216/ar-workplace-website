/**
 * Latest release metadata, fetched on the server and cached.
 *
 * This used to run in the browser on every visit. GitHub allows 60 unauthenticated calls per hour
 * per IP, so anyone behind a shared address — an office, a VPN, a university — could arrive at the
 * download page and be told the release info could not be fetched. Fetching once per revalidation
 * window from the server means one call for all visitors, and `GITHUB_TOKEN` lifts the limit
 * further if it is set.
 */

const REPO = "AleksaRistic216/ar-workspace-release";

export const RELEASES_URL = `https://github.com/${REPO}/releases`;
export const ISSUES_URL = `https://github.com/${REPO}/issues`;

/** Ten minutes: releases are rare, and a stale version string is worse than a slightly old one. */
export const RELEASE_REVALIDATE_SECONDS = 600;

export type ReleaseAsset = { name: string; url: string; size: number };

export type Release = {
  version: string;
  publishedAt: string | null;
  notesUrl: string;
  linuxAppImage: ReleaseAsset | null;
  linuxTarGz: ReleaseAsset | null;
  windows: ReleaseAsset | null;
};

type GitHubAsset = { name: string; browser_download_url: string; size: number };

function pick(assets: GitHubAsset[], matches: (name: string) => boolean): ReleaseAsset | null {
  const found = assets.find((a) => matches(a.name));
  return found ? { name: found.name, url: found.browser_download_url, size: found.size } : null;
}

export function formatSize(bytes: number): string {
  const mb = bytes / 1024 / 1024;
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(1)} MB`;
}

/** One release as the changelog shows it: when it shipped, and what was in it. */
export type ReleaseNote = {
  version: string;
  publishedAt: string | null;
  notesUrl: string;
  /** Sections of the generated notes, in the order GitHub wrote them. */
  sections: { heading: string; items: string[] }[];
};

type GitHubRelease = {
  tag_name: string;
  published_at: string | null;
  html_url: string;
  body?: string | null;
  prerelease?: boolean;
  draft?: boolean;
  assets?: GitHubAsset[];
};

/**
 * Parses the release notes GitHub generates from conventional commits: `### Features` and
 * `### Bug Fixes` headings over `- ` bullets.
 *
 * Trailing issue references are dropped. They point into the *private* development repository,
 * so on this site they would be numbers a visitor can neither click nor look up.
 */
function parseNotes(body: string | null | undefined): ReleaseNote["sections"] {
  if (!body) return [];

  const sections: ReleaseNote["sections"] = [];
  let current: { heading: string; items: string[] } | null = null;

  for (const raw of body.split("\n")) {
    const line = raw.trim();

    const heading = /^#{2,4}\s+(.*)$/.exec(line);
    if (heading) {
      current = { heading: heading[1].trim(), items: [] };
      sections.push(current);
      continue;
    }

    const bullet = /^[-*]\s+(.*)$/.exec(line);
    if (bullet && current) {
      const text = bullet[1].replace(/\s*\((?:#\d+(?:,\s*)?)+\)\s*$/, "").trim();
      if (text) current.items.push(text);
    }
  }

  return sections.filter((s) => s.items.length > 0);
}

/**
 * The most recent *stable* releases, newest first.
 *
 * Pre-releases (`-dev.N`) are dropped: they are the author's own staging builds, they are not
 * what the download page serves, and listing them would make the cadence look busier than the
 * thing a buyer actually receives.
 */
export async function getReleases(limit = 10): Promise<ReleaseNote[]> {
  const token = process.env.GITHUB_TOKEN;

  try {
    // Over-fetch: prereleases are interleaved with stable ones and are filtered out below.
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=${limit * 3}`, {
      headers: {
        Accept: "application/vnd.github+json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      next: { revalidate: RELEASE_REVALIDATE_SECONDS },
    });

    if (!res.ok) {
      console.error(`[release] GitHub returned ${res.status} listing releases`);
      return [];
    }

    const data: GitHubRelease[] = await res.json();

    return data
      .filter((r) => !r.prerelease && !r.draft)
      .slice(0, limit)
      .map((r) => ({
        version: r.tag_name,
        publishedAt: r.published_at ?? null,
        notesUrl: r.html_url ?? RELEASES_URL,
        sections: parseNotes(r.body),
      }));
  } catch (e) {
    console.error("[release] Listing failed:", e);
    return [];
  }
}

/** "3 hours ago", "yesterday", "6 days ago" — the point is the cadence, so keep it coarse. */
export function relativeTime(iso: string | null, now: Date = new Date()): string | null {
  if (!iso) return null;
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return null;

  const mins = Math.round((now.getTime() - then.getTime()) / 60000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins} minutes ago`;

  const hours = Math.round(mins / 60);
  if (hours < 24) return hours === 1 ? "an hour ago" : `${hours} hours ago`;

  const days = Math.round(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;

  const months = Math.round(days / 30);
  return months <= 1 ? "last month" : `${months} months ago`;
}

/** e.g. "10 September 2026". Absolute, so a cached relative time can never mislead on its own. */
export function formatReleaseDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Returns null on any failure — the page falls back to a plain link to the releases index. */
export async function getLatestRelease(): Promise<Release | null> {
  const token = process.env.GITHUB_TOKEN;

  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: {
        Accept: "application/vnd.github+json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      next: { revalidate: RELEASE_REVALIDATE_SECONDS },
    });

    if (!res.ok) {
      console.error(`[release] GitHub returned ${res.status}`);
      return null;
    }

    const data = await res.json();
    const assets: GitHubAsset[] = data.assets ?? [];

    return {
      version: data.tag_name,
      publishedAt: data.published_at ?? null,
      notesUrl: data.html_url ?? RELEASES_URL,
      // The AppImage ships *inside* a tarball (cpt-vX-linux-x86_64-appimage.tar.gz), so matching
      // on `.AppImage` never hit — and because that tarball sorts first in the release, the plain
      // `.tar.gz` matcher claimed it, leaving the AppImage button dead and the tar.gz button
      // serving the AppImage build. Match on the name marker, and exclude it from the plain one.
      linuxAppImage: pick(assets, (n) => /appimage/i.test(n)),
      linuxTarGz: pick(assets, (n) => n.endsWith(".tar.gz") && !/appimage/i.test(n)),
      windows: pick(assets, (n) => n.endsWith(".zip")),
    };
  } catch (e) {
    console.error("[release] Fetch failed:", e);
    return null;
  }
}
