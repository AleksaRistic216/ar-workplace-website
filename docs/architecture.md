# Site Architecture

## Routes

| Route | File | Notes |
|---|---|---|
| `/` | `src/app/page.tsx` | Hero, pillars, the feature grid, and teasers into the pages below |
| `/cross-platform` | `src/app/cross-platform/page.tsx` | Platform quirks and the shortcut table |
| `/pricing` | `src/app/pricing/page.tsx` | Plans and checkout |
| `/faq` | `src/app/faq/page.tsx` | FAQ accordion, `FAQPage` JSON-LD |
| `/download` | `src/app/download/page.tsx` | Per-platform downloads (server component, ISR) |
| `/api/create-invoice` | `src/app/api/create-invoice/route.ts` | Starts a purchase |
| `/api/licence-status` | `src/app/api/licence-status/route.ts` | Has the purchase finished provisioning? |
| `/api/payment-webhook` | `src/app/api/payment-webhook/route.ts` | NOWPayments IPN → provisioning |
| `/api/renewal-reminders` | `src/app/api/renewal-reminders/route.ts` | Daily cron; emails subscriptions about to lapse |

## Component tree

```
layout.tsx                    ← metadata, font vars, global CSS
├── page.tsx                  ← home, SoftwareApplication JSON-LD
│   ├── Navbar                ← fixed header, mobile menu, Escape to close
│   ├── Hero                  ← headline, CTA pair, TerminalDemo
│   │   └── TerminalDemo      ← the replaying session (client)
│   ├── Pillars               ← 4 claims, each with a spec tag
│   ├── Features              ← 8 feature cards, id="features"
│   ├── SectionTeasers        ← 3 cards into the pages below; carries the legacy anchor ids
│   └── Footer
├── cross-platform/page.tsx   ← CrossPlatform (quirks + folded shortcut table)
├── pricing/page.tsx          ← Pricing (plans + checkout modal, client)
├── faq/page.tsx              ← FAQ (accordion + FAQPage JSON-LD)
└── download/page.tsx         ← platform cards, licence note
```

Every page is `Navbar` + content + `Footer`. The four split-out pages wrap their content in
`<main className="pt-14">` to reserve the fixed header's height; the home page does not, because
`Hero` already carries a `pt-28` of its own.

`CrossPlatform`, `Pricing` and `FAQ` each render their section heading as an `<h1>`, because each
is the whole content of its own route. They are used on exactly one page each — if one is ever
reused, that heading has to become a prop rather than being demoted in place. `Features` is the
counter-example: it briefly had its own route, took an `<h1>`, and had to be demoted back to `<h2>`
when it returned to the home page, which already has Hero's `<h1>`.

**There is no `/features` route.** The grid lives on `/` and `Features` keeps `id="features"`, so
the nav entry is the one remaining in-page anchor and uses `HashLink`. It was briefly its own page,
embedding a single demo clip with no picker — which made the demo look, on that page alone, as
though the other clips had disappeared. A page that shows a different version of a shared component
is worse than one section more on the home page.

## Section anchor IDs

The nav used to be four in-page anchors. They are routes now, and the only anchors left are the
ones that point *inside* a page:

| Anchor | Lives on | Linked from |
|---|---|---|
| `#faq-<id>` | `/faq` | `UpdateFootnote` → `/faq#faq-updates`; each answer is individually linkable |
| `#features`, `#cross-platform`, `#pricing`, `#faq` | `/` | Nothing on the site — kept for inbound links only |

That second row is the compatibility layer. Those four ids were the entire public URL surface of
the single-page site and are in links people have already shared. **A hash never reaches the
server, so it cannot be redirected** — the only way to honour an old `/#pricing` is to keep
something at that id. `SectionTeasers` puts each id on the card for that subject, so an old link
lands on the right teaser, one click from the page itself. Do not remove those ids.

`html { scroll-padding-top: 5rem }` in `globals.css` keeps anchored headings clear of the fixed
header.

