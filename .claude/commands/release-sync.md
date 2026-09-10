Audit the website — its copy *and* its hero demo — against what CPT actually ships now.

The site drifts out of date every time CPT releases, in two different ways that need looking for
separately:

- **What the site says** goes stale — a shortcut that moved, a price, a platform, a feature nobody
  wrote up.
- **What the site shows** goes stale — the hero demo is hand-drawn HTML imitating an app that keeps
  changing. It rots silently, it has no test, and *nothing fails when it drifts*.

The second one is the one that gets missed, because it never announces itself as a wrong sentence.
A demo can be accurate in every detail and still be selling last quarter's product. Treat the demo
as a deliverable you own, not as a source of claims to fact-check.

This command recomputes the delta between "what the product does" and "what the site says and
shows", and proposes changes. It does not apply them — it ends with a ranked proposal.

## Sources of truth

The product, in order of authority:

1. **The dev repo, checked out locally.** Usually `~/source/cross-platform-terminal-dev` — check
   before assuming a path; `capture-product.sh` defaults `CPT_DIR` to `cross-platform-terminal`,
   which may not be what exists. **`git fetch --all --tags` first, every time.** The checkout is
   routinely many commits behind and may not know the newest tags at all. Audit against the
   released *tag*, never the working tree.
2. `gh release list --repo AleksaRistic216/ar-workspace-release` — the published releases. Release
   notes are one-liners; they name the PR but not what it does.
3. `gh pr view <n> --repo AleksaRistic216/cross-platform-terminal-dev` — the PR bodies. This is
   where the user-facing description actually lives. Read these, not the release notes.
4. **The product, running — the released build.** Source says what should happen; a capture says
   what a buyer sees. For anything visual, the capture wins, and the binary attached to the latest
   release is the *most* authoritative thing there is: it is literally what a buyer downloads.
   `scripts/capture-product.sh` runs it. See step 4.

Never propose copy from a commit subject alone. Read the PR body or the doc under the dev repo's
`docs/` before writing a claim about a feature.

## Procedure

### 1. Read the ledger

`docs/release-sync.md`. It records the last release reviewed and every change already proposed,
including the ones the user rejected and why. Do not re-propose a rejected item unless the product
has changed in a way that answers the objection.

Also read its **"Notes for the next run"** — it carries the environment traps (which browser works,
whether Python exists, which paths are wrong) that otherwise cost half a session to rediscover.

### 2. Find the delta

List releases since the ledger's last-reviewed tag, then get the commits in that span. Drop
anything not user-facing — `ci(`, `chore(`, `test(`, internal agent/skill tooling, worktree
scripts. A feature only matters here if a buyer could notice it.

As you read each PR body, tag it with **what kind of drift it can cause**. A PR can be more than
one:

| Tag | Meaning | Forces |
|---|---|---|
| `says` | Changes a fact the site states | Check the copy that states it |
| `shows` | Changes something the demo depicts or could depict | Step 5 |
| `draws` | **Changes how the app is drawn** — theme, chrome, title bar, status bar, tab strips, widget furniture | Step 5, and invalidates *all* prior demo verification |

A `draws` PR anywhere in the delta means the demo's entire chrome is unverified until you have seen
a capture of a build that contains it. One theme PR can invalidate every pixel of `TerminalDemo.tsx`
at once. Do not let a `draws` PR pass as "visual polish, no copy hook" — that is how it hides.

### 3. Verify what the site *says*

For each site claim that touches the delta, check it against the source. Check the **effect**, not
just that a name exists — the site once advertised `Ctrl+Shift+F` as "Split right" and the demo
pressed it under that caption; the binding was real, it just does something else (Fullscreen
Terminal). In particular:

- The shortcut table in `src/components/CrossPlatform.tsx` against
  `ShortcutManager::registerAllDefaults()`, plus the combos `TerminalWidget` and `App` handle
  inline. Every row must name a binding that exists, with the right combo. Modifier order in the
  struct is `{key, ctrl, shift, alt}`.
- Every `key` op in `src/lib/demo-session.ts` against that same list.
- The platform claims in `Hero.tsx`, `FAQ.tsx`, `download/page.tsx` and the JSON-LD in `page.tsx`
  against the assets actually attached to the latest release.
- The pricing and licence claims against `src/lib/plans.ts`, the only place a price or period
  length is written down. Prices quoted anywhere on the site must match `PLANS` exactly, JSON-LD
  offers included. Two claims that are always bugs: that anything renews or charges automatically
  (crypto cannot be auto-charged), and that the grandfathered €24 perpetual licences were converted
  or expire (they do not).
- **Every widget or panel the site names, against `WidgetRegistry`.** It registers exactly two
  types, Terminal and AiInventory. The site has invented a "File browser widget" once and a "file
  tree" pane once, in two different components, six weeks apart. Grep the *whole site* for widget
  names, not just the pricing list.

**Check the machine-readable surfaces too, not just the rendered page.** Nothing draws them, so
no capture and no read-through catches a stale claim in:

