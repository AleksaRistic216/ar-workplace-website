#!/usr/bin/env node
/**
 * Finds threads where someone is already asking the question CPT answers, and queues them for a
 * human to reply to.
 *
 * This is the honest version of "comment everywhere". It reads public search APIs, matches against
 * a fixed set of queries, and writes what it found into marketing/queue/. It does not post, it
 * does not hold credentials, and it has no code path that writes to anyone else's site — see
 * marketing/community-playbook.md for the rules the human then follows.
 *
 * Usage:
 *   node scripts/mention-watch.mjs                # last 7 days, all sources
 *   node scripts/mention-watch.mjs --days 2
 *   node scripts/mention-watch.mjs --source hn    # hn | reddit
 *   node scripts/mention-watch.mjs --all          # include threads already seen
 *
 * State: marketing/.mention-seen.json — thread ids already queued, so a daily run only ever shows
 * you what is new. Delete it to start over.
 *
 * Environment:
 *   REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET
 *     Optional but effectively required for the Reddit half. Reddit now answers "403 Blocked" to
 *     anonymous www.reddit.com/*.json from most addresses, and the supported way through is their
 *     API rather than a workaround: create a free "script" app at
 *     https://www.reddit.com/prefs/apps, and export the id and secret. Without them the Reddit
 *     searches are skipped and HN still works.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const QUEUE_DIR = path.join(ROOT, "marketing", "queue");
const SEEN_FILE = path.join(ROOT, "marketing", ".mention-seen.json");
const UA = "cpt-mention-watch/1.0 (+https://www.crossplatformterminal.com)";

/*
 * What to watch for.
 *
 * `angle` is the honest thing CPT has to say about that query — and for several of them the honest
 * thing is "CPT is not the answer here". That is deliberate: the queue is a reading list, not a
 * list of places to drop a link, and knowing in advance that a thread is a bad fit saves the time
 * it would take to read it.
 *
 * `must` is the relevance gate. Both search backends match on *any* of the query's words, which
 * without this turns "wezterm windows" into every thread on HN containing the word "windows". A hit
 * is kept only if its title or body contains at least one term from every group in `must`, so the
 * query reads as (tmux OR multiplexer) AND (windows OR wsl).
 */
const QUERIES = [
  {
    q: "tmux windows alternative",
    must: [["tmux", "multiplexer"], ["windows", "wsl"]],
    angle: "Detachable sessions for *native* Windows shells. If they are happy inside WSL, tmux already works and CPT adds nothing — say so.",
  },
  {
    q: "same terminal config windows linux",
    must: [["terminal", "shell", "dotfile"], ["windows"], ["linux", "wsl"]],
    angle: "The core pitch. Also the thread where recommending dotfile syncing first earns the right to mention CPT at all.",
  },
  {
    q: "keep ssh session alive after closing terminal",
    must: [["ssh", "session"], ["terminal", "shell", "tmux", "screen"]],
    angle: "Usually a remote-host question, and CPT's sessions are local. Answer with tmux/screen and do not mention CPT unless it is a local shell.",
  },
  {
    q: "claude code terminal status",
    must: [["claude code", "copilot cli", "codex", "aider", "opencode"], ["terminal", "pane", "tmux", "status"]],
    angle: "Strongest fit. Per-pane agent badges with five states. Mention that hooks are the free way to do most of this.",
  },
  {
    q: "wezterm windows",
    must: [["wezterm"]],
    angle: "Careful. These people chose WezTerm and it is excellent. Only worth replying if their specific complaint is one CPT fixes.",
  },
  {
    q: "ghostty windows support",
    must: [["ghostty"]],
    angle: "Ghostty publishes no Windows build. Factual, useful, and CPT is a legitimate answer — but lead with the fact, not the product.",
  },
  {
    q: "terminal emulator gpu rendering slow",
    must: [["terminal"], ["gpu", "render", "slow", "latency"]],
    angle: "Usually a prompt or font-fallback problem, not a renderer problem. Diagnose it; mentioning CPT here would be tone-deaf.",
  },
  {
    q: "multiple ai agents terminal panes",
    must: [["agent"], ["terminal", "pane", "tmux", "tab"]],
    angle: "The workflow CPT is built around. Ask what they are running before pitching anything.",
  },
];