`HashLink` still exists and is still needed: it is what makes `/faq#faq-updates` work both from
another page (native navigation, then `OpenHashDetails` opens the answer on load) and from `/faq`
itself (same-page `scrollIntoView`, opening the `<details>` first). Its only caller now is
`UpdateFootnote`.

## The hero demo

`TerminalDemo.tsx` replays a scripted CPT session as live DOM text. It replaced a stack of rotated
PNG screenshots, which at hero size rendered terminal type illegibly — the product's own UI could
not be read in its own hero.

- **Clips, not one reel** — `src/lib/demo-session.ts` exports `demos`, each a `{ seed, script }`.
  The `seed` is applied instantly through `applyInstant`; the `script` animates and loops. Ops are
  `type`, `run`, `out`, `key`, `split`, `inventory`, `newview`, `switchview`, `ai`, `caption`,
  `wait`. The same file exports `inventory`, the data the AI Inventory pane lists.

  The demo used to be a single ~25s reel that built its state up from an empty shell: reaching the
  AI inventory meant sitting through a cargo build, a pane split and a Claude session first. Nobody
  watches a landing page that long, so the interesting parts were effectively invisible. Each clip
  now *opens* mid-task and does one thing. **A new clip should be seeded into the state its point
  needs and then show only that point** — if a clip needs more than a few seconds before it makes
  sense, its setup belongs in the seed.

  Because seeds go through `applyInstant` — the same path the still frame uses — a seed cannot
  drift from what the player would have produced by animating the same ops.
- **Every clip must *open* on a visibly different frame.** Picking a clip whose seed looks like the
  one already on screen reads as a dead button — the first cut of this had the AI and Views clips
  seeded identically, so switching between them changed nothing. The three differ in tab count,
  pane count and status bar: one tab / one pane; one tab / two panes plus the Claude badge; two
  tabs / two panes and no badge. Check a new clip against the others, not just against itself.
- **Never make the viewer wait through typing to reach the point.** Typing animates at human
  speed, so a forty-character prompt costs a second or more before anything happens. If the typing
  is not itself the thing the clip demonstrates, it belongs in the `seed`, already committed. The
  AI clip typed a prompt at Claude before opening the inventory; that prompt and its output are now
  seeded, and the clip's animation is spent only on the menu and the panel. The `panes` clip does
  still type, but *after* its split has already landed — the test is whether the first visible
  change comes before or after the keystrokes, not whether typing appears at all.
- **The simulated cursor.** The `pointer` op moves a drawn cursor onto the element tagged
  `data-ptr={at}` and can flash a click ripple. Positions are **measured** from the DOM in an
  effect rather than written down, because the frame is a different size at every breakpoint and
  the menu item it points at does not exist until the menu is open. Two consequences worth keeping:
  its `left`, `top` and `opacity` live in `.cpt-cursor` in `globals.css`, **not** in the component's
  `style` prop — anything React holds in `style` is reset to the prop's value on the next render,
  which silently undid the positioning; and the first placement happens with transitions off, or
  the cursor's first appearance animates in from the frame's corner.
- **Show the action that causes the result.** The AI clip used to type a prompt at Claude and then
  have the AI Inventory panel appear on its own, implying the two were connected. They are not:
  `Widgets → AI Inventory` in the title bar is the *only* way to add that widget — there is no
  shortcut and no command for it (`TitleBar.cpp`, and `WidgetRegistry` registers only `Terminal`
  and `AiInventory`). The clip now opens the menu, highlights the item and picks it. The `menu` op
  drives that, and `WIDGETS_MENU` in `demo-session.ts` holds the items verbatim from `TitleBar.cpp`.
  A demo that shows a result without the action that produces it teaches the wrong mental model as
  surely as a wrong shortcut does.
- **Panes and view tabs are keyed by clip id.** Pane ids restart at 1 in every clip, so without the
  prefix React saw the same keys across a switch, kept the DOM and replayed no entry animation —
  the frame changed with nothing to signal that it had. The prefix forces a remount, so
  `cpt-pane-in` and `cpt-tab-in` run again and the switch is visible.
