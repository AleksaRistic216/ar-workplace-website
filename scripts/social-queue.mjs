#!/usr/bin/env node
/**
 * Turns a release into drafted social posts, queued for a human to approve.
 *
 * CPT ships accepted fixes usually the same day, which is a steady stream of things worth saying
 * and the proof of the 1-day guarantee — and it currently goes nowhere but /changelog. This reads
 * the release repository, writes one draft per platform into marketing/queue/, and stops.
 *
 * It deliberately does not post. Nothing here touches an API that publishes. The queue file is
 * meant to be read, edited and then posted by a person from their own accounts — see
 * marketing/distribution-plan.md §4.
 *
 * Usage:
 *   node scripts/social-queue.mjs                 # the latest stable release
 *   node scripts/social-queue.mjs v0.5.6          # a specific tag
 *   node scripts/social-queue.mjs --last 3        # the last three releases, one file each
 *   node scripts/social-queue.mjs --weekly        # one digest of everything in the last 7 days
 *   node scripts/social-queue.mjs --claude        # hand the drafts to `claude -p` for a rewrite
 *
 * Environment:
 *   GITHUB_TOKEN   optional; lifts GitHub's 60-requests-per-hour anonymous limit
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const QUEUE_DIR = path.join(ROOT, "marketing", "queue");
const REPO = "AleksaRistic216/ar-workspace-release";
const SITE = "https://www.crossplatformterminal.com";

/*
 * Per-platform limits and voice.
 *
 * The limits are hard: a draft that does not fit is a draft someone has to rewrite at posting
 * time, which is exactly the friction this script exists to remove. `trim` is where the length is
 * enforced, and it cuts whole bullets rather than mid-sentence.
 */
const PLATFORMS = [
  {
    id: "x",
    label: "X",
    limit: 280,
    maxItems: 3,
    note: "No hashtags. The first line has to work as the whole post, because most people read nothing else.",
  },
  {
    id: "mastodon",
    label: "Mastodon",
    limit: 500,
    maxItems: 5,
    note: "Technical audience, allergic to marketing voice. Say what changed, link the changelog, stop.",
  },
  {
    id: "bluesky",
    label: "Bluesky",
    limit: 300,
    maxItems: 3,
    note: "Same as X but slightly longer, and links do not eat characters the same way.",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    limit: 1200,
    maxItems: 6,
    note: "The one place a little context about why the fix mattered is welcome. Still no emoji ladders.",
  },
];

function parseArgs(argv) {
  const args = { tag: null, last: 1, weekly: false, claude: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--weekly") args.weekly = true;
    else if (a === "--claude") args.claude = true;
    else if (a === "--last") args.last = Math.max(1, Number(argv[++i]) || 1);
    else if (a.startsWith("v")) args.tag = a;
    else if (a.startsWith("-")) throw new Error(`unknown flag ${a}`);
  }
  return args;
}

async function gh(pathname) {
  const token = process.env.GITHUB_TOKEN;
  const res = await fetch(`https://api.github.com${pathname}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "cpt-social-queue",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    throw new Error(
      `GitHub ${res.status} for ${pathname}` +
        (res.status === 403 && !token ? " — set GITHUB_TOKEN to lift the anonymous rate limit" : "")
    );
  }
  return res.json();
}

/**
 * Parses the notes GitHub generates from conventional commits into flat bullets.
 *
 * Mirrors parseNotes in src/lib/release.ts, including dropping trailing issue references: they
 * point into the *private* development repository, so on a public post they are numbers nobody
 * can look up.
 */
function bullets(body) {
  const out = [];
  let heading = null;

  for (const raw of (body ?? "").split("\n")) {
    const line = raw.trim();
    const h = /^#{2,4}\s+(.*)$/.exec(line);
    if (h) {
      heading = h[1].trim();
      continue;
    }
    const b = /^[-*]\s+(.*)$/.exec(line);
    if (!b) continue;
    const text = b[1].replace(/\s*\((?:#\d+(?:,\s*)?)+\)\s*$/, "").trim();
    if (text) out.push({ heading: heading ?? "Changes", text });
  }
  return out;
}

/** Sentence-cases a conventional-commit subject: "fix: pane focus" -> "Pane focus". */
function humanise(text) {
  const stripped = text.replace(/^(feat|fix|perf|refactor|docs|chore)(\([^)]*\))?:\s*/i, "");
  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}

function isFix(heading) {
  return /fix|bug/i.test(heading);
}

/** Cuts the draft to `limit` by dropping whole bullets from the end, never mid-sentence. */
function trim(lead, items, tail, limit) {
  const kept = [...items];
  const assemble = () => [lead, ...kept.map((i) => `• ${i}`), tail].filter(Boolean).join("\n");
  while (kept.length > 0 && assemble().length > limit) kept.pop();
  const text = assemble();
  return text.length <= limit ? text : `${lead}\n${tail}`.slice(0, limit);
}

function draftFor(platform, release) {
  const changes = bullets(release.body);
  const fixes = changes.filter((c) => isFix(c.heading));
  const features = changes.filter((c) => !isFix(c.heading));
  const version = release.tag_name;
  const link = `${SITE}/changelog`;

  // The lead is the story, and the story is usually the cadence rather than any one bullet.
  const sameDay = fixes.length > 0 && features.length === 0;
  const lead = sameDay
    ? `CPT ${version} — reported and fixed the same day.`
    : features.length > 0
      ? `CPT ${version} is out.`
      : `CPT ${version}.`;

  // Cap before trimming. A release with sixteen bullets fits inside LinkedIn's limit, and posting
  // all sixteen is still worse than posting the six that matter — a changelog dump reads as noise.
  const items = [...features, ...fixes].slice(0, platform.maxItems).map((c) => humanise(c.text));
  const tail = platform.id === "linkedin" ? `Full notes: ${link}` : link;

  return trim(lead, items, tail, platform.limit);
}

function fileFor(release) {
  const date = (release.published_at ?? new Date().toISOString()).slice(0, 10);
  return path.join(QUEUE_DIR, `${date}-${release.tag_name}.md`);
}

function renderQueueFile(release, drafts) {
  const date = (release.published_at ?? new Date().toISOString()).slice(0, 10);
  const lines = [
    `# ${release.tag_name} — social drafts`,
    "",
    `Released ${date}. Notes: ${release.html_url}`,
    "",
    "> Drafts, not posts. Nothing here has been published. Edit freely, then post from your own",
    "> accounts. Delete this file once it is out.",
    "",
  ];

  for (const p of PLATFORMS) {
    const text = drafts[p.id];
    lines.push(`## ${p.label} (${text.length}/${p.limit})`);
    lines.push("");
    lines.push(`*${p.note}*`);
    lines.push("");
    lines.push("```");
    lines.push(text);
    lines.push("```");
    lines.push("");
  }

  lines.push("## Before posting");
  lines.push("");
  lines.push("- [ ] Does the lead line stand on its own? Most people read only that.");
  lines.push("- [ ] Is every claim in it true of the shipped build?");
  lines.push("- [ ] Would you post this if you did not work here?");
  lines.push("");
  return lines.join("\n");
}

