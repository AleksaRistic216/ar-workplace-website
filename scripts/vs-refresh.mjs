#!/usr/bin/env node
/**
 * Keeps the comparison pages honest.
 *
 * src/lib/competitors.ts states facts about eight other projects. Those projects ship. A claim
 * that was true in September is a claim that gets screenshotted in March, and the cost of being
 * wrong about someone else's product on your own domain is much higher than the page earns.
 *
 * This does two things and refuses to do a third:
 *
 *   1. Checks every cited source URL still resolves. Link rot is the cheap, certain failure, and
 *      a comparison whose citation 404s is worse than one with no citation at all.
 *   2. Reports how stale each entry is against its `verifiedOn` date.
 *   3. With --claude, fetches each source and asks a local `claude -p` which specific claims in
 *      the entry now look wrong.
 *
 * It never edits src/lib/competitors.ts. A model comparing marketing copy to documentation is a
 * good way to find *candidates*; it is not a good way to decide what your site asserts about a
 * competitor. Every change goes through a person.
 *
 * Usage:
 *   node scripts/vs-refresh.mjs                 # link check + staleness report
 *   node scripts/vs-refresh.mjs --claude        # also ask Claude what looks out of date
 *   node scripts/vs-refresh.mjs --slug wezterm  # just one
 *   node scripts/vs-refresh.mjs --stale 90      # only entries older than 90 days (default 90)
 */

import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = path.join(ROOT, "src", "lib", "competitors.ts");
const UA = "cpt-vs-refresh/1.0 (+https://www.crossplatformterminal.com)";

function parseArgs(argv) {
  const args = { claude: false, slug: null, stale: 90 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--claude") args.claude = true;
    else if (a === "--slug") args.slug = argv[++i];
    else if (a === "--stale") args.stale = Number(argv[++i]) || 90;
    else throw new Error(`unknown argument ${a}`);
  }
  return args;
}

/**
 * Reads the competitor entries out of the TypeScript source.
 *
 * Parsed with a regex rather than imported: this is a plain node script in a repo with no TS
 * loader wired up for scripts/, and the shape being read — slug, verifiedOn, and a list of source
 * URLs — is stable enough that a parser would be more machinery than the job needs. If it stops
 * matching, that is a signal the file was restructured and this script should be looked at too.
 */
async function readCompetitors() {
  const src = await readFile(SOURCE, "utf8");
  const entries = [];

  const slugs = [...src.matchAll(/^\s{4}slug: "([^"]+)",$/gm)];

  for (let i = 0; i < slugs.length; i++) {
    const start = slugs[i].index;
    const end = i + 1 < slugs.length ? slugs[i + 1].index : src.length;
    const block = src.slice(start, end);

    const name = /name: "([^"]+)"/.exec(block)?.[1];
    const verifiedOn = /verifiedOn: "([^"]+)"/.exec(block)?.[1];
    const sources = [...block.matchAll(/\{ label: "([^"]+)", url: "([^"]+)" \}/g)].map((m) => ({
      label: m[1],
      url: m[2],
    }));
    // Multi-line source entries, which prettier writes once a line grows past its width.
    const wrapped = [...block.matchAll(/label: "([^"]+)",\s*\n\s*url: "([^"]+)"/g)].map((m) => ({
      label: m[1],
      url: m[2],
    }));

    const all = [...sources, ...wrapped].filter(
      (s, j, arr) => arr.findIndex((o) => o.url === s.url) === j
    );

    entries.push({ slug: slugs[i][1], name, verifiedOn, sources: all, block });
  }

  return entries;
}

async function checkUrl(url) {
  try {
    // HEAD first — some doc hosts reject it, so fall back to a GET we do not read.
    let res = await fetch(url, { method: "HEAD", headers: { "User-Agent": UA }, redirect: "follow" });
    if (res.status === 405 || res.status === 403) {
      res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
    }
    return { ok: res.ok, status: res.status, finalUrl: res.url };
  } catch (e) {
    return { ok: false, status: 0, error: e.message };
  }
}