- **The picker** is rendered when there is more than one clip, and every page that shows the demo
  shows the same one. There was briefly an `only` prop for embedding a single clip; it made the
  demo differ between pages and read as broken, and it is gone.
- **Render reads a snapshot, not the ref.** The player mutates `stateRef` dozens of times a second
  and `repaint()` publishes a shallow copy as state. Reading `stateRef.current` during render is
  what `react-hooks/refs` rejects, and it is genuinely unsound: a ref holding render-relevant state
  is invisible to React. The shallow copy keeps the nested arrays' identity, so this costs one
  object per frame, not a rebuilt session.
- **The inventory follows the focused terminal.** Panes carry their own `cwd`, `inventories` in
  `demo-session.ts` is keyed by repository, and the `focus` op retargets the panel when the newly
  focused terminal is in a different checkout. The transition is modelled on the product: the item
  count is replaced by a spinner and `Scanning <dir>...` while **the previous results stay on
  screen**, then `scanned` commits the new ones. CPT holds that indicator for `kMinIndicatorMs`
  (450 ms) specifically so retargeting is visible rather than flashing past, so the clip leaves it
  up a little longer still. A user-scope entry (`dataviz`) appears in both repositories on purpose —
  `~/.claude` applies everywhere, which is what the scope badges exist to show.
- **The AI badge belongs to a pane, not a view.** `TerminalWidget::renderAiOverlay` draws it in the
  widget running the tool, so it stays put when focus moves elsewhere. Holding it on the view made
  the badge follow the focus onto a terminal that was running nothing.
- **Panes have a `kind`** — `"term"` or `"inventory"`. An inventory pane renders `InventoryPanel`
  instead of scrollback, skips the Workflows strip, and never carries the AI badge. Its colours and
  layout were taken from a real capture (`scripts/capture-product.sh ai_inventory`): a scope stripe
  and a scope badge on every row, blue for the repo, green for `~/.claude`, purple for a plugin,
  and the group label's first letter underlined because that letter is its shortcut.
- **Three panes do not fit a phone.** Below `sm` the first pane is hidden once a third appears, so a
  narrow screen keeps the pane running Claude and the inventory rather than three unreadable slivers.
- **Only real bindings, doing the real thing.** Every shortcut shown in a `key` op must exist in
  `shortcutGroups` in `CrossPlatform.tsx`, **and the caption must describe what that binding
  actually does**. Membership alone is not enough: the demo shipped for months pressing
  `Ctrl+Shift+F` under the caption "Split the pane", which passed the membership check because the
  table wrongly listed that combo as a split. It is Fullscreen Terminal. Switching views is done by
  changing the active tab rather than a keystroke, because no binding for it is documented.
- **`applyInstant`** applies an op's effect without its timing. The player uses it for the
  structural ops; `stillFrame()` folds the whole script through it to produce the final frame, which
  is what renders under `prefers-reduced-motion: reduce`.
- **Gating** — the loop parks itself when the demo scrolls out of view (IntersectionObserver), when
  the tab is hidden, or when the viewer presses Pause. It does not unwind, so it resumes mid-step.
- **State** lives in a ref with a forced repaint rather than `useState`; the player mutates one
  object dozens of times per second and nothing outside the component reads it.

## Checkout flow

```
Pricing "Subscribe" (monthly | yearly)
  └─ email step  → POST /api/create-invoice
       ├─ lookup failed → 503, no invoice (see "Why the lookup fails closed")
       ├─ perpetual → portal link, nothing to sell (grandfathered €24 licence)
       ├─ free (100% discount) → provisionPurchase() → success
       └─ otherwise → NOWPayments widget in an iframe
            └─ poll POST /api/licence-status {email, notBefore} every 4s
                 └─ provisioned:true → success screen
```