/**
 * Optional: hand the drafted file to a local `claude -p` for a rewrite.
 *
 * Kept optional and off by default. The deterministic drafts above are decent, they cost nothing,
 * and they never invent a feature that is not in the release notes — which is the failure mode
 * that matters when the output is going out under your own name.
 */
function polish(markdown) {
  return new Promise((resolve) => {
    const prompt = [
      "Rewrite the drafted posts in this file. Rules:",
      "- Only state things present in the release notes. Invent nothing.",
      "- No hashtags, no emoji, no marketing voice. Developers are reading this.",
      "- Respect each platform's character limit, shown in its heading.",
      "- Keep the fenced blocks and headings exactly where they are.",
      "Return the whole file.",
      "",
      markdown,
    ].join("\n");

    const child = spawn("claude", ["-p", prompt], { shell: true });
    let out = "";
    child.stdout?.on("data", (d) => (out += d));
    child.on("error", () => resolve(null));
    child.on("close", (code) => resolve(code === 0 && out.trim() ? out : null));
  });
}

async function weeklyDigest(releases, sinceDays = 7) {
  const cutoff = Date.now() - sinceDays * 86_400_000;
  const recent = releases.filter((r) => r.published_at && Date.parse(r.published_at) >= cutoff);

  if (recent.length === 0) {
    console.log(`Nothing shipped in the last ${sinceDays} days. No digest written.`);
    return null;
  }

  const all = recent.flatMap((r) => bullets(r.body));
  const fixes = all.filter((c) => isFix(c.heading)).length;

  // "N changes and M fixes" reads as though a fix were not a change, and the non-fix bucket also
  // holds perf and docs commits — so it cannot honestly be called "features" either. Total, then
  // how many of it were fixes.
  const lead =
    `This week in CPT: ${recent.length} release${recent.length === 1 ? "" : "s"}, ` +
    `${all.length} change${all.length === 1 ? "" : "s"}, ${fixes} of them fixes.`;
  const items = all.map((c) => humanise(c.text));

  const drafts = Object.fromEntries(
    PLATFORMS.map((p) => [
      p.id,
      trim(lead, items.slice(0, p.maxItems), `${SITE}/changelog`, p.limit),
    ])
  );

  const file = path.join(QUEUE_DIR, `${new Date().toISOString().slice(0, 10)}-weekly.md`);
  const body = renderQueueFile(
    { tag_name: "weekly digest", published_at: new Date().toISOString(), html_url: `${SITE}/changelog` },
    drafts
  );
  return { file, body };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await mkdir(QUEUE_DIR, { recursive: true });

  const list = await gh(`/repos/${REPO}/releases?per_page=30`);
  const stable = list.filter((r) => !r.prerelease && !r.draft);

  if (stable.length === 0) {
    console.error("No stable releases found.");
    process.exit(1);
  }

  const written = [];

  if (args.weekly) {
    const digest = await weeklyDigest(stable);
    if (digest) {
      await writeFile(digest.file, args.claude ? ((await polish(digest.body)) ?? digest.body) : digest.body);
      written.push(digest.file);
    }
  } else {
    const chosen = args.tag
      ? stable.filter((r) => r.tag_name === args.tag)
      : stable.slice(0, args.last);

    if (chosen.length === 0) {
      console.error(`No stable release tagged ${args.tag}.`);
      process.exit(1);
    }

    for (const release of chosen) {
      const drafts = Object.fromEntries(PLATFORMS.map((p) => [p.id, draftFor(p, release)]));
      const file = fileFor(release);

      // Never clobber something a human has already edited.
      try {
        await readFile(file);
        console.log(`skip  ${path.relative(ROOT, file)} (already queued)`);
        continue;
      } catch {
        /* not queued yet */
      }

      let body = renderQueueFile(release, drafts);
      if (args.claude) body = (await polish(body)) ?? body;

      await writeFile(file, body);
      written.push(file);
    }
  }

  if (written.length === 0) {
    console.log("Nothing new to queue.");
    return;
  }

  console.log("Queued:");
  for (const f of written) console.log(`  ${path.relative(ROOT, f)}`);
  console.log("\nRead them, edit them, then post from your own accounts. Nothing was published.");
}

main().catch((e) => {
  console.error(`social-queue: ${e.message}`);
  process.exit(1);
});