async function fetchText(url) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) return null;
    const html = await res.text();
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 12_000);
  } catch {
    return null;
  }
}

/** Asks a local `claude -p` which claims look stale. Returns null if the CLI is not installed. */
function askClaude(entry, docs) {
  return new Promise((resolve) => {
    const prompt = [
      `Below is what our website currently claims about ${entry.name}, followed by text fetched`,
      "from that project's own documentation today.",
      "",
      "List ONLY claims that the documentation now contradicts or no longer supports. For each,",
      "quote our claim, quote the contradicting line, and say what it should be. If everything",
      "still checks out, reply with exactly: NO CHANGES.",
      "Do not comment on tone, wording or completeness. Facts only.",
      "",
      "=== OUR CURRENT ENTRY ===",
      entry.block,
      "",
      "=== THEIR DOCUMENTATION TODAY ===",
      docs,
    ].join("\n");

    const child = spawn("claude", ["-p", prompt], { shell: true });
    let out = "";
    child.stdout?.on("data", (d) => (out += d));
    child.on("error", () => resolve(null));
    child.on("close", (code) => resolve(code === 0 && out.trim() ? out.trim() : null));
  });
}

function daysSince(iso) {
  const then = Date.parse(`${iso}T00:00:00Z`);
  if (Number.isNaN(then)) return null;
  return Math.floor((Date.now() - then) / 86_400_000);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const all = await readCompetitors();

  if (all.length === 0) {
    console.error(
      "Parsed no competitors out of src/lib/competitors.ts — the file's shape probably changed.\n" +
        "See readCompetitors() in this script."
    );
    process.exit(1);
  }

  const entries = args.slug ? all.filter((e) => e.slug === args.slug) : all;
  if (entries.length === 0) {
    console.error(`No competitor with slug "${args.slug}".`);
    process.exit(1);
  }

  let broken = 0;
  let stale = 0;

  for (const entry of entries) {
    const age = daysSince(entry.verifiedOn);
    const ageNote = age == null ? "no date" : `${age}d since check`;
    const isStale = age != null && age >= args.stale;
    if (isStale) stale++;

    console.log(`\n${entry.name}  (${entry.slug})  — ${ageNote}${isStale ? "  ⚠ STALE" : ""}`);

    for (const s of entry.sources) {
      const r = await checkUrl(s.url);
      if (!r.ok) {
        broken++;
        console.log(`  ✖ ${s.label}: ${r.status || r.error} — ${s.url}`);
      } else if (r.finalUrl && r.finalUrl !== s.url) {
        console.log(`  → ${s.label}: redirects to ${r.finalUrl}`);
      } else {
        console.log(`  ✓ ${s.label}`);
      }
    }

    if (args.claude) {
      const docs = (await Promise.all(entry.sources.map((s) => fetchText(s.url))))
        .filter(Boolean)
        .join("\n\n---\n\n");

      if (!docs) {
        console.log("  (no source text could be fetched, skipping the review)");
        continue;
      }

      const verdict = await askClaude(entry, docs);
      if (verdict == null) {
        console.log("  (claude CLI not available — run without --claude, or install it)");
        args.claude = false;
      } else if (/^NO CHANGES\.?$/im.test(verdict.trim())) {
        console.log("  ✓ Claude found nothing contradicted.");
      } else {
        console.log("  ⚠ Claude flagged:");
        for (const line of verdict.split("\n")) console.log(`    ${line}`);
      }
    }
  }

  console.log(
    `\n${entries.length} checked · ${broken} broken link${broken === 1 ? "" : "s"} · ` +
      `${stale} entr${stale === 1 ? "y" : "ies"} older than ${args.stale} days`
  );
  console.log(
    "Nothing was edited. Update src/lib/competitors.ts by hand, and bump verifiedOn when you do."
  );

  if (broken > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(`vs-refresh: ${e.message}`);
  process.exit(1);
});