The success screen is driven by the licence's date, never by a button. `provisionPurchase` grants
**last**, so a true result means the account exists and the email has gone out. An earlier version
had an "I've paid" button that set the success state on click, which reported a completed purchase
to anyone who pressed it.

`notBefore` is what makes the poll work for renewals. A renewing subscriber already holds a licence,
so "do they have one" answers yes before their payment is honoured — the checkout passes back the
expiry the invoice was created for, and the answer is yes only once the licence reaches it.

Polling stops after 20 minutes and tells the buyer their email will still arrive; it does not claim
the purchase failed, because a slow crypto confirmation is not a failure.

## Pricing, and what it actually is

**€7.49/month or €67.41/year, prepaid.** Every number lives in `src/lib/plans.ts`; nothing else may
hard-code a price or a period length.

Crypto cannot be auto-charged, so this is a subscription that is *bought* rather than *billed*.
A payment moves the licence's `expiresAt` forward and nothing is stored to charge anyone again.
Access ends by itself: the Client API drops expired licences from its response and the Terminal API
re-checks on every session poll, so no revocation step exists anywhere.

### The date is absolute, and that is the whole design

NOWPayments redelivers webhooks and there is no database on this side to record which payments have
been honoured, so "extend by one month" would hand out a second month on every redelivery. Instead:

1. `create-invoice` reads the account's current expiry, works out where the next period starts, and
   encodes `{months, base}` into the NOWPayments **order id**.
2. The webhook decodes it and computes an *absolute* expiry — `max(base, payment time) + months`,
   plus the grace window.
3. `grantLicence` overwrites the stored expiry with that date.

Writing the same date twice is a no-op, so redelivery is harmless without any state being kept.
`max(base, payment time)` is what keeps an early renewal's unused time while stopping a checkout
left open overnight from silently losing a day.

### Grace, and why it is not part of the period

`GRACE_DAYS` (3) is added when the expiry is written and taken back off by `paidThroughOf` when the
next period is measured. Folding it into the period instead would re-grant it on every renewal and
compound into a free month across a year. Emails and the checkout quote the *paid-through* date,
never the raw expiry, for the same reason.

### Why the lookup fails closed

`create-invoice` returns 503 when it cannot read the account's licence. It used to wave the buyer
through, which was harmless while every licence was perpetual — but the date the payment produces is
fixed at invoice time from what the account holds. Assuming "nothing" for a subscriber with six
months left would overwrite those six months with one, and they would have paid to lose time.
Nothing is provisionable during a Client API outage anyway, since provisioning reads the same API.

### Grandfathered lifetime licences

The €24 perpetual licences sold before the switch keep `expiresAt: null` for good. `create-invoice`
answers `{perpetual: true}` rather than charging them, and `provisionPurchase` bails out before
granting — necessary because `grantLicence` *overwrites* the expiry, so dating one of these would
take away the thing it sold.

### Renewal reminders

`/api/renewal-reminders` runs daily from the cron in `vercel.json`, guarded by `CRON_SECRET` (unset
⇒ the route refuses, rather than being an open endpoint that mails every subscriber on demand). It
asks the Client API for licences expiring inside the widest band and writes at 7, 3 and 1 days out,
counted in **calendar** days so a cron that fires at a slightly different time each day cannot skip
a band or repeat one. Nothing auto-renews, so this email is the entire renewal mechanism.

## Download page

A server component with `export const revalidate = 600`. `src/lib/release.ts` fetches the latest
GitHub release once per revalidation window for all visitors, optionally authenticated with
`GITHUB_TOKEN`.

The fetch used to run in the browser on every visit, against a 60-requests-per-hour-per-IP limit —
so visitors sharing an office or VPN address saw "Could not fetch release info". Keep it on the
server.

Assets are matched by extension:

| Extension | Platform |
|---|---|
| `.AppImage` | Linux AppImage |
| `.tar.gz` | Linux tar.gz |
| `.zip` | Windows |