/** True when the text satisfies every group in `must` — see the note on QUERIES. */
function relevant(hit, must) {
  const haystack = `${hit.title} ${hit.snippet}`.toLowerCase();
  return must.every((group) => group.some((term) => haystack.includes(term)));
}

/** HN's API returns HTML-escaped comment text; it is unreadable in a queue file otherwise. */
function decodeEntities(text) {
  return text
    .replace(/&#x2F;/gi, "/")
    .replace(/&#x27;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&gt;/gi, ">")
    .replace(/&lt;/gi, "<")
    .replace(/&amp;/gi, "&");
}

function parseArgs(argv) {
  const args = { days: 7, source: "all", all: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--all") args.all = true;
    else if (a === "--days") args.days = Math.max(1, Number(argv[++i]) || 7);
    else if (a === "--source") args.source = argv[++i];
    else throw new Error(`unknown argument ${a}`);
  }
  return args;
}

async function getJson(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

/** Hacker News, via the public Algolia index. No key, no account. */
async function searchHN(query, sinceSeconds) {
  const url =
    "https://hn.algolia.com/api/v1/search_by_date" +
    `?query=${encodeURIComponent(query)}` +
    `&tags=(story,comment)&numericFilters=created_at_i>${sinceSeconds}&hitsPerPage=20`;

  const data = await getJson(url);
  return (data.hits ?? []).map((h) => ({
    source: "HN",
    id: `hn:${h.objectID}`,
    title: h.title || h.story_title || "(comment)",
    snippet: decodeEntities((h.comment_text || h.story_text || "").replace(/<[^>]+>/g, " ")).slice(
      0,
      240
    ),
    url: `https://news.ycombinator.com/item?id=${h.objectID}`,
    at: h.created_at,
    points: h.points ?? null,
  }));
}

/*
 * Reddit, through their API.
 *
 * The token is app-only ("client_credentials"): it authenticates this script, not a user, and it
 * can only read. There is deliberately no code path here that posts, votes or messages — the whole
 * point of this tool is that a person does that part, from their own account.
 *
 * Cached for the process lifetime; a run makes eight searches and Reddit does not want eight token
 * requests to go with them.
 */
let redditToken = null;

async function getRedditToken() {
  const id = process.env.REDDIT_CLIENT_ID;
  const secret = process.env.REDDIT_CLIENT_SECRET;
  if (!id || !secret) return null;
  if (redditToken) return redditToken;

  const res = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": UA,
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) throw new Error(`token request returned ${res.status}`);
  const data = await res.json();
  redditToken = data.access_token;
  return redditToken;
}

/**
 * Reddit search.
 *
 * Uses oauth.reddit.com when credentials are present, and falls back to the public JSON endpoint
 * when they are not. The fallback answers 403 from most addresses these days; that is reported as
 * a source that did not return rather than retried around, because working around a block is the
 * first step towards the kind of scraping this script exists to avoid.
 */
async function searchReddit(query, sinceSeconds) {
  const token = await getRedditToken();
  const qs = `?q=${encodeURIComponent(query)}&sort=new&t=week&limit=25&type=link`;

  const data = token
    ? await fetch(`https://oauth.reddit.com/search${qs}`, {
        headers: { Authorization: `Bearer ${token}`, "User-Agent": UA },
      }).then((r) => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        return r.json();
      })
    : await getJson(`https://www.reddit.com/search.json${qs}`);

  return (data?.data?.children ?? [])
    .map((c) => c.data)
    .filter((d) => d.created_utc >= sinceSeconds)
    .map((d) => ({
      source: `r/${d.subreddit}`,
      id: `reddit:${d.id}`,
      title: d.title,
      snippet: (d.selftext || "").slice(0, 240),
      url: `https://www.reddit.com${d.permalink}`,
      at: new Date(d.created_utc * 1000).toISOString(),
      points: d.score ?? null,
      subreddit: d.subreddit,
    }));
}

async function loadSeen() {
  try {
    return new Set(JSON.parse(await readFile(SEEN_FILE, "utf8")));
  } catch {
    return new Set();
  }
}

function render(groups, args) {
  const total = groups.reduce((n, g) => n + g.hits.length, 0);
  const lines = [
    `# Mentions to look at — ${new Date().toISOString().slice(0, 10)}`,
    "",
    `${total} new thread${total === 1 ? "" : "s"} from the last ${args.days} day${args.days === 1 ? "" : "s"}.`,
    "",
    "> Nothing here has been replied to. These are threads to *read*. The rules before you post:",
    "> disclose that you build CPT in the first line, answer the question even when the answer is",
    "> not CPT, and skip the thread if the honest reply is \"it costs money and you asked for free\".",
    "> Full rules: marketing/community-playbook.md",
    "",
  ];

  for (const g of groups) {
    if (g.hits.length === 0) continue;
    lines.push(`## ${g.query}`);
    lines.push("");
    lines.push(`*Angle: ${g.angle}*`);
    lines.push("");
    for (const h of g.hits) {
      const when = h.at ? h.at.slice(0, 10) : "?";
      const score = h.points == null ? "" : ` · ${h.points} points`;
      lines.push(`- [ ] **${h.source}** ${when}${score} — [${h.title}](${h.url})`);
      if (h.snippet.trim()) {
        lines.push(`      > ${h.snippet.trim().replace(/\s+/g, " ")}`);
      }
    }
    lines.push("");
  }

  lines.push("## Reply checklist");
  lines.push("");
  lines.push("- [ ] First line discloses that you build CPT.");
  lines.push("- [ ] The question is answered even if the answer is another tool.");
  lines.push("- [ ] You have read the whole thread, not just the title.");
  lines.push("- [ ] You are posting from one account, and it has helped in this community before.");
  lines.push("");
  return lines.join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await mkdir(QUEUE_DIR, { recursive: true });

  const sinceSeconds = Math.floor(Date.now() / 1000) - args.days * 86_400;
  const seen = await loadSeen();
  const groups = [];
  const failures = [];

  /*
   * Reddit needs credentials to be useful. Say that once, up front, rather than letting eight
   * identical 403s scroll past and look like the tool is broken.
   */
  const redditEnabled =
    Boolean(process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET) ||
    args.source === "reddit";

  if (!redditEnabled && args.source !== "hn") {
    console.warn(
      "Reddit skipped: no REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET. Create a free script app at\n" +
        "https://www.reddit.com/prefs/apps and export both to include it. Searching HN only.\n"
    );
  }

  for (const { q, angle, must } of QUERIES) {
    const hits = [];

    if (args.source === "all" || args.source === "hn") {
      try {
        hits.push(...(await searchHN(q, sinceSeconds)));
      } catch (e) {
        failures.push(`HN "${q}": ${e.message}`);
      }
    }

    if (redditEnabled && (args.source === "all" || args.source === "reddit")) {
      try {
        hits.push(...(await searchReddit(q, sinceSeconds)));
      } catch (e) {
        failures.push(`Reddit "${q}": ${e.message}`);
      }
    }

    const onTopic = hits.filter((h) => relevant(h, must));
    const fresh = args.all ? onTopic : onTopic.filter((h) => !seen.has(h.id));
    // Loudest first — a thread nobody is reading is not worth 15 minutes of your day.
    fresh.sort((a, b) => (b.points ?? 0) - (a.points ?? 0));
    groups.push({ query: q, angle, hits: fresh });

    // Reddit answers 429 quickly when a run fires eight searches back to back.
    await new Promise((r) => setTimeout(r, 1200));
  }

  const total = groups.reduce((n, g) => n + g.hits.length, 0);

  if (failures.length > 0) {
    console.warn("Some searches did not return:");
    for (const f of failures) console.warn(`  ${f}`);
    console.warn("");
  }

  if (total === 0) {
    console.log("Nothing new. (This is the normal result most days.)");
    return;
  }

  const file = path.join(QUEUE_DIR, `${new Date().toISOString().slice(0, 10)}-mentions.md`);
  await writeFile(file, render(groups, args));

  const ids = groups.flatMap((g) => g.hits.map((h) => h.id));
  await writeFile(SEEN_FILE, JSON.stringify([...new Set([...seen, ...ids])], null, 0));

  console.log(`${total} new thread${total === 1 ? "" : "s"} → ${path.relative(ROOT, file)}`);
  console.log("Read them before replying. Nothing has been posted.");
}

main().catch((e) => {
  console.error(`mention-watch: ${e.message}`);
  process.exit(1);
});