- `public/llms.txt` — the summary assistants quote. A claim fixed on the page and not here will
  keep being repeated back at users.
- The root `metadata` in `src/app/layout.tsx` — title, description, OpenGraph. This claimed macOS
  support for months after every visible surface had been corrected.
- The JSON-LD blocks — `/` and `/download` (`SoftwareApplication`), `/changelog` (`ItemList`),
  `/faq` (`FAQPage`).

A claim the site makes that the product does not back is a **correctness** finding and outranks
every new-feature finding, wherever it is written.

### 4. Run the product yourself

Grep proves a binding exists; it does not prove the app looks like the site says it does. **Do not
reason about appearance from source or a PR body. Run the shipped build and look at it.**

You do not need to build CPT, and you should not. The app screenshots itself — `cpt --profile <p>
--screenshot out.bmp` renders through SDL and writes a file, with no X11, no window manager and no
ImageMagick. So any `cpt` binary works, and the right one is **the binary attached to the latest
release**: no compiler, no stale local build of the wrong commit, and it is exactly what a buyer
runs. **Screenshot mode does not ask for a licence.**

```bash
scripts/capture-product.sh                     # latest release, default scenario set
scripts/capture-product.sh --release v0.5.6    # pin a tag
scripts/capture-product.sh two_terminals light_theme ai_inventory
scripts/capture-product.sh --list              # every scenario the CPT repo defines
```

It downloads the release asset for the current OS, extracts it, and drives the CPT repo's own
scenario scripts **pinned to that tag**, so scripts and binary always agree. A checkout is still
needed (`CPT_DIR`, default `~/source/cross-platform-terminal-dev`) but only as the source of those
scripts — `git fetch --tags` it first.

**Then open every PNG.** A capture nobody looked at verifies nothing. To inspect small chrome,
crop and magnify — `scripts/pngcrop.py` if there is a real Python, otherwise .NET
`System.Drawing` through `powershell.exe` (a Microsoft Store stub may answer `python3` and then
fail, so check before relying on it).

**Scenarios are the CPT repo's, and they are the menu of what you can see.** `--list` before
assuming something cannot be captured — a feature usually arrives with a scenario. If the thing
you need has none, the honest options are to say it is unverified or to write a scenario; do not
substitute a PR body.

Fallback, if the release asset will not run at all: a *failed* Screenshot Tests run uploads
`screenshot-diffs-*` with a real `current.png` per scenario.

```bash
gh run list  --repo AleksaRistic216/cross-platform-terminal-dev --workflow screenshot-tests.yml
gh run download <id> --repo AleksaRistic216/cross-platform-terminal-dev -n screenshot-diffs-linux
```

**Check the run's `head_sha`** and work out which PRs of your delta it contains — an artifact from
before the delta's `draws` PR verifies nothing about it. You can also trigger a fresh run with
`gh workflow run screenshot-tests.yml --ref master` (its default `update_baselines: false` commits
nothing), but that is slower than just running the release build and needs the user's agreement,
since it is a visible CI run on their repo.

Two traps:

- **`tests/screenshot/baselines/*.png` in the CPT repo are not evidence.** They are refreshed only
  when someone approves new baselines, and have been three months stale — predating whole UI
  rewrites. Compare against a capture you took, never the committed baseline.
- **Report what you could not see.** Mark every unverified visual claim as such in the proposal.
  A PR body may be quoted for what a control *does* and where it lives; never for appearance.

For the site side, `scripts/capture-site.sh` wants Firefox and Firefox has failed here
(`RenderCompositorSWGL failed mapping default framebuffer`, writes nothing). **Headless Chrome
works:**

```bash
chrome --headless --disable-gpu --force-prefers-reduced-motion --hide-scrollbars \
       --force-device-scale-factor=3 --window-size=1000,760 \
       --screenshot="C:\abs\path\out.png" http://localhost:3000/
```

`--force-device-scale-factor` magnifies chrome in place of `scripts/pngcrop.py`, which matters
because there may be no real Python installed (a Microsoft Store stub answers `python3` and fails).
`capture-site.sh` only proves what the *server* rendered — anything positioned by an effect needs a
hydrated browser. Reduced motion pins the demo to its still frame, the only deterministic one.

### 5. Audit the demo as a portfolio, not as a list of facts

**This is the step that gets skipped, because nothing here is falsifiable one element at a time.**
Every clip can be individually correct while the set as a whole misrepresents the product.

Open the page and watch all the clips. Then answer, in writing:

- **What is the newest thing a visitor can see?** Not read — *see*. If the answer is older than the
  last two or three releases, the roster is stale regardless of how accurate each clip is.
- **Does every one of the four claims have something that shows it?** They are listed under
  "What CPT is selling" in `docs/architecture.md`. A claim with nothing demonstrating it is a
  promise the page only asserts.
- **Did the clip count stay flat while the product grew?** Same number of clips across several runs,
  against a delta full of user-facing features, is itself the finding. Say it out loud.