macOS is hardcoded as a disabled "Coming soon" card. When a build exists, add a `.dmg` match and
enable it — and lift the macOS caveats that now qualify the claim in `Hero.tsx`, `CrossPlatform.tsx`,
the `operatingSystem` field of the landing-page JSON-LD, and the download page's `metadata.title`.

A missing asset renders a link to the GitHub releases index, never a greyed-out pill — the old
placeholder was indistinguishable from a disabled button.

## Screenshots

`public/screenshots/` and `screenshots.config.json` are currently unused by the site. The captures
in them are CI-runner screenshots of an idle shell — almost entirely empty black — and showing them
was worse than showing nothing. Re-capture from a real machine with real work on screen before
adding a gallery section back.

## Design tokens

All colours are CSS custom properties defined in `src/app/globals.css` via Tailwind v4's
`@theme inline` block. Use them in JSX with `style={{ color: "var(--color-accent)" }}` etc.

| Token | Value | Role |
|---|---|---|
| `--color-background` | `#0c0c0f` | Page background |
| `--color-surface` | `#13131a` | Card backgrounds |
| `--color-surface-2` | `#1c1c26` | Table header / footer rows, disabled states |
| `--color-border` | `#252535` | All borders and dividers |
| `--color-foreground` | `#e2e2ec` | Primary text |
| `--color-muted` | `#6a6a85` | Secondary / label text |
| `--color-accent` | `#e07040` | Orange CTAs, icons, highlights |
| `--color-accent-dim` | `rgba(224,112,64,0.12)` | Icon badge backgrounds, pill backgrounds |
| `--color-blue` | `#4d9de0` | Spare; not yet used |

### Shared classes

`globals.css` also defines the interactive states, so components no longer mutate `style` from
`onMouseEnter`/`onMouseLeave` handlers — those never fired on touch and left keyboard users with no
feedback at all.

| Class | Use |
|---|---|
| `.cpt-accent-btn` | Primary orange button/link, with hover, active and disabled states |
| `.cpt-quiet` | Muted control that brightens on hover |
| `:focus-visible` | A global accent focus ring — do not remove it per-component |

## Stack notes

- **Next.js 16 / React 19** — check `node_modules/next/dist/docs/` before writing Next-specific
  code; v16 has breaking API changes (see `AGENTS.md`). Route segment config such as `revalidate`
  must be a literal, not an imported constant.
- **Tailwind CSS v4** — configured via `@theme inline` in CSS, not `tailwind.config.*`. There is no
  `tailwind.config.ts`.
- **Fonts** — Geist Sans (`--font-sans`) and Geist Mono (`--font-mono`) loaded via
  `next/font/google` in `layout.tsx` and exposed as CSS vars.
- **`"use client"`** — `Navbar`, `TerminalDemo` and `Pricing` only. Everything else, the download
  page included, is a server component.
- **Internal links use `next/link`.** Plain `<a>` to an internal route trips the ESLint rule.

## Keeping the copy true

The site makes claims about a product that ships on its own schedule, so the claims rot. Two
things guard against it:

- **`/release-sync`** (`.claude/commands/release-sync.md`) audits the site against the CPT source
  and proposes changes. It reads PR bodies rather than release notes, because the notes are
  one-line summaries that name a PR without describing it.
- **`docs/release-sync.md`** is the ledger it keeps: last release reviewed, what was accepted,
  and what was rejected with the reason. The rejection log is the point — it stops the next run
  re-proposing something already turned down.

### Verifying against the real product

Source-reading catches wrong *facts*. It does not catch a hero demo that draws an app which no
longer looks like that. Two scripts close that gap; both work with only Python 3 and Firefox.

| Script | What it does |
|---|---|
| `scripts/capture-product.sh` | Builds CPT and captures real screenshots |
| `scripts/capture-site.sh` | Screenshots this site for the same-eyes comparison |
| `scripts/pngcrop.py` | Crops and magnifies a region — chrome is a few pixels tall and unjudgeable at full-page scale |
| `scripts/bmp2png.py` | Converts what `cpt --screenshot` writes |

