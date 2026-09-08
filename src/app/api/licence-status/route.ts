import { getLicence } from "@/lib/client-api";
import { paidThroughOf } from "@/lib/plans";

/**
 * Tells the checkout whether a payment has finished landing.
 *
 * Crypto payments confirm out of band: the buyer pays in the NOWPayments widget, the IPN reaches
 * `/api/payment-webhook` some seconds or minutes later, and only then is the licence dated. The
 * checkout polls this so it can say "done" when it is actually done. The old flow had a button the
 * buyer pressed themselves, which reported success to people who had paid nothing and to people
 * whose provisioning had not run yet.
 *
 * `notBefore` is what makes this work for renewals. A renewing subscriber *already* holds a
 * licence, so "do they have one" would answer yes before their payment was honoured and show a
 * success screen for a period they had not been given. The checkout passes back the expiry the
 * invoice was created for, and the answer is yes only once the licence actually reaches it.
 * Granting is the last step of `provisionPurchase`, so that date is exactly the "fully provisioned,
 * email sent" marker.
 */

/** Absorbs sub-second truncation between the date we computed and the one the database returns. */
const TOLERANCE_MS = 60_000;

/**
 * Best-effort throttle. This reveals whether an address owns a licence, so it should not be a free
 * enumeration oracle — though it exposes nothing `/api/create-invoice` does not already. Memory is
 * per serverless instance, so treat this as friction against a naive loop, not a real rate limiter.
 */
const hits = new Map<string, { n: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 40;

function throttled(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);

  if (!entry || now > entry.resetAt) {
    hits.set(ip, { n: 1, resetAt: now + WINDOW_MS });
    if (hits.size > 5000) {
      for (const [key, value] of hits) if (now > value.resetAt) hits.delete(key);
    }
    return false;
  }

  entry.n += 1;
  return entry.n > MAX_PER_WINDOW;
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (throttled(ip)) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }

  const { email, notBefore } = await request.json().catch(() => ({ email: null }));

  if (!email || !String(email).includes("@")) {
    return Response.json({ error: "Valid email required" }, { status: 400 });
  }

  const target = notBefore ? new Date(String(notBefore)) : null;
  const wanted = target && !Number.isNaN(target.getTime()) ? target : null;

  try {
    const licence = await getLicence(String(email));

    if (!licence) {
      return Response.json({ provisioned: false });
    }

    // A grandfathered lifetime licence outlasts any date the checkout could ask about.
    if (licence.expiresAt === null) {
      return Response.json({ provisioned: true, expiresAt: null });
    }

    const provisioned =
      !wanted || licence.expiresAt.getTime() >= wanted.getTime() - TOLERANCE_MS;

    return Response.json({
      provisioned,
      endsAt: provisioned ? paidThroughOf(licence.expiresAt).toISOString() : null,
    });
  } catch (e) {
    // A lookup outage must not look like a failed purchase: report "not yet" and let the buyer
    // fall back to their email.
    console.error("[licence-status] Lookup failed:", e);
    return Response.json({ provisioned: false, unavailable: true });
  }
}
