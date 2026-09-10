# Release sync ledger

State for `/release-sync`, which audits the site against what CPT actually ships. Each run reads
this file first, so that a run costs a delta rather than a full re-audit — and so that a change
the user has already rejected is not proposed again next month.

**Last reviewed release:** `v0.5.6` (2026-09-10).

**Site copy last rewritten:** 2026-09-10, by that run. Previous rewrites: 2026-09-08 (five
passes, recorded below) and 2026-08-29 (`78c1ebf`).

The 2026-09-08 entries below are kept because they record *why* copy reads as it does, and two of
their conclusions have since been reversed by the product — see the 2026-09-10 section. Read that
one first; the older passes are history, not current state.

---

## Accepted — applied 2026-09-10 (v0.2.9 → v0.5.6)

Eighteen user-facing PRs (#95–#129) had accumulated across five minor versions. Dropped as not
user-facing: #98, #100, #103, #105, #106, #116, #117, #126.

### Wrong today

| Claim | Reality | Fix |
|---|---|---|
| Windows cwd "follows it through child processes" (`CrossPlatform.tsx`) | **#102 removed exactly that.** `ProcessChain.cpp::deepestShellIndex` stops the descent at the first non-shell. Following all descendants *was* the bug: a helper spawned by an AI CLI became "the shell's cwd", the directory flipped between the repo and `C:\Windows` every few seconds, and the AI Inventory re-scanned on every flip | Rewritten to "follows the chain only through shells", naming the launcher hop it preserves and the helper it now ignores |
| "PowerShell is instrumented for directory reporting out of the box" | #113 added a `Bash` family to `ShellIntegration.cpp`. Git/MSYS bash on Windows gets the same `--rcfile` hook reporting `pwd -W` | "PowerShell and Git bash are both instrumented" |
| Hero demo's title bar had no View menu, and a comment asserted the menu bar "is exactly these two" | **#114 brought View back** — not as a third left menu but a right-anchored pill with a chevron, left of the window buttons, holding Redistribute Layout and Auto Layout Mode (`TitleBar.cpp:181`) | Pill added to `TerminalDemo.tsx`; the stale comment rewritten to explain *why* it is on the right |
| FAQ: "Settings → About → Uninstall" | `TitleBar.cpp:448` — `Uninstall...` is a **top-level Settings item**, below About. It calls `AboutWindow::openUninstall()`, which is where the wrong path came from | "Settings → Uninstall…" |
| Tab spinner described as AI-only (Features, Pillars, `llms.txt`) | #111 moved it to the foreground process — `cmake --build`, `npm install`, a long `rsync` all spin the tab, with a 700ms debounce | Rescoped to "any long command", AI kept as the special case |
| Pinned Panes card sold "the narrow **file tree** or log pane" | `WidgetRegistry` registers exactly two widget types, Terminal and AiInventory. **There is no file tree.** Same class of error as the "File browser widget" caught in the third pass on 2026-09-08 | "the narrow inventory panel or the log you are tailing" |

### Missing

| Feature | PR | Landed in |
|---|---|---|
| Edge rails — auto-hiding docks on the left, right and bottom edges | #119 | New "Docks on Every Edge" Features card; shortcut table group; JSON-LD; `llms.txt` |
| Agent states: Idle / Working / **AwaitingInput** / Finished / Error, found through `npx`, `uv`, `node` and venv shims | #129 | "AI Tool Detection" card rewritten; AI Pillar; JSON-LD; `llms.txt` |
| Dark and light themes, Settings → Appearance | #128 | New "Dark and Light" Features card; JSON-LD; `llms.txt` |
| Ctrl+C actually interrupts on Windows | #120 | New Windows quirk card |
| Shift+Enter inserts a newline instead of submitting (CSI u) | #109 | "AI Workflow Pipeline" card |
| Numbered focus: `Ctrl+Alt+1…9` panes, `Ctrl+Shift+Alt+1…9` rails, `Tab`/`` ` `` to cycle | #127 | Shortcut table — new "Edge rails" group, and a Panes row |
| Close-confirm dialog answers `K` / `E` / `Esc` | #121 | Shortcut table, Terminal group |

Also fixed in passing: **"Multi-View Workspace" and "Native Performance" both claimed inactive
views drop to near-zero resource usage.** The duplicate was removed from Multi-View, which now
carries the layout story only.

### Positioning

**Raised, deliberately not acted on.** Edge rails, numbered slot focus, auto-layout modes and a
theme system are four IDE-shaped changes in one span. If the next run brings more of the same,
"a terminal with a workspace around it" stops being the right frame and the Pillars should move.
The AI pillar was promoted only one run ago (2026-09-08) and the ledger's own rule is to raise
positioning at most every few runs — so this is evidence banked, not a change.

### What this run got wrong

Recorded because the command was changed as a result, and a future run should know what the old
one permitted.

The run fixed prose and added feature cards, and **left the hero demo at the same three clips**
built for the 0.2.x product. Everything it did to the demo was per-element correctness — one
missing View pill. Nobody asked whether the *set* of clips still represented CPT, so the answer
("no — the newest thing a visitor can see shipped in #60/#75, months before this delta") never got
written down. Adding an edge-rails feature card made edge rails stop counting as "missing", which
is precisely how the gap closed over without being filled.

`/release-sync` now has an **Unshown** tier and a step that audits the clip roster as a portfolio.
The findings below were raised by re-reading the run under the new command, and are outstanding.

---

## Demo rebuilt — 2026-09-10, sixth pass

Prompted by "a lot of new things and a new look, and the same demos looking outdated". Both halves
were true. Everything below was checked against captures of the **shipped v0.5.6 binary**.

### Chrome brought up to #128

| Was | Now |
|---|---|
| Title bar started at `Widgets` | A four-square **app mark** first — `#34D399 / #60A5FA / #A78BFA / #FBBF24`, sampled from the capture |
| `Views: 1 \| Active: Main \| Widgets: 2` | `● Main · 2 widgets · 1 view` — dot `#64A5EB`, view name bright, counts muted, pluralised |
| `100%` plus an always-present `[…]` | `100% ▾`, and the key readout is a pill **drawn only while a key is held** |

### The AI badge was wrong in kind, not just in detail

It was orange "for Claude", with a comment saying orange for Claude and blue for Copilot. The
product's own source says the opposite in as many words: *"Colour says the state, not the
vendor."* `renderAiOverlay` picks blue for working, amber for AwaitingInput, green for Finished,
red for Error, and **rewords the label** for the last three — `"<Name> needs you"`,
`"<Name> finished"`, `"<Name> failed"`. Those exact strings and colours are now in
`AGENT_BADGE` in `demo-session.ts`, and the AI clip ends on the amber *"Claude Code needs you"*.

This is the third instance of the same failure: a real feature, an invented rendering. Check the
draw call, not the feature list.

### New clip: Docks

Edge rails (#119) were the outstanding **Unshown** item and now have a clip. Built from a capture,
not the PR body — there is no edge-rails scenario in the CPT repo, so one was written
(`edge_rails.sh`, a `layout.json` with an `edgeRails` section per `EdgeRailState.h`) and run
against the release binary.

What that capture settled, none of which was guessable:

- The **left rail is a ~20px strip of icon buttons**; its dock opens beside it with a header
  carrying the widget name, an auto-hide pin and a close ×.
- The **bottom band spans the full width and the left rail is inset above it** — so the view tab
  strip starts to the *right* of an open left dock, which is why the demo's frame had to be
  restructured rather than just having rails bolted on.
- A **horizontal rail button shows an icon and the widget's name; a vertical one has room for
  only the icon.**
- An empty rail takes no space, so the other three clips are unaffected and correctly show none.

**The clip was then rebuilt again, because the first version still broke the causality rule.**
It seeded widgets already sitting on rails and only showed the dock being *opened* — so how a
widget got onto an edge in the first place was never shown, which is the interesting half.

It now opens on a plain two-pane view with **no rails at all**, and the widget is dragged out of
the view onto the left rail:

- The drag handle is the **widget's tab** — `WidgetTabBar.cpp:204` makes it a drag source handing
  the rails the same payload a rail button does, so "drag it from the view" is literally what the
  product supports.
- While the drag is in flight **all three rails appear**, including the empty ones and including
  the right rail the demo never docks onto (`EdgeRailManager.cpp:386`). The demo draws all three
  for exactly the duration of the drag.
- The hovered strip paints in **accent at ~25% with an accent border** — the whole strip, not a
  button, because an empty rail has no button to aim at (`EdgeRailManager.cpp:821`). `data-ptr`
  therefore sits on the strip, not the button.
- On drop the widget **leaves the view**: the status bar goes from `2 widgets` to `1 widget`,
  which is the proof it moved rather than being copied.

Then it collapses the dock by its rail button and brings it back with `Ctrl+Shift+Alt+1`.

New player machinery for this: `drag` / `dragover` / `drop` ops, a `drag` field in the session, a
payload chip that follows the cursor, and the dragged pane dimming to 0.45. `frameOf` clears
`drag` alongside `pointer`/`menu`/`keys`, so a still frame never shows a half-finished drag.

Still not shown: dragging a widget *back* off a rail into the view, which the product also
supports in that direction.

### Also

`aria-label` was still narrating the old single-reel demo. It is now derived from the active
clip's own label and blurb, so it cannot drift again.

---

## Pillars replaced by Supported platforms — 2026-09-10, at the user's direction

**`Pillars` was deleted.** Once the hero carried the four claims outright, the "Why CPT" section
was restating them a second time on the same screen — the user's word was "redundant", and it
was. Nothing was lost: GPU-accelerated and terminal-first are hero claims, AI moved to the
`Agents` section, quirks live on `/cross-platform`, and "ideas land fast" is now the release
strip. `src/components/Pillars.tsx` is gone rather than left unimported.

In its place, a full-width **`Platforms`** section listing every supported OS *with how it is
tested*, which is the same evidence-over-assertion move as the release strip: "gates every PR" is
checkable in a way that "supported" is not.

Source of truth is the **"Supported platforms" table in `docs/testing.md`** in the CPT repo, plus
the glibc note beneath it. Two facts there constrain the copy and are easy to get wrong:

| Fact | Consequence for the site |
|---|---|
| **`x86-64` only**, both OSes | Never imply ARM. Stated in the section's lede |
| **Debian 12 cannot run the published binaries.** The releases are built on Ubuntu 24.04 and carry glibc 2.39; bookworm has 2.36 and fails with `GLIBC_2.39 not found`. It gates every PR as a *source* build only | Listed, but with an explicit "build from source" note. Listing it unqualified would send a buyer to a download that cannot start |

The rest, verbatim from that table: Ubuntu 24.04 LTS (gates PRs, builds the releases), Ubuntu
26.04 LTS, Debian 13 trixie, Fedora 43 & 44, Arch rolling + a pinned archive snapshot, Windows
Server 2025 (gates PRs), and **Windows 11 / 10 by manual pre-release QA** — GitHub publishes no
x86-64 Windows client runner, so nothing in CI can launch the app on one. Windows 10 is the
declared floor (`_WIN32_WINNT=0x0A00`, `CMakeLists.txt:166`, which covers 10 and 11 alike).

Distribution marks are tinted monograms, same trademark reasoning as the agent list.

**Check this section against `docs/testing.md` every run** — it is a table in another repo that
changes when the matrix changes, and nothing here will notice on its own.

### Issues filed against the product, from this audit

The Debian 12 caveat is a product gap the website merely has to describe. Three issues were
opened on `AleksaRistic216/cross-platform-terminal`, in dependency order:

| Issue | What |
|---|---|
| [#53](https://github.com/AleksaRistic216/cross-platform-terminal/issues/53) | Build the Linux release artifacts against the oldest supported glibc, so the shipped floor matches the source floor. **Closing this deletes the "build from source" caveat from the site.** |
| [#54](https://github.com/AleksaRistic216/cross-platform-terminal/issues/54) | Smoke-run the *shipped* artifacts per distro at release time — today every row compiles from source and nothing runs what a customer downloads |
| [#55](https://github.com/AleksaRistic216/cross-platform-terminal/issues/55) | Widen the supported distro set (Ubuntu 22.04 LTS, Rocky/Alma 9, openSUSE Leap). Blocked on #53: adding rows first would only create more "compiles but the download will not start" distros |

`#53` and `#54` were both anticipated by the closing note of the already-closed `#8`.

**Watch #53.** When it lands, the Supported platforms section loses its only asterisk and
`docs/testing.md`'s two glibc numbers become one.

---

## Agents listed, and the cadence evidenced — 2026-09-10, at the user's direction

### Agents

The site named two agent CLIs; the product knows **eight**. `kRules` in
`src/terminal/AgentCatalog.cpp` is the table — one row per agent, in priority order, and the
labels on the site are copied from it verbatim (including `opencode`, lower-case there):

Claude Code · GitHub Copilot · Codex CLI · Gemini CLI · Aider · Cursor Agent · opencode · Amp

New `Agents.tsx` section on `/`, plus corrected copy in the AI Pillar, the "AI Tool Detection"
card and `llms.txt`. **Check this list against `kRules` every run** — adding an agent in the
product is adding a row, so the site falls behind silently.

Icons are **tinted monograms, not brand logos**. These are other companies' trademarks and there
are no licensed assets here; an approximated logo would be worse than an honest initial. Swap in
real marks only if properly licensed ones turn up.

### Cadence, evidenced rather than asserted

The "1 day" pillar had always been a bare assertion. It is now backed by real data:

- **`/changelog`** — a new route listing releases with dates and parsed notes, fetched from the
  release repo (`getReleases`), ISR at 600s like `/download`. Pre-releases (`-dev.N`) are filtered
  out: they are staging builds and are not what the download page serves.
- **`ReleaseStrip`** on `/` — the last five releases with relative times and change counts. This
  makes `/` an ISR route rather than a static one.
- Both render **absolute dates as well as relative ones**, so a cached page can never imply
  something shipped more recently than it did.
- The pillar was softened from "we will have it implemented within a day" to "usually shipped the
  same day". An over-promise would now be contradicted by real dates further down the same page.

Release notes turned out to be **full generated changelogs** (`### Features` / `### Bug Fixes`
over bullets), not the one-liners this ledger previously recorded. Trailing `(#N)` refs are
stripped for display because they point into the private development repo.

**Known wart, and it belongs upstream:** the generated notes mix CI work into "Bug Fixes" — five
of v0.5.6's eleven entries are Arch-snapshot and CI-pinning commits, which a buyer should never
see. The site deliberately does **not** filter these: any heuristic here would eventually hide a
real fix. The fix is in the release-notes generation in the CPT repo (exclude `ci:`/`chore:`
scopes). Until then the changelog carries some noise.

---

## Positioning written down, and the hero reworked — 2026-09-10, at the user's direction

The four selling points are now stated canonically under **"What CPT is selling"** in
`docs/architecture.md`, and the hero renders them in that order:

1. **The same behaviour on every platform** — with the shipping table (Linux AppImage + tar.gz,
   Windows zip, **`x86_64` only on both**, macOS in progress) and the sub-platforms that actually
   test "identical": PowerShell, `pwsh`, cmd, Git bash and WSL on Windows; `$SHELL` on Linux.
2. **Terminal first, AI second** — an explicit ordering, recorded as such because the AI feature
   set has been growing fast enough to erode it a card at a time.
3. **Detached daemons.**
4. **GPU-accelerated.**

`/release-sync`'s Positioning tier now points at that section instead of re-deriving the pitch.

### Hero changes

- `One workspace.` → **`One terminal.`** The headline was the first place the terminal-first
  ordering was being lost.
- The lede now names all four claims in one sentence, and a 2×2 grid states them.
- **The Subscribe and Download buttons are gone**, as are the price and the "CPT needs a
  subscription to run" line that sat under them.

A fifth tile, **"The same keys, everywhere"**, was added on request. The positioning is still
*four* selling points — the keyboard is the sharp end of claim 1, not a new claim — but it is
what a buyer actually feels when they switch machines, so the hero states it separately:
`Ctrl+Shift+C` / `Ctrl+Shift+V` on both platforms rather than a Windows special case, every
action bound and rebindable, and `Alt+key` passing through to the shell so an agent CLI keeps its
own. All verified against `registerAllDefaults()` earlier in this run.

**Consequence worth knowing before undoing it:** the home page now has *no* call to action above
the fold except the nav's Download button, and the first screen no longer discloses that CPT is
paid at all. Price is still on the Pricing teaser card further down, `/pricing`, and the FAQ. This
was asked for deliberately — the hero's job is now to say what CPT is. If conversion matters more
than clarity later, the thing to restore is one line, not the buttons.

`UpdateFootnote` is still used by `Pricing.tsx`, so removing it from the hero orphaned nothing.

---

## Demo: the Detached clip — 2026-09-10, seventh pass

Detachable sessions were written up in copy but never shown. They now have a clip, and it is the
first one that opens a **modal**.

Everything in it came from a capture of the real dialog, which took some setting up and is worth
recording because the same trick works for any daemon-dependent screen:

1. Write `persistentSessions: true` into a screenshot profile's `terminal.json`.
2. Run `cpt --profile <p> --screenshot` once. The daemon spawns, takes the shells, and the app
   exits — **the daemon survives, which is the whole point of the feature**.
3. Run again with `--show-sessions --screenshot`. The dialog comes up over the reattached
   sessions.

Saved as `sessions_window.sh` alongside `edge_rails.sh` in the scratch scenario set.

### What the capture settled

- Columns are **Session · Shell · Directory · Age · State**, then per-row `Open` and `End`.
- `Open` is **disabled for a row already on screen** — attaching twice would give two panes
  fighting over one grid size — so reattaching flips the row to `open here` and greys its button.
  The demo reproduces that.
- The four State values are `open here`, `detached`, `elsewhere`, `exited`. The demo shows the
  first two; `detached` is tinted accent because it is the one the clip is about.
- Footer, verbatim: *"Sessions keep running when the app closes. \"Open\" shows one in a new
  terminal; \"End\" stops its shell."*
- Age is coarse — `4m`, `3h`, `2d` (`ageText`).

The clip opens the Settings menu to get there, so the modal has a cause on screen like every
other result. That needed the title-bar menus reworked: each menu now owns its own dropdown so
the panel opens under the label that was clicked, and `SETTINGS_MENU` carries the real items and
separator positions from `TitleBar.cpp`. Previously one absolutely-positioned panel was pinned to
the left edge, which only worked while Widgets was the sole menu that opened.

### Extended to the whole flow — same day

The first version opened on a session that was *already* detached and never showed the widget
close flow at all. Both gaps were called out, and the clip now runs the sequence end to end:

1. **Settings → Widgets**, tick **"Keep shells running when the app closes"**, close the window.
2. `Ctrl+Shift+T`, then a watcher started in the new pane. The order matters and is not
   decoration — the setting's own tooltip says *"Changes apply to new terminals only"*, so a
   terminal opened before the tick would not be daemon-backed.
3. Close that pane by its **×**, which now raises the question instead of killing it.
4. **Keep running** → the pane goes, the shell does not.
5. **Settings → Terminal Sessions** → the row is there, `detached`. **Open** → the watcher comes
   back mid-run. Close the modal.

**Why the close question can only appear after step 1**, which is what makes the clip honest
rather than a sequence of screens: `runningSessionWork()` passes `m_sessionId != 0` into
`terminalCloseWork`, so CPT only asks about a **daemon-backed** session with something in the
foreground. With persistent sessions off, closing a pane just closes it. Turning the setting on
is what creates something worth keeping.

The dialog is verbatim from `TerminalWidget::renderCloseConfirm`: title `Close <widget>?`, the
line `'<process>' is still running in this terminal.`, the paragraph explaining that keeping it
closes the pane only, and three buttons — **Keep running (K)** as the *primary*, **End session
(E)** as the *destructive* one, and **Cancel (Esc)**. The demo mirrors that emphasis; the key
hints come from `closeConfirmLabel`, which reads the live binding, which is why they match the
shortcut table on `/cross-platform`.

The Settings window was drawn from the `settings_terminal` capture: the sidebar tree
(Appearance / Terminal › Settings, Shortcuts / AI Inventory › Shortcuts) beside a section pane
of blue ticked checkboxes. Only the Terminal section is shown, with the two checkboxes that
bracket the target one in `SettingsWindow.cpp`.

The session row is no longer a fixture: it is **created by the close**, so the list starts empty
and what appears in it is the consequence of what the clip just did.

**One caveat left in place deliberately:** the clip does not show the app being closed and
reopened, which is the literal act of detaching. A hero clip cannot mime quitting without
pretending. It shows the consequence instead — a shell that outlived its pane.

---

## Detachable shells — added 2026-09-10, at the user's direction

The session daemon (#83, with #95 and #101 on top) had been **deferred** by this run's first pass
on the grounds that "the copy would be inventing the pitch". That was wrong, and the mistake is
worth recording: `docs/session-daemon.md` in the CPT repo and the body of #83 both state the
user-facing promise in one sentence — *"closing and reopening the app reattaches to them with
their history and any long-running command still going"*. The deferral was made from the commit
subjects without opening either. **A feature is not un-pitchable until you have read its doc.**

Landed as a Features card ("Shells That Outlive the Window"), a `llms.txt` bullet, and a JSON-LD
`featureList` entry.

### The facts, and the one that constrains the copy

| Fact | Source |
|---|---|
| **Off by default** — `m_persistentSessions = false` | `TerminalSettings.cpp:87` |
| The setting's own label is *"Keep shells running when the app closes"* | `SettingsWindow.cpp:325` — the site quotes it verbatim, so a rename shows up as a mismatch |
| Shells move into a background daemon: `cpt --daemon`, **the same binary**, not a second executable | `docs/session-daemon.md` |
| **Closing a terminal still ends its shell.** Only closing the *app* detaches | #83 — `detach()` beside `close()` |
| Falls back to an in-process PTY whenever the daemon cannot be reached | #83 |
| Local machine only, and one daemon **per profile**, so worktrees cannot see each other's sessions | `docs/session-daemon.md` |
| Listed in Settings → Terminal Sessions (also `--show-sessions`); `cpt session ls\|attach\|kill` from a shell | `SessionCli.cpp:451-461` |

**The default-off is the standing hazard.** Every sentence on the site is written as opt-in and
leads with the setting. If a future run is tempted to shorten that to "your shells survive", check
`TerminalSettings.cpp` first — the day that default flips, the copy can be simplified, and until
then flat phrasing is a correctness bug.

Not demoed: detaching means closing the app, which a hero clip cannot show without pretending to
quit. Left out deliberately rather than faked.

**Open question for the next run:** this may deserve a **Pillar** rather than a card. "Your work
survives the window" is a different kind of claim from the rest of the feature grid, and the grid
is now eleven cards deep. Not acted on here because no positioning change was made this run and
promoting it would mean demoting one of the four existing pillars — a decision for the user.

---

## Demo state — as of 2026-09-10

Recorded so a future run can tell whether the roster has gone stale without re-deriving it.

| Clip | What it is for | Newest product feature it shows |
|---|---|---|
| Panes | A second pane with `Ctrl+Shift+T`; focus/move/resize from the keyboard | Pane furniture, pin button (#75) |
| AI tooling | Claude Code badged in a pane; Widgets → AI Inventory; the inventory retargeting when the other terminal is focused; the agent stopping to ask, badge going amber | **Agent states (#129)** |
| Docks | A two-pane view; the inventory dragged out by its tab onto the left rail, collapsed, then recalled by number | **Edge rails (#119)** |
| Detached | Settings → Widgets → tick "Keep shells running when the app closes"; open a terminal and start a watcher; close its pane and answer the "still running" question with Keep running; then find it `detached` in Terminal Sessions and Open it | **Session daemon (#83)**, close-confirm (#121) |
| Views | A second view in the tab bar; `Alt+End` / `Alt+Home` between them | Numbered/reorderable view tabs (#73) |

**The newest thing a visitor can see now shipped in #129** — the newest release reviewed. That is
the number to re-check next run; when it drifts more than a release or two behind the delta, the
roster is going stale again.

### Outstanding — Unshown

1. **Dark and light (#128).** Still not demonstrated. Now capturable (`light_theme` is a
   scenario), but a clip that flips the theme risks reading as a flicker, and a static
   before/after pair may sell it better. Judged not worth a clip this pass — revisit if theming
   becomes a selling point rather than a preference.

2. **Dragging a widget back off a rail into the view.** The product moves widgets in both
   directions; the Docks clip only shows view → rail. Cheap to add now that the drag machinery
   exists, but it would lengthen a clip that already makes its point.

### Chrome drift against #128 — verified 2026-09-10

Resolved the same day by running the **shipped v0.5.6 Windows binary** (see "Capturing without a
build" below). The demo's chrome is confirmed out of date in three ways, none of which the earlier
CI capture could show:

| Demo draws | v0.5.6 actually draws |
|---|---|
| Title bar starting at `Widgets` | A **four-square app mark** at the far left, before `Widgets` — the same mark as the site's own logo |
| Status bar `Views: 1 \| Active: Main \| Widgets: 2` | `● Main · 2 widgets · 1 view` — a blue dot, the view name bright, the rest muted and dot-separated |
| Status bar ending `100%` + always-present `[…]` key readout | `100% ▾` only. **The key readout is gone when no key is held** (#128 made it a pill that appears only while one is) |

Also confirmed while there, and *not* drift: the `View ▾` pill is right-anchored as the demo now
draws it; the active view tab keeps its red top accent; the `Workflows` strip sits inside each
terminal pane; panes are rounded cards with a gutter.

**Copy verified against the same captures**, both of which hold up:

- The "Dark and Light" card's "Terminal contents are left alone" is right — `light_theme` shows
  light chrome with the terminal grids still black.
- The AI Inventory copy is exact: six groups (Skills, Agents, Commands, Hooks, MCP Servers,
  Instructions), `project` / `user` / `plugin` badges in blue / green / purple, a scope stripe per
  row, `Filter... (F)`, and an item count. The real header also carries a **Pin toggle and a
  Rescan button** the demo's imitation omits — minor, listed here so it is not rediscovered.

## Capturing without a build — 2026-09-10

The single most useful thing learned this run, and the reason the earlier passes kept failing at
the visual step.

**CPT screenshots itself.** `cpt --profile <p> --screenshot out.bmp` renders a frame through SDL
and writes it — no X11, no window manager, no ImageMagick, and **no licence check**. The scenario
scripts take the binary path as their first argument, so *any* `cpt` will do.

Therefore: **do not build CPT. Download the release.** `scripts/capture-product.sh` was rewritten
to do this by default — it pulls the current release asset for the OS, extracts it, and runs the
CPT repo's scenario scripts pinned to that same tag. Verified working on Windows with no compiler,
no Python and no ImageMagick (it falls back to .NET `System.Drawing` for the BMP→PNG step).

```bash
scripts/capture-product.sh                     # latest release, default set
scripts/capture-product.sh --release v0.5.6    # pin a tag
scripts/capture-product.sh --local --build     # the old behaviour, if ever needed
```

Consequences for future runs:

- The **CI-artifact route is now only a fallback.** It was never able to show the newest build,
  because Screenshot Tests runs nightly on `master` and the artifact lags whatever just shipped.
- `light_theme` is a scenario, so the theme is capturable and no longer has to be described from
  a PR body.
- Scenarios are the menu of what can be seen — run `--list` before concluding something cannot be
  captured.

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

Added 2026-09-10:

| Feature | PR | Why deferred |
|---|---|---|
| Auto Layout Mode — Side by Side or Smart | #122 | Real, but a preference inside a menu the site does not document. The PR also admits Redistribute Layout silently did nothing on titled terminals before this; the site never claimed otherwise, so nothing to correct |
| Fullscreen tint | #110 | Makes fullscreen visible in a single-widget view. Supports the existing "Fullscreen the pane" row without needing its own copy |
| Updater channel moved to Settings → About, "(unstable)" badge | #108 | The site does not say where the update channel lives, so nothing is wrong. Would matter if the updates FAQ ever gives a path |
| ~~Session daemon: detachable sessions~~ | ~~#83, #95, #101~~ | **Un-deferred the same day, at the user's direction** — see "Detachable shells" below. The deferral reasoning ("the copy would be inventing the pitch") was wrong: `docs/session-daemon.md` and #83 state the user-facing promise plainly, and the deferral was made without reading either |
| Windows updater no longer wedges on a locked backup | #124 | A fixed bug in a feature the site describes correctly already |
| Focus outline no longer paints over dialogs | #112 | Bug fix, no claim attached |

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

## Demo: AI Inventory pane — 2026-09-08, fourth pass

The hero demo now docks an AI Inventory pane after Claude Code starts, so the feature the site
promoted to a Pillar is actually visible in the product shot on the front page. Its look was taken
from `scripts/capture-product.sh ai_inventory` rather than from the docs: scope stripe plus scope
badge on every row (blue repo / green user / purple plugin), the group label's first letter
underlined because that letter is its shortcut, the `Filter... (F)` box and the item count.

Watch on future runs:

- The pane's contents are **fixture data** in `demo-session.ts`, not a real scan. If the widget
  gains or loses a group, the demo does not follow on its own. The product's six groups are Skills,
  Agents, Commands, Hooks, MCP Servers, Instructions; the demo shows four of them for height.
- `count` must equal the rows actually listed. It was wrong (9 vs 8) on the first attempt.
- Three panes are unreadable on a phone, so below `sm` the first pane is hidden. Any further pane
  added to the Main view needs that rule revisited.

## Demo split into clips — 2026-09-08, fifth pass

The hero demo was one ~25s linear reel. To see the AI inventory — the feature the site now leads
with — a visitor had to watch a build compile, a pane split and a Claude session first. The
features were there and effectively invisible.

It is now three clips with a picker above the frame: **Panes**, **AI tooling**, **Views**. Each is
a `seed` (applied instantly) plus a short `script` (animated), so a clip opens on a workspace
already mid-task and makes its point in a couple of seconds. `/features` embeds the AI clip on its
own via `<TerminalDemo only="ai" />`.

A follow-up fixed the switch itself: the AI and Views clips had been seeded identically, so picking
one after the other changed nothing on screen and the picker read as broken. Views now seeds with
its second view already in the tab bar and a plain second terminal instead of Claude, and panes and
tabs are keyed by clip id so a switch remounts them and replays the entry animations.

For a future run:

- Judge a clip by **time to its point**, not by total length. If setup takes more than a beat or
  two, it belongs in the seed.
- A new clip must **open on a frame that differs from every other clip's opening frame**, not just
  end on a different one. Tab count, pane count and the status bar are what a visitor reads.
- **The AI clip now demonstrates retargeting.** Two panes in two checkouts (`~/src/notes-api` and
  `~/src/cpt`); focusing the other terminal moves the inventory to that repository, via the same
  spinner-and-`Scanning <dir>...` transition the widget uses, with the old results held on screen.
  Building it exposed a real bug in the demo: the Claude badge was stored per *view*, so it
  followed the focus onto a terminal running nothing. The product draws it per *widget*
  (`renderAiOverlay`), and the demo now does too.
- **Typing is dead time unless it is the point.** It animates at human speed. The AI clip opened
  by typing a prompt at Claude, which pushed the AI Inventory — the thing the clip exists to show —
  several seconds out. The prompt and its output are seeded now, so the clip opens on completed
  work and animates only the menu and the panel. Measure a clip by when its first visible change
  happens, not by its total length.
- **Every result in a clip needs the action that causes it, on screen.** The AI clip had a prompt
  typed at Claude and then the AI Inventory panel appearing by itself, which implied typing at an
  agent spawns the widget. It does not: `Widgets → AI Inventory` is the only way to add it — no
  shortcut, no command (`TitleBar.cpp`; `WidgetRegistry` registers only `Terminal` and
  `AiInventory`). The clip now opens that menu and picks the item. This is the same class of error
  as the `Ctrl+Shift+F` "split" caption: the binding existed, the effect was invented. Check
  causality, not just that each frame is individually accurate.
- Seeds run through `applyInstant`, the same path as the still frame, so they cannot drift from
  what animating the same ops would produce.
- `react-hooks/refs` (eslint-plugin-react-hooks 7.x, newly present in this tree) rejects reading a
  ref during render, which is how the player used to paint. The render now reads a published
  snapshot instead. Do not "simplify" that back into a ref read.

## `/features` removed — 2026-09-08

The route created in the split was deleted and the feature grid moved back onto `/`. It had been
embedding a single demo clip with no picker, so on that page the demo looked like the other clips
had vanished — a shared component behaving differently on one page is worse than a longer home
page. The `only` prop that allowed it is gone too, so the demo is identical everywhere.

Consequences worth knowing:

- `Features` had taken an `<h1>` when it was its own page and had to go back to `<h2>`; the home
  page already has Hero's `<h1>`.
- `#features` is now the only in-page anchor left in the nav, so that entry uses `HashLink` while
  the rest are `Link`.
- `SectionTeasers` lost its Features card, and `/features` is out of the sitemap and `llms.txt`.

## Verification limits found the hard way — 2026-09-08

Two things cost most of a session and will do so again if they are not remembered:

- **`scripts/capture-site.sh` verifies server-rendered output only.** A headless screenshot fires
  at `load`, before anything that needs React to have hydrated. The demo's simulated cursor is
  positioned by an effect, so it captured as absent — repeatedly — while working in a browser.
  Everything verified by capture this session was server-rendered, which is why the limit did not
  surface until now. Before concluding a feature is broken from a capture, ask whether it needs JS.
- **The dev server served stale CSS through edits and restarts.** At one point the served rule said
  `opacity: 1` while the file said `0`, which made a correct fix look broken and a stale diagnostic
  look live. `npm run build` was always right. Compare the served chunk against the file before
  editing code.

Also: probes left in the working tree are dangerous. A diagnostic that rendered a single clip
hid the demo picker, and the user hit it before it was reverted. Revert a probe in the same step
that captures its result.

## Notes for the next run

Written 2026-09-10. Replaces the previous notes; the pricing warning they carried is resolved —
the subscription landed, `plans.ts` is live, and the copy was verified against it this run.

### What is already checked, so you need not re-derive it

- **Pricing is clean.** `€7.49` / `€67.41` / 25% / 3-day grace / "nothing auto-renews" / €24
  grandfathered-and-never-converted all match `PLANS` exactly, JSON-LD `offers` included. The
  paid feature list in `Pricing.tsx` contains nothing `WidgetRegistry` does not register.
- **macOS is still correctly qualified everywhere.** `v0.5.6` ships Linux `.tar.gz`, Linux
  AppImage and a Windows `.zip`. No `.dmg`. The four lift points remain listed in the Download
  page section of `architecture.md`.
- **Every row of the shortcut table was verified** against `registerAllDefaults()` at `v0.5.6`,
  plus the inline combos (`Ctrl+1..9` tab switch, `Alt+1..9` views, `Alt+Home/End`, copy/paste)
  in `TerminalWidget.cpp` and `App.cpp`. `kWidgetSlotCount` is 9.

### Traps this run hit — all of them will recur

- **The dev repo is `~/source/cross-platform-terminal-dev`, not `cross-platform-terminal`.**
  `capture-product.sh` defaults `CPT_DIR` to the latter, which does not exist. Pass `CPT_DIR`
  or fix the default.
- **The local checkout was 18 commits stale and knew nothing of `v0.3.0`–`v0.5.6`.** `git fetch
  --all --tags` first, every time, and audit against the *tag*, not the working tree. The tree
  was on `develop`; the shipped product was five minor versions ahead of its tags.
- **There was no CPT build, so `capture-product.sh` could not run.** The fallback that worked is
  now documented under "When CPT cannot be built locally" in `architecture.md`: pull
  `screenshot-diffs-linux` off a *failed* Screenshot Tests run and read `current.png`. Always
  check the run's `head_sha` — the one used here (`5df2643`) contained #114/#119/#122 but **not**
  #127/#128/#129.
- **`tests/screenshot/baselines/*.png` in the CPT repo are three months stale** (24 June 2026).
  They predate the View menu, the edge rails and the theme rewrite. #128 said they need
  regenerating and nobody has. They are not evidence — compare against `current.png` only.
- **`capture-site.sh` needs Firefox and Firefox fails here.** It dies with
  `RenderCompositorSWGL failed mapping default framebuffer` and writes nothing. **Headless Chrome
  works**, and took every capture this run:

  ```bash
  chrome --headless --disable-gpu --force-prefers-reduced-motion --hide-scrollbars \
         --force-device-scale-factor=3 --window-size=1000,760 \
         --screenshot="C:\abs\path\out.png" http://localhost:3000/
  ```

  `--force-device-scale-factor` replaces `pngcrop.py` for magnifying chrome, which matters
  because **there is no real Python on this machine** — only the Microsoft Store stub, so every
  `scripts/*.py` is currently unusable. Worth teaching `capture-site.sh` to fall back to Chrome.
- **`node_modules` was absent**; `npm ci` is needed before `npm run build` will do anything.

### Capturing a specific demo clip — read this before trying

Three separate traps, each of which produced a confident wrong answer during the sixth pass.

- **The server render is hardcoded to the first clip.** `useState<Session>(() => stillFrame(clips[0]))`
  seeds the frame from `clips[0]`, *not* from `pick`. A headless screenshot fires at `load`,
  before the effect that repaints on clip change, so setting `pick` alone gives you the **chip row
  of one clip and the frame of another** — which looks like a broken clip and is not. To capture
  clip *n*, patch **both** `useState(0)` and `stillFrame(clips[0])`.
- **`pkill -f next-server` does not work here.** The old server keeps the port, the new one fails
  with `EADDRINUSE` and Next silently serves the *previous* build — so you screenshot stale output
  and conclude your change did nothing. Kill by PID:
  `netstat -ano | grep ":3100 " | grep LISTENING` then `taskkill /PID <pid> /F /T`, and check the
  log for `EADDRINUSE` before trusting a capture. The same trap applies to `npm run dev`: it
  quietly moves to 3001 and you read the wrong server.
- **Use a production build, not the dev server.** Turbopack served a stale compile through the
  patch-and-wait loop. `npm run build` + `npm run start` on a spare port was the only reliable
  route, and it is fast enough.

Patch, build, capture and revert **inside one command**, so a probe cannot outlive the step that
made it.

### Watch next time

- **`#128` is unverified visually.** The theme rewrite rewrote the status bar, made the key
  readout a pill that shows only while a key is held, and redrew both tab strips as cards with
  rounded tops out of a sunken strip. The demo still draws the old status bar (`100%` plus
  always-present brackets; the product now shows a boxed `100% ▼` scale control). No capture of
  a `#128` build existed when this ran — **get one and re-compare the whole chrome.** The "Dark
  and Light" card was written from the PR body and describes only what the control does, never
  how it looks.
- **Edge rails are not in the hero demo.** That is currently defensible: empty rails take no
  space, so a default workspace genuinely has none on screen. It stops being defensible if a
  clip is ever added that docks one.
- The `Ctrl+Shift+T` behaviour is still setting-dependent (**Settings → Terminal → New terminal
  as separate widget**, default on). If that default flips, the demo caption and the shortcut
  table note both become wrong.
- The old screenshot pipeline (`screenshots.config.json`, `scripts/update-screenshots.sh`,
  `docs/screenshots.md`) still points at `ar-workspace`, a renamed repo. Still unused, still
  superseded by `capture-product.sh`. Delete or repoint it.
