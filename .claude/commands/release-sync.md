Audit the website against what CPT actually ships now, and propose copy changes.

The site's claims drift out of date every time CPT releases. This command recomputes the delta
between "what the product does" and "what the site says", and proposes changes. It does not
apply them — it ends with a ranked proposal for the user to accept or reject.

## Sources of truth

The product, in order of authority:

1. `~/source/cross-platform-terminal` — the dev repo, if it is checked out locally. The real
   source of truth. If it is missing, clone it or fall back to `gh` against
   `AleksaRistic216/cross-platform-terminal-dev`.
2. `gh release list --repo AleksaRistic216/ar-workspace-release` — the published releases.
   Release notes are one-liners; they name the PR but not what it does.
3. `gh pr view <n> --repo AleksaRistic216/cross-platform-terminal-dev` — the PR bodies. This is
   where the user-facing description actually lives. Read these, not the release notes.
4. **The product, running.** `scripts/capture-product.sh` builds CPT and captures real
   screenshots. Source says what should happen; a capture says what a buyer sees. For anything
   visual, the capture wins.

Never propose copy from a commit subject alone. Read the PR body or the doc under
`~/source/cross-platform-terminal/docs/` before writing a claim about a feature.

## Procedure

1. **Read the ledger** — `docs/release-sync.md`. It records the last release reviewed and every
   change already proposed, including the ones the user rejected and why. Do not re-propose a
   rejected item unless the product has changed in a way that answers the objection.

2. **Find the delta.** List releases since the ledger's last-reviewed tag. Get the commits in
   that span (`git log --oneline <last>..HEAD` in the dev repo). Drop anything that is not
   user-facing — `ci(`, `chore(`, `test(`, internal agent/skill tooling, worktree scripts. A
   feature only matters here if a buyer could notice it.

3. **Verify what the site currently claims.** For each site claim that touches the delta, check
   it against the source. Check the *effect*, not just that a name exists — the site once
   advertised `Ctrl+Shift+F` as "Split right" and the demo pressed it under that caption; the
   binding was real, it just does something else (Fullscreen Terminal). In particular:
   - The shortcut table in `src/components/CrossPlatform.tsx` against
     `ShortcutManager::registerAllDefaults()` in `src/core/ShortcutManager.cpp`. Every row must
     name a binding that exists, with the right combo. Modifier order in the struct is
     `{key, ctrl, shift, alt}`.
   - Every `key` op in `src/lib/demo-session.ts` against that same list — the hero demo must not
     press a keystroke that does nothing, or attribute the wrong effect to a real one.
   - The platform claims in `Hero.tsx`, `FAQ.tsx`, `download/page.tsx` and the JSON-LD in
     `page.tsx` against the assets actually attached to the latest release.
   - The pricing and licence claims against `src/lib/plans.ts`, which is the only place a price or
     a period length is written down — see the pricing section of `docs/architecture.md`. Prices
     quoted anywhere else on the site must match `PLANS` exactly, the JSON-LD offers included.
     Two claims that are always bugs: that anything renews or charges automatically (crypto cannot
     be auto-charged — every period is bought deliberately), and that the grandfathered €24
     perpetual licences were converted or expire (they do not).

   A claim the site makes that the product does not back is a **correctness** finding and
   outranks every new-feature finding.

4. **Look at the product.** Grep proves a binding exists; it does not prove the app looks like
   the site says it does. Run `scripts/capture-product.sh` and *open the PNGs*.

   ```bash
   scripts/capture-product.sh --list          # scenarios, defined by the CPT repo
   scripts/capture-product.sh --build         # rebuild first if the binary is stale
   scripts/capture-site.sh                    # the site, for the same-eyes comparison
   python3 scripts/pngcrop.py <in> <out> x0 y0 x1 y1 2   # chrome is too small to judge unzoomed
   ```

   Check at least:
   - **The hero demo's chrome against a real capture** — menus, tab strip, pane furniture, status
     bar. This is the thing that silently rots: it is hand-drawn HTML imitating an app that keeps
     changing, and nothing fails when it drifts.
   - **Any widget the site describes**, against its own scenario (`ai_inventory`, and whatever the
     CPT repo has added since).
   - **Anything the site says is "live"** — a badge, a spinner, a counter. Find where it is drawn
     and confirm it exists. Do not assume a UI element exists because a feature does.

   A visual claim you have not seen rendered is unverified. Say so rather than shipping it.

5. **Rank the proposal.** Three tiers, in this order:
   - **Wrong today** — the site says something untrue. Always propose fixing these.
   - **Missing** — shipped, user-facing, and the site is silent. Propose only where it earns
     the space; a site that lists every changelog entry sells nothing.
   - **Positioning** — the delta has shifted what CPT *is*, and the page's emphasis should
     follow. Raise this at most once every few runs, with the accumulated evidence.

   For each item give: the claim, the file and line, the evidence (PR number or source line),
   and the proposed wording. Keep proposed copy in the voice of the surrounding section — read
   it first.

6. **Present, don't apply.** End with the ranked list and stop. The user picks. If they accept
   items, apply them, then update the ledger.

## Updating the ledger

After the user has decided, rewrite `docs/release-sync.md`:

- Set the last-reviewed release to the newest tag seen (drafts do not count as reviewed).
- Log accepted items with what changed and where.
- Log rejected items with the reason, verbatim enough that a future run can tell whether the
  objection still holds. This is the part that makes the next run cheaper than this one.
- Log deferred items — shipped but not yet worth space — so they accumulate rather than being
  rediscovered.

## Constraints

- `AGENTS.md` applies: this is Next.js 16, read `node_modules/next/dist/docs/` before writing
  Next-specific code.
- `docs/architecture.md` documents the anchor-ID table, the demo-script rules and the design
  tokens. A new section needs a nav link and a row in that table.
- Do not invent a benchmark, a percentage or a timing that no source states.
- Do not describe a UI element you have not seen in a capture. The site claimed a live token
  counter in the status bar for months, and the hero demo animated one; the product has no token
  counter anywhere, and its AI badge is drawn inside the pane, not in the status bar. Both survived
  a source-only review because "AI tool detection" is a real feature — the specific rendering was
  never checked.
- `TerminalDemo.tsx` is hand-drawn HTML imitating the product's chrome. It has no test and nothing
  breaks when the app changes, so treat it as always suspect and always compare it to a capture.