- **Does the chrome match the newest capture you have** — menus, both tab strips, pane furniture,
  status bar, focus treatment, colours? List each element you compared. An element you did not
  compare is not verified.
- **Is anything the site calls "live" — a badge, a spinner, a counter — actually drawn where the
  demo puts it?** Find it in the source. The site animated a live token counter in the status bar
  for months; CPT has no token counter anywhere, and its AI badge is drawn inside the *pane*. That
  survived a source-only review because "AI tool detection" is a real feature — only the rendering
  was invented.

A clip roster is stale when the product's centre of gravity has moved and the clips have not. That
is a finding even when no individual frame is wrong, and it belongs in the proposal as **Unshown**
(see below).

Before proposing a new or changed clip, read the demo sections of `docs/release-sync.md` — the
accumulated rules are there and were each learned the hard way. In short: judge a clip by **time to
its point**, not total length; put setup in the `seed`, animate only the point; every clip must
**open on a frame distinct from every other clip's opening frame**; and **every result needs its
cause on screen** — a panel that appears without the menu action that adds it teaches a workflow
that does not exist.

### 6. Rank the proposal

Four tiers, in this order:

- **Wrong today** — the site says or shows something untrue. Always propose fixing these.
- **Unshown** — shipped, prominent, and the site only *states* it. The page tells and does not
  demonstrate. **Writing a sentence does not discharge this tier**; a feature card and a clip are
  different deliverables, and adding the card is what makes this tier easy to lose track of.
  Weigh it by how central the feature is, not how new.
- **Missing** — shipped, user-facing, and the site is silent in both registers. Propose only where
  it earns the space; a site that lists every changelog entry sells nothing.

  **Deferring is a judgement about value, never about effort, and it requires the same reading as
  proposing.** "The copy would be inventing the pitch" is a claim about the feature that you can
  only make after opening its PR body and its doc under the dev repo's `docs/`. The session
  daemon was deferred on exactly that reasoning while `docs/session-daemon.md` stated the pitch
  in one sentence — the deferral was made from commit subjects. If you cannot say what a feature
  promises a buyer, you have not read enough to defer it.
- **Positioning** — the delta has shifted what CPT *is* and the page's emphasis should follow.
  Raise at most once every few runs, with the accumulated evidence.

  **The four claims are written down**, under "What CPT is selling" in `docs/architecture.md`:
  same behaviour on every platform (with the shipping platforms, architectures and shells);
  terminal first and AI second; detached daemons; GPU-accelerated. The hero renders them in that
  order. Check the page against that section rather than re-deriving the pitch, and treat any
  change to it as a repositioning to take to the user — in particular **"terminal first, AI
  second" is an explicit ordering**, and the AI feature set grows fast enough to erode it one
  card at a time if nobody is watching.

For each item give: the claim, the file and line, the evidence (PR number or source line), and the
proposed wording or clip change. Keep proposed copy in the voice of the surrounding section — read
it first.

Close the proposal with an explicit **"what I could not verify"** list. A run that verified nothing
visually must say so at the top, not bury it.

### 7. Present, don't apply

End with the ranked list and stop. The user picks. If they accept items, apply them, then update
the ledger.

## Updating the ledger

After the user has decided, rewrite `docs/release-sync.md`:

- Set the last-reviewed release to the newest tag seen (drafts do not count as reviewed).
- Log accepted items with what changed and where.
- Log rejected items with the reason, verbatim enough that a future run can tell whether the
  objection still holds. This is what makes the next run cheaper than this one.
- Log deferred items — shipped but not yet worth space — so they accumulate rather than being
  rediscovered.
- **Log the demo's state**: which clips exist, what each one is for, the newest product feature any
  of them shows, and anything left unverified. A future run reads this to tell whether the roster
  has gone stale without re-deriving it.
- **Refresh "Notes for the next run"** with any environment trap you hit — a wrong path, a broken
  tool, a missing dependency. Delete notes that no longer apply.

## Constraints

- `AGENTS.md` applies: this is Next.js 16, read `node_modules/next/dist/docs/` before writing
  Next-specific code. `node_modules` may be absent — `npm ci` first.
- `docs/architecture.md` documents the anchor-ID table, the demo-script rules and the design
  tokens. A new section needs a nav link and a row in that table.
- Do not invent a benchmark, a percentage or a timing that no source states.
- **Do not describe a UI element you have not seen in a capture.**
- `TerminalDemo.tsx` is hand-drawn HTML imitating the product's chrome. It has no test and nothing
  breaks when the app changes — treat it as always suspect and always compare it to a capture.
- **Distrust comments in `TerminalDemo.tsx` that assert what the product looks like.** They were
  true when written and read as verified afterwards. One saying the menu bar "is exactly these two"
  outlived the product growing a third menu. When you confirm such a comment, re-date it; when you
  fix the code, fix the comment in the same edit.
- Verify your own changes by looking at them. Build, serve, capture, open the image.
- Revert any diagnostic probe in the same step that captures its result — a probe that hid the demo
  picker once reached the user.
