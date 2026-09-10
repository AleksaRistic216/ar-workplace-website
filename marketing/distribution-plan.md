# CPT distribution plan

Status: 2026-09-10. Owner: Aleksa. Sections 3 to 6 and 8 are built — see
[README.md](README.md) for what to run. What is left is the part only a person can do:
posting, filming, emailing, and the two product decisions in the open questions.

## Scope note

This plan does **not** cover automated comment posting on third-party sites. That approach
is worth skipping on its own merits, not just on principle:

- It breaks the ToS of every venue that matters (Reddit, HN, Stack Overflow, YouTube,
  Discourse forums). The penalty is a **domain-level ban** — once the domain is on a spam
  blocklist, legitimate mentions by real users get auto-removed too. That is not
  recoverable, and it kills the channels below permanently.
- Reddit and HN detect it within hours. A shadowbanned account posts into the void, so the
  traffic never arrives even before anyone notices.
- It reads to Google as an unnatural link scheme, which costs the SEO work in §3 — the part
  of this plan with the longest compounding payoff.
- CPT sells a €7.49/mo crypto-only subscription with no trial. That conversion depends
  entirely on trust. Being caught astroturfing is the fastest way to lose it, and
  developers screenshot and document this stuff.

What follows is the version that gets the same leverage — automation, AI agents, scale —
without wagering the domain. The automation lives on the **drafting, monitoring and
own-channel** side; a human account posts anything that lands in someone else's community.

---

## 1. Positioning

The wedge is not "another terminal". Alacritty, WezTerm, Kitty and Ghostty own that fight
and are free. CPT's defensible claims:

1. **Identical on Windows and Linux.** Same shortcuts, same layout, same behaviour. Nobody
   else credibly serves the dev who is on a Windows laptop and a Linux box daily.
2. **Agent-aware.** Live badges for Claude Code, Copilot, Codex, Gemini, Aider, Cursor,
   opencode and Amp — with real states (idle / working / waiting / finished / failed),
   detected through npx, uv, node and venv shims. This is the timely hook, and no
   mainstream terminal does it.
3. **Detachable sessions without tmux.** Close the app, reopen, shells still running.
4. **1-day bugfix guarantee**, with `/changelog` and its live dates as the proof.

Lead with #2 through 2026. It is the only claim that is both novel and actively searched.

**Known headwinds** — plan around these, don't hide them: paid, crypto-only, no trial, no
free tier, no refunds, no macOS yet. Expect a hostile first comment on every public post.
Prepare a short, non-defensive standard answer for each (§6).

## 2. Channels, in priority order

| # | Channel | Effort | Why |
|---|---------|--------|-----|
| 1 | Comparison / intent pages on own domain | high, one-off | compounds, fully controlled |
| 2 | YouTube demos (own + seeded to reviewers) | high | terminal UX is visual; screenshots undersell GPU rendering |
| 3 | r/commandline, r/programming, r/AI_Agents | medium | where the audience is — **human posting only** |
| 4 | Hacker News Show HN | one shot | exactly one good shot; don't spend it before macOS |
| 5 | Awesome-lists + directory PRs | low | legitimate permanent backlinks |
| 6 | X / Mastodon / Bluesky own accounts | low, recurring | fully automatable, see §4 |
| 7 | dev.to / Hashnode / Lobsters | low | canonical-tagged reposts of own writing |
| 8 | Product Hunt | one shot | after macOS ships, not before |

Deliberately skipped: paid ads (CAC will not clear €7.49/mo), cold DMs, Discord raids.

## 3. SEO — the automatable, compounding part ✅ built

This is where an AI agent earns its keep and nothing is against anyone's rules.

**Programmatic comparison pages.** One page per competitor, real and fair:
`/vs/wezterm`, `/vs/alacritty`, `/vs/kitty`, `/vs/ghostty`, `/vs/windows-terminal`,
`/vs/warp`, `/vs/tabby`, `/vs/hyper`. Each covers platform matrix, GPU rendering, session
persistence, agent integration, config format, price. **State plainly where the competitor
wins.** These pages are read by skeptics; one that only flatters CPT converts worse than
one that concedes Alacritty starts faster and costs nothing.

**Intent pages** for what people actually type:

- "windows terminal alternative that works on linux"
- "how to keep ssh session alive after closing terminal"
- "terminal that shows claude code status"
- "tmux alternative windows"
- "same terminal config on windows and linux"