**The scenarios are not defined here.** They are the CPT repo's own screenshot tests
(`tests/screenshot/tests/*.sh`), maintained alongside the features they capture, and
`capture-product.sh` runs them unmodified — `--list` shows them. It supplies a `convert` shim
backed by `bmp2png.py` so those scripts run without ImageMagick installed.

**`capture-site.sh` only proves what the server rendered.** A headless screenshot fires at the
`load` event, and nothing that depends on React having hydrated is reliably in the picture — the
demo player, and anything positioned by an effect, such as the simulated cursor. That is fine for
most of this site, because the demo's still frame is server-rendered, but it means a capture can
show a JS-driven feature as absent when it works perfectly in a browser. Do not conclude a feature
is broken from a capture alone; check whether it needs JS first. Delaying the `load` event with a
slow stylesheet was tried and did not help.

**The dev server can serve stale CSS.** Turbopack has been observed serving an old `globals.css`
chunk through edits and even restarts — at one point returning `opacity: 1` for a rule the file
declared as `0`, which made a correct change look broken and an earlier diagnostic look correct.
`npm run build` output is trustworthy; when a CSS change appears not to apply, compare the served
chunk against the file before changing the code, and clear `.next/dev` and restart.

Two traps, both of which make a working page look broken:

- **A headless screenshot renders one frame at animation time zero.** The demo's tabs and panes
  animate in from `opacity: 0` with `animation-fill-mode: both`, so they capture as invisible.
  `capture-site.sh` forces `ui.prefersReducedMotion`, which collapses every animation to 0.01ms.
- **The demo is a timing loop**, so an unforced capture photographs whichever step it was on.
  Reduced motion also pins it to `stillFrame()` — the end of the script, and the only
  deterministic frame.

`TerminalDemo.tsx` is hand-drawn HTML imitating the product's chrome. Nothing tests it and nothing
breaks when the app changes, so it drifts silently. What it got wrong, found by comparing it to a
capture in September 2026: a `File` and `View` menu removed from the product in #6; a status-bar AI
badge with a live token counter, when the badge is drawn inside the pane
(`TerminalWidget::renderAiOverlay`) and **no token counter exists anywhere in CPT**; square
flush panes, when the shipped default is rounded cards with a gutter; and the wrong tab accents.
The product draws a **red** top accent on the active view tab (`ViewManager.cpp`) and a **blue**
one on the active pane tab (`WidgetTabBar.cpp`) — `--color-view-tab` and `--color-pane-tab` in
`globals.css` are those two, sampled from a real capture.

### The shortcut table

`shortcutGroups` in `CrossPlatform.tsx` is the site's copy of a table that lives in the product.
Its source of truth is `ShortcutManager::registerAllDefaults()` in the CPT repo, plus the combos
`TerminalWidget` and `App` handle inline — copy/paste, `Ctrl+1..9`, `Alt+1..9`, `Alt+Home/End`.
The struct is `{key, ctrl, shift, alt}`; read the flags, do not guess from the action name.

Claims that failed this check in September 2026, all of which had shipped for months:

| Claim | Reality |
|---|---|
| "Split right — `Ctrl+Shift+F`" | `terminal.fullscreen` |
| "Split below — `Ctrl+Shift+G`" | Unbound; there are no split shortcuts at all |
| "Paste image — `Ctrl+V`" | Sends `0x16` to the PTY. Nothing reads an image off the clipboard |
| "Windows ConPTY throttles large pastes, CPT bypasses this" | `ConPtyTerminal::write` is one plain `WriteFile`. No such mechanism |
| "Available for Linux, Windows & macOS" | No macOS build; the FAQ and download page both said so already |

A second pane comes from `Ctrl+Shift+T`, whose effect depends on **Settings → Terminal → New
terminal as separate widget** (default on: a pane; off: a tab beside the current one).
