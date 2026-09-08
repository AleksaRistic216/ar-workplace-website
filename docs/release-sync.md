# Release sync ledger

State for `/release-sync`, which audits the site against what CPT actually ships. Each run reads
this file first, so that a run costs a delta rather than a full re-audit — and so that a change
the user has already rejected is not proposed again next month.

**Last reviewed release:** `v0.2.8` (2026-09-08). `v0.2.9` was still a draft at the time of the
run and does not count as reviewed; its two fixes (#77 keep layout across fullscreen, #78 follow
child processes for cwd) were read anyway and #78 is folded into the Windows quirk copy.

**Site copy last rewritten:** 2026-09-08, by this run. The previous rewrite was 2026-08-29
(`78c1ebf`), which is why twelve user-facing changes had accumulated.

---

## Accepted — applied 2026-09-08

### Wrong today

| Claim | Reality | Fix |
|---|---|---|
| "Split right — `Ctrl+Shift+F`" | `terminal.fullscreen` (`ShortcutManager.cpp:217`) | Row removed; "Fullscreen the pane" added with the right combo |
| "Split below — `Ctrl+Shift+G`" | Unbound. There are no split shortcuts at all | Row removed |
| "Paste image — `Ctrl+V`" | Sends `0x16` to the PTY (`TerminalWidget.cpp:1046`). Nothing reads an image off the clipboard; the Alt+V comment at :1074 is about letting *Copilot CLI* do it | Row removed; Windows quirk card rewritten |
| Hero demo pressed `Ctrl+Shift+F` captioned "Split the pane" | Same as the first row — the hero showed a real key doing the wrong thing | Now `Ctrl+Shift+T`, which does open a second pane |
| "Windows ConPTY throttles large pastes — CPT bypasses this" | `ConPtyTerminal::write` is one plain `WriteFile`. No such mechanism exists | Replaced with the OSC 7 cwd tracking, which is real and newly shipped |
| Git Bash "uses `git/bin/bash.exe`, not the MinTTY wrapper" | Not in the source. The setting is a free-text shell path | Rewritten to match the actual tooltip, incl. `wsl.exe` |
| "Available for Linux, Windows & macOS" | No `.dmg` in v0.2.8; FAQ and download page already said not yet | Qualified in `Hero.tsx`, `CrossPlatform.tsx`, JSON-LD `operatingSystem`, download `metadata.title` |
| Shortcut table listed 10 rows | 25 bindings exist | Regrouped into Terminal / Panes / Views / AI Inventory, all verified against source |

### Missing

| Feature | PR | Landed in |
|---|---|---|
| AI Inventory widget | #60 | New Features card; new Pillar; JSON-LD `featureList` |
| Pin a widget's size and position (`Ctrl+Shift+Alt+P`) | #75 | New "Pinned Panes" Features card; shortcut table; JSON-LD |
| Bug reports filed from the app through `gh` | #65 | FAQ `#faq-bug`, rewritten |
| Shell cwd over OSC 7, incl. child processes | #64, #78 | Windows quirk card |
| AI working spinner on view tabs | #11 | "AI Tool Detection" card |
| In-app uninstall and `uninstall.sh` | #9 | New FAQ `#faq-uninstall` |
| AI inventory group letter shortcuts | #74 | Shortcut table, "AI Inventory" group |
| Numbered / reorderable view tabs | #73 | "Multi-View Workspace" card |

### Positioning

AI promoted from a feature card to a **Pillar** ("Built for AI-assisted work"), replacing the
"PTY-backed / Terminal that just works" pillar, which duplicated the "Full Terminal Emulator"
feature card. The Features grid was reordered so the three AI cards sit together.

Rationale, worth re-reading before undoing it: six of the twelve user-facing changes since the
previous copy rewrite were AI-workspace features. The page was still selling a GPU terminal with
AI bolted on.

## Accepted — applied 2026-09-08, second pass (visual verification)

Prompted by the hero demo's title bar looking out of date. It was, and comparing it to a real
capture found more than the title bar. Captures came from `scripts/capture-product.sh` against
CPT 0.2.9.

| Demo showed | Product does | Source |
|---|---|---|
| `File  View  Widgets  Settings` menus | `Widgets  Settings` only | File and View removed in #6 |
| A status-bar AI badge with a **live token counter** | The badge is an overlay in the top-right of the *pane* running the tool, labelled with the CLI's own title. **No token counter exists anywhere in CPT** | `TerminalWidget::renderAiOverlay`; the only "token" in the codebase is a licence session token |
| Square, flush panes with a 1px gap | Rounded cards with an 8px gutter and margin — on by default | Rounded widget theme, #59 |
| Orange bottom accent on the active view tab | **Red top** accent | `ViewManager.cpp` — "Active: red top accent" |
| No pane tab accent | **Blue top** accent on the active pane tab | `WidgetTabBar.cpp` — "Active: blue top accent" |
| Pane tab titled `you@laptop: ~/src/cpt` | The widget's name, e.g. `Terminal 1`, with a close X, a `+`, and pin and maximise buttons | Pin is #75 |
| Status bar ended at `100%` | `100%` then a live key-state indicator, e.g. `[Ctrl+Shift+T]` | `StatusBar.cpp` |