**Agent pipeline** (runs locally, human reviews before merge):

1. Agent pulls the competitor's current docs/README plus `public/llms.txt`.
2. Drafts the comparison as MDX against a fixed template.
3. Flags every factual claim about a competitor for manual verification. Non-negotiable —
   a wrong claim about WezTerm on your own domain is the thing that gets screenshotted.
4. Opens a PR. You merge.

Refresh quarterly by re-running step 1 and diffing.

**Keep `public/llms.txt` current.** It is already strong. LLM-assisted search is a real
referral channel now and that file is what gets cited. Wire its refresh into the existing
`release-sync` flow so it can't drift.

## 4. Own-channel automation ✅ built

Everything here posts as CPT, on CPT's accounts, about CPT.

- **Changelog → social.** The release repo already feeds `/changelog`. A local script takes
  each release, has an agent draft one post per platform (X, Mastodon, Bluesky, LinkedIn),
  writes them to `marketing/queue/YYYY-MM-DD.md`, and you approve before it posts through
  the official APIs. Given the 1-day bugfix cadence this is a steady stream on its own —
  and "reported today, shipped today" is the proof of the guarantee.
- **Demo clip generation.** `scripts/capture-product.sh` already exists. Extend it to emit
  short loops per feature (agent badges, detach/reattach, edge rails, pinned panes) sized
  for social. Visual proof does the selling here.
- **Weekly digest post** built from the same release data.

## 5. Mention monitoring → human reply ✅ built

The real value in "comment everywhere" is *being present when someone is already looking
for this*. That works without deception.

**Build:** a local watcher polling official APIs and RSS only —

- Reddit search: `tmux windows`, `same terminal windows linux`, `claude code terminal`,
  `wezterm alternative`, `ghostty windows`
- HN Algolia API: same terms
- X / Bluesky search
- GitHub issues and discussions on competitor repos about Windows support

**Flow:** match → agent drafts a reply → **queue for you** → you read the whole thread and
post from your own account. Never auto-post.

**Rules for the human posting:**

- Disclose — "I build CPT" — every time, first line. Required by Reddit and HN, and it
  converts better than pretending.
- Answer the question even when CPT is not the answer. Recommend WezTerm when WezTerm is
  right. That is what makes the account credible enough for the CPT mentions to land.
- Roughly one CPT mention per five unrelated helpful comments per community.
- One account. Never a second one to agree with the first — that specific move is what
  gets a domain blocklisted.
- Skip the thread when the honest reply is "CPT costs money and you asked for free."

Cap it around 15 min/day. The bottleneck is judgment, not volume.

## 6. Objection scripts ✅ written — [objections.md](objections.md)

Write once, reuse verbatim.

- *"Why pay when Alacritty/Ghostty is free?"* — Cross-platform parity and agent
  integration. If you use one OS and don't run AI CLIs, they are the better choice.
- *"Crypto only? Sketchy."* — Fair. Prepaid, no instrument stored, nothing auto-renews;
  the crypto constraint is what makes it prepaid rather than a subscription trap.
- *"No trial?"* — The weakest point. Counter with the changelog, the 1-day guarantee and
  the fully public downloads. **Consider actually shipping a 7-day trial** — this objection
  will otherwise dominate every launch thread, and it is a product fix, not a copy fix.
- *"No macOS?"* — Give a date or say "no date yet". Don't say "soon" twice.

## 7. Sequencing

- **Weeks 1–2** — comparison + intent pages; llms.txt into release-sync; demo clips.
- **Weeks 3–4** — social pipeline; monitoring watcher; objection scripts; awesome-list PRs.
- **Weeks 5–8** — YouTube demo; seed 5–10 terminal / AI-tooling reviewers (personalised,
  individually written, one email, no follow-up).
- **After the macOS and trial decisions** — Show HN and Product Hunt, same week.

## 8. Measurement ✅ written — [measurement.md](measurement.md)

Vercel Analytics is already wired. Track per channel: sessions → `/pricing` → checkout
start → paid. Kill any channel with no paid conversion in 60 days. Expect SEO to show
nothing for ~3 months and then carry the whole thing.

## Open questions

- Trial: yes or no? Blocks the HN launch either way.
- macOS date?
- Are you willing to be the public face (name, face, video), or does CPT stay faceless?
  The former converts substantially better for a paid indie dev tool.
