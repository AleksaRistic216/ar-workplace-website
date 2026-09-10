# marketing/

How CPT gets in front of people, and the tooling for it.

Start with [distribution-plan.md](distribution-plan.md) — it explains why the channels are in the
order they are, and why automated comment posting is not one of them.

## The documents

| File | What it is |
|---|---|
| [distribution-plan.md](distribution-plan.md) | The strategy. Channels, sequencing, open questions. |
| [community-playbook.md](community-playbook.md) | Rules for posting anywhere you do not own. Read before replying to anything. |
| [objections.md](objections.md) | Prepared answers to the seven objections that come up every time. |
| [launch-checklist.md](launch-checklist.md) | Show HN and Product Hunt. Both are one-shot. |
| [outreach.md](outreach.md) | Reviewer emails. Ten of them, written by hand, no follow-ups. |
| [measurement.md](measurement.md) | The one funnel that matters, and what to ignore. |

## The tooling

Everything writes drafts into `marketing/queue/` for a person to read. **Nothing here posts.**
There is no code path in this repo that writes to a social network, a forum or a comment box, and
adding one would undo the reason the rest of it works.

```sh
# Drafts social posts from the latest release
node scripts/social-queue.mjs
node scripts/social-queue.mjs --weekly        # a digest of the last 7 days
node scripts/social-queue.mjs --claude        # rewrite the drafts with a local `claude -p`

# Finds threads where someone is already asking the question CPT answers
node scripts/mention-watch.mjs --days 7
#   Needs REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET for the Reddit half — a free "script"
#   app at https://www.reddit.com/prefs/apps. HN works without any credentials.

# Checks the comparison pages have not gone stale
node scripts/vs-refresh.mjs                   # link rot + age since each entry was verified
node scripts/vs-refresh.mjs --claude          # also ask what the competitor's docs now contradict

# Builds social clips from real product captures (needs ffmpeg)
scripts/capture-clips.sh --list
scripts/capture-clips.sh --dry-run
```

## The pages this produced

Content lives in the site, not here:

- `src/lib/competitors.ts` → `/vs` and `/vs/<slug>` — eight comparison pages. **Every claim about
  another project is checked against that project's own documentation, and cited.** Read the note
  at the top of that file before editing it.
- `src/lib/guides.ts` → `/guides` and `/guides/<slug>` — five intent pages, each of which answers
  the question properly before it mentions CPT.

`npm test` covers both: no broken internal links, no comparison without sources, no comparison that
forgets to say where the competitor wins.

## A weekly rhythm

Monday, about twenty minutes:

1. `node scripts/mention-watch.mjs` — read the threads, reply to the one or two worth replying to.
2. `node scripts/social-queue.mjs --weekly` — edit the draft, post it.
3. Once a quarter: `node scripts/vs-refresh.mjs --claude`, and bump `verifiedOn` for anything
   you re-checked.

## Or just ask

`/marketing` in Claude Code runs the above and knows the rules in these documents.

```
/marketing              # the weekly rhythm
/marketing release      # draft posts for the newest release
/marketing mentions     # find threads worth replying to
/marketing vs           # check the comparison pages have not gone stale
/marketing page ghostty # add a comparison or a guide
/marketing clips        # rebuild the social clips
```

It drafts. It does not post — see `.claude/commands/marketing.md`.