The token counter also had to come out of the **Features** copy, which claimed "tool name, spinner,
token count", and out of the demo's `aria-label`. The `aria-label` was additionally still narrating
the `Ctrl+Shift+F` split that the first pass had corrected everywhere else — a reminder that the
accessible narration is copy too.

New in this pass: `scripts/capture-product.sh`, `scripts/capture-site.sh`, `scripts/pngcrop.py`,
`scripts/bmp2png.py`, and a mandatory "look at the product" step in `/release-sync`.

## Rejected

_Nothing yet. Record the user's reason here verbatim enough that a later run can tell whether the
objection still holds._

## Deferred

Shipped and user-facing, but judged not to earn page space this round. Listed so they accumulate
rather than being rediscovered from scratch:

| Feature | PR | Why deferred |
|---|---|---|
| Rounded widget theme, on by default | #59 | Visual polish with no copy hook. Matters when the screenshot pipeline is revived — see the Screenshots note in `architecture.md` |
| Maximize/restore button in the widget tab bar | #25 | Implied by "Fullscreen the pane" in the shortcut table |
| Settings → About badges a waiting update | #24 | Supports the updates FAQ but does not need its own answer |
| New terminal in an empty view via the new-terminal shortcut | #7, #8 | Edge-case polish; the shortcut table already says `Ctrl+Shift+T` |
| Diagnostics tracing cwd, commands and focus | #66 | Developer-facing. Note for a future run: **Copy Diagnostics now echoes typed commands verbatim**, so if the site ever tells users to attach diagnostics, it must warn them the report carries what they typed |

## Structural change — 2026-09-08, third pass

The single landing page was split into routes: `/features`, `/cross-platform`, `/pricing`, `/faq`,
with `/` reduced to hero, demo, pillars and a teaser card per page. `/download` unchanged.

What this means for a future audit:

- **A claim now lives on one page, not one anchor.** When checking a claim, `grep` the components
  rather than assuming `page.tsx` renders everything — it renders three components now.
- **The four legacy anchor ids are load-bearing.** `#features`, `#cross-platform`, `#pricing` and
  `#faq` are carried by `SectionTeasers` purely so inbound links to the old single-page site still
  land somewhere sensible. A hash never reaches the server, so this cannot be a redirect. Do not
  "tidy them away".
- **Four components now own an `<h1>`.** `Features`, `CrossPlatform`, `Pricing` and `FAQ` are each
  the whole content of one route. Reusing any of them on another page would put two `h1`s on it.
- Copy fixed in passing: the "Keyboard Navigation" card still advertised "split panes", the last
  survivor of the split-shortcut myth; `public/llms.txt` still claimed a live token count and macOS
  availability, both corrected on the site in earlier passes but not there; and **the pricing card
  sold a "File browser widget"**. `WidgetRegistry.cpp` registers exactly two widget types, Terminal
  and AiInventory — there is no file browser, and it was being listed as something the money buys.
  Check the paid feature list against `WidgetRegistry` every run.

## Notes for the next run

- **Pricing is being changed underneath this.** While the second pass was running, `src/lib/plans.ts`
  appeared and `src/lib/client-api.ts` was rewritten from a one-time perpetual licence to a
  **subscription** (monthly/yearly, `getLicence` replacing `hasLicence`, prepaid periods moving
  `expiresAt` forward). That work is unfinished — the checkout still imports the old export and the
  build fails. None of it was touched by this run.
  When it lands, most of what this ledger recorded about pricing is invalidated: the Hero footnote,
  `#faq-subscription`, `#faq-updates`, `#faq-trial`, the Pricing card, the JSON-LD `offers` block,
  and the "Pricing, and what it actually is" section of `architecture.md`, whose standing rule is
  that subscription language is a bug "unless the backend changed first". The backend is changing
  first. Re-read that section before touching any price copy, and note the grandfathering: the €24
  perpetual licences already sold keep `expiresAt: null` and must never be given a date.

- `v0.2.9` was a draft when this ran. Confirm it published and check nothing else landed with it.
- macOS: the moment a `.dmg` appears in a release, four places need lifting — they are listed in
  the Download page section of `architecture.md`.
- Re-capture the chrome every run. `TerminalDemo.tsx` has no test; it drifts silently and the only
  thing that catches it is looking. `scripts/capture-product.sh two_terminals` is the one to
  compare against.
- The old screenshot pipeline (`screenshots.config.json`, `scripts/update-screenshots.sh`,
  `docs/screenshots.md`) still points at `ar-workspace`, a repo that was renamed. It is unused by
  the site and now superseded by `capture-product.sh`; delete or repoint it.
- The `Ctrl+Shift+T` behaviour is setting-dependent (**Settings → Terminal → New terminal as
  separate widget**, default on). If that default flips, the demo caption and the shortcut table
  note both become wrong.
