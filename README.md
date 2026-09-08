# Cross Platform Terminal — marketing site

The public site for Cross Platform Terminal (CPT): landing page, download page, and the checkout
that provisions a licence.

Built with Next.js 16 (App Router, Turbopack) and Tailwind CSS 4. Deployed on Vercel.

## Running locally

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # production build
npm run lint
```

## Environment

Checkout and provisioning need these set (see `.env`):

| Variable | Purpose |
|---|---|
| `NOWPAYMENTS_API_KEY` / `NOWPAYMENTS_IPN_SECRET` | Crypto checkout and webhook signature |
| `INTER_APP_API_KEY` | Auth for the Client API — server only, never expose |
| `CLIENT_API_BASE_URL` | Client API host (defaults to the production one) |
| `CPT_APPLICATION_ID` / `CPT_LICENCE_ID` | Which application and licence tier to grant |
| `CLIENT_PORTAL_URL` | Where existing customers manage their account |
| `RESEND_API_KEY` / `RESEND_FROM` | Licence emails |
| `DISCOUNT_CODES` | `CODE:PERCENT,CODE:PERCENT`; 100% provisions without payment |
| `CRON_SECRET` | Bearer token for `/api/renewal-reminders`. Unset ⇒ the route refuses to run |
| `GITHUB_TOKEN` | Optional. Lifts the rate limit on the release lookup |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin for metadata, sitemap and robots |

## What the product costs

**€7.49 a month, or €67.41 a year.** `src/lib/plans.ts` is the only place those numbers are
written down — the checkout charges from it, the webhook dates the licence from it, and the pricing
card renders from it.

It is a *prepaid* subscription, not a recurring one. Crypto cannot be auto-charged: there is no
stored instrument to bill and the NOWPayments SDK exposes only one-off invoices, so every period is
bought before it starts and a payment pushes the licence's `expiresAt` forward. A subscription
lapses on its own when nobody pays — the Client API stops returning expired licences, and the
Terminal API re-checks on every session poll, so nothing here has to revoke anything. Renewal
reminders are therefore the whole retention mechanism; see the cron in `vercel.json`.

Perpetual €24 licences sold before the switch are grandfathered: `expiresAt` stays null, the
checkout refuses to sell those accounts a subscription, and `provisionPurchase` refuses to date
them. Any copy suggesting they were converted is a bug — see `src/components/FAQ.tsx`, whose
answers are sourced from `src/lib/`.

## Docs

- [`docs/architecture.md`](docs/architecture.md) — routes, component tree, checkout flow
- [`docs/deployment.md`](docs/deployment.md) — deploying
- [`docs/screenshots.md`](docs/screenshots.md) — the screenshot pipeline
- [`docs/release-sync.md`](docs/release-sync.md) — the ledger `/release-sync` keeps of site-vs-product drift

Verifying the site against the real app: `scripts/capture-product.sh` (captures CPT) and
`scripts/capture-site.sh` (captures this site). See the architecture doc.
