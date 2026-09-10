Run CPT's marketing work: draft posts, find threads worth replying to, keep the comparison pages
true, and add new ones.

`$ARGUMENTS` picks the mode. With no argument, run **weekly**.

| Mode | What it does |
|---|---|
| `weekly` | The Monday rhythm: mentions, then a digest draft. The default. |
| `release` | Draft social posts for the newest release. |
| `mentions` | Find threads where someone is already asking the question CPT answers. |
| `vs` | Check the comparison pages have not gone stale, and fix what has. |
| `page <thing>` | Add a new `/vs/<competitor>` or `/guides/<topic>` page. |
| `clips` | Rebuild the social clips from real product captures. |

Read `marketing/README.md` first — it indexes the strategy, the playbooks and the tooling.
`marketing/distribution-plan.md` explains why the channels are in the order they are.

## The rule that does not bend

**Nothing in this repo posts anywhere, and you must not be the thing that does.** No script here
writes to Reddit, HN, a forum or a comment box, and you must not add one, invoke one, or paste a
draft into a browser on the user's behalf. You draft; a person posts.

This is not squeamishness. Automated comment posting gets `crossplatformterminal.com` onto spam
blocklists, which retroactively kills the organic mentions *and* the SEO work — the two channels
with the longest payoff. And CPT asks strangers for crypto up front with no trial, which is a sale
that runs entirely on trust. The full reasoning is in the scope note of `distribution-plan.md`.

If the user asks you to post something directly, say what the tooling does instead and hand them
the draft.

## weekly

1. `node scripts/mention-watch.mjs --days 7`
2. Read the queue file it wrote. For each thread, say whether it is worth a reply and why —
   applying `marketing/community-playbook.md`, especially: skip it if the honest answer is another
   tool, and skip it if they asked for something free.
3. `node scripts/social-queue.mjs --weekly`
4. Read the drafts back to the user and offer edits.
5. Once a quarter, also run `vs`.

Keep this short. Twenty minutes of the user's attention is the budget; a long report defeats it.

## release

`node scripts/social-queue.mjs` (add `--last N` for a backlog, `--claude` to have the drafts
rewritten by a local `claude -p`).

Then read the queue file and check the drafts against the release notes yourself. The script only
reformats what GitHub generated — if a bullet is cryptic to someone who does not know the codebase,
rewrite it. **Never add a claim that is not in the release notes.**

If the release is only fixes, lead on the cadence — "reported and fixed the same day" is the proof
of the 1-day guarantee, and it is the most persuasive thing CPT has.

## mentions

`node scripts/mention-watch.mjs --days 7` (`--source hn` to skip Reddit, `--all` to re-show threads
already seen).

Reddit needs `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET` — a free "script" app at
<https://www.reddit.com/prefs/apps>. Without them the Reddit half is skipped and HN still works;
say so once rather than treating it as a failure.

Then triage. For each hit, the useful output is a recommendation, not a summary:

- **Reply** — and draft it. First line discloses "I build CPT". The answer to their question comes
  before any mention of CPT, and if the best answer is WezTerm or tmux, say that.
- **Skip** — and say why in half a line. Most threads are skips.

## vs

`node scripts/vs-refresh.mjs` — checks every cited source still resolves and reports how long since
each entry was verified. `--claude` additionally fetches each competitor's docs and asks what the
page now contradicts.

When something has moved:

1. **Verify it yourself against the competitor's own documentation.** Not from memory, not from the
   model's summary, not from a search snippet. Fetch the page.
2. Edit `src/lib/competitors.ts`, and **bump that entry's `verifiedOn`** to today.
3. `npm test` — the content tests catch a comparison that lost its sources or its concessions.

The note at the top of `src/lib/competitors.ts` is binding. A wrong claim about someone else's
product on CPT's own domain is the failure that costs more than these pages earn.

## page

Adding a comparison (`src/lib/competitors.ts`) or a guide (`src/lib/guides.ts`). Both are data —
the routes and rendering already exist, so a new page is a new array entry and nothing else.

For a **comparison**, in order:

1. Fetch the competitor's own site, README and LICENSE. Every field in the entry comes from there.
2. Fill in `sources` with what you actually read, and set `verifiedOn` to today.
3. Write `wins` — where the competitor genuinely beats CPT — **before** `cptWins`. This is not a
   courtesy: most of these tools are free and excellent, the page is read by people who already
   chose one, and the concession is what buys the rest of the page a hearing. Two entries minimum,
   and the tests enforce it.
4. `verdict` is two sentences naming who should pick which, and it must be usable by someone who
   ends up choosing the competitor.

For a **guide**: it answers the question properly, with the free options first, and only then says
where CPT fits. If CPT is not a good answer to the query, the guide still gets written and still
says so — that page ranks, earns links, and costs nothing but honesty.

Then: add it to `related` on any guide it belongs beside, and run `npm test`. The sitemap and both
index pages enumerate the arrays, so they need no edit.

`AGENTS.md` applies to anything touching the routes: this is Next.js 16, read
`node_modules/next/dist/docs/` before writing Next-specific code.

## clips

`bash scripts/capture-clips.sh --list`, then run it (`--dry-run` to see the ffmpeg commands,
`--no-capture` to reuse `.product-shots/`).

Needs ffmpeg on PATH. It composes clips from real product captures rather than a screen recording,
so what it can show is **before/after between two captured states** — a theme switch, a layout
change. It cannot show continuous motion, and faking that would mean faking the product.

Then open the clips. A clip nobody looked at ships with the wrong frame on screen.

## Constraints

- Never invent a benchmark, a percentage, or a claim about a competitor.
- Never write copy that contradicts `public/llms.txt`, `src/lib/plans.ts` (the only place a price is
  written down), or the shipping platforms. Two claims that are always bugs: that anything renews
  automatically, and that the grandfathered €24 perpetual licences expire.
- The known weak points are paid-only, no trial, no free tier, crypto-only, no macOS yet. Do not
  write copy that dodges them — `marketing/objections.md` has the prepared answers, and leading
  with the concession works better than being caught by it.
- Run `npm test` after touching `src/lib/competitors.ts` or `src/lib/guides.ts`.
- Generated drafts in `marketing/queue/` are the user's to edit. Do not rewrite a queue file the
  user has already edited; `social-queue.mjs` refuses to clobber one, and neither should you.
