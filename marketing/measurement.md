# Measurement

Vercel Web Analytics and Speed Insights are already wired in `src/app/layout.tsx`. This is what to
look at and, more importantly, what to ignore.

## The only funnel that matters

```
session  →  /pricing  →  checkout started  →  paid
```

Everything else is a vanity number. A comparison page with 2,000 visits and no `/pricing` clicks is
a page that ranks and does not sell — which is worth knowing, and is not worth celebrating.

**Checkout started** is the invoice creation in `src/app/api/create-invoice/route.ts`. **Paid** is
the NOWPayments webhook. Neither is in Vercel Analytics, so the last two steps have to be counted
from server logs or added as custom events. Until they are, the funnel is guesswork past
`/pricing`, and it is worth an hour to close that gap before spending a month on channels.

## Per channel

Tag every link you post by hand:

| Channel | Suffix |
|---|---|
| Reddit reply | `?ref=reddit` |
| Hacker News | `?ref=hn` |
| Mastodon / X / Bluesky | `?ref=social` |
| YouTube description | `?ref=yt` |
| Reviewer | `?ref=<their-name>` |

Search traffic needs no tag — it arrives as organic and the landing page tells you which page did
the work.

## Review cadence

**Weekly**, five minutes: which pages got traffic, and did any of it reach `/pricing`.

**Monthly**, half an hour:

- Which `/vs/*` and `/guides/*` pages are ranking, and for what.
- Which produced a paid conversion. Not a click — a payment.
- Kill anything with 60 days and no conversions. Write down why before you kill it.

## What to expect

- **SEO: nothing for about three months**, then it compounds. Do not judge the comparison pages in
  week three and do not rewrite them out of impatience.
- **Social: a spike per release, decaying within a day.** The value is cumulative presence, not any
  single post.
- **HN: one enormous day, then near zero.** Judge it on purchases in the following week, not on
  points.
- **Reviewer video: a long tail.** The only channel here that still sends traffic six months later.

## Numbers worth writing down each month

Keep it to one line per month in a file. Six months of this is worth more than any dashboard.

```
2026-09  sessions 0000  /pricing 000  checkouts 00  paid 0  notes: ...
```

## What not to measure

Impressions, follower counts, time on page, bounce rate. None of them change a decision, and
watching them is how a week disappears.
