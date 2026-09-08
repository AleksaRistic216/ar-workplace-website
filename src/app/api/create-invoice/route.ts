import { NowPaymentsSDK } from "@nowpaymentsio/nowpayments-sdk-nodejs";
import { getLicence } from "@/lib/client-api";
import { provisionPurchase } from "@/lib/provision";
import {
  addMonths,
  DEFAULT_PLAN,
  encodeOrderId,
  expiryFor,
  isPlanId,
  nextPeriodStart,
  paidThroughOf,
  PLANS,
} from "@/lib/plans";

const sdk = new NowPaymentsSDK({
  apiKey: process.env.NOWPAYMENTS_API_KEY!,
  ipnSecret: process.env.NOWPAYMENTS_IPN_SECRET!,
  ipnCallbackUrl: "https://crossplatformterminal.com/api/payment-webhook",
});

const PORTAL_URL = process.env.CLIENT_PORTAL_URL ?? "https://client.limitlesssoft.com";

function parseDiscountCodes(): Map<string, number> {
  const map = new Map<string, number>();
  for (const entry of (process.env.DISCOUNT_CODES ?? "").split(",")) {
    const [code, pct] = entry.trim().split(":");
    if (code && pct) map.set(code.toUpperCase(), Number(pct));
  }
  return map;
}

export async function POST(request: Request) {
  const { email, discountCode, plan: planId } = await request.json();

  if (!email || !String(email).includes("@")) {
    return Response.json({ error: "Valid email required" }, { status: 400 });
  }

  const plan = PLANS[isPlanId(planId) ? planId : DEFAULT_PLAN];

  /*
   * What they already hold decides what this payment can be. Read it before taking any money:
   * the answer sets the date the licence will carry, and getting it wrong shortens a subscription
   * somebody has paid for.
   */
  let held;
  try {
    held = await getLicence(String(email));
  } catch (e) {
    /*
     * Fail closed. This used to wave the buyer through on the grounds that a lookup blip should
     * not cost a sale, which was harmless while every licence was perpetual — but the date this
     * payment produces is fixed here, from what the account currently holds. Guessing "they have
     * nothing" for a subscriber who has six months left would overwrite those six months with one,
     * and they would have paid to lose time. Nothing is provisionable during a Client API outage
     * anyway, since provisioning reads the same API, so there is no sale to save.
     */
    console.error("[create-invoice] Licence lookup failed, refusing to price the period:", e);
    return Response.json(
      { error: "We couldn't check your account just now. Please try again in a moment." },
      { status: 503 }
    );
  }

  // One of the grandfathered €24 lifetime licences. There is no period to extend and a grant
  // would replace "never expires" with a date, so this account cannot buy a subscription at all.
  if (held && held.expiresAt === null) {
    return Response.json({ perpetual: true, portalUrl: PORTAL_URL });
  }

  const now = new Date();
  const base = nextPeriodStart(now, held?.expiresAt ?? null);
  const newExpiresAt = expiryFor(addMonths(base, plan.months));

  let discountPercent = 0;
  if (discountCode) {
    const codes = parseDiscountCodes();
    const pct = codes.get(String(discountCode).toUpperCase());
    if (pct === undefined) {
      return Response.json({ error: "Invalid discount code" }, { status: 400 });
    }
    discountPercent = pct;
  }

  // 100% discount — provision immediately, no payment to wait for
  if (discountPercent >= 100) {
    try {
      await provisionPurchase(String(email), newExpiresAt);
      return Response.json({ free: true, emailed: true, newExpiresAt: newExpiresAt.toISOString() });
    } catch (e) {
      // Log the real cause; show the buyer something that isn't our configuration.
      console.error("[create-invoice] Free provisioning failed:", e);
      return Response.json(
        { error: "We couldn't set up your subscription. Please contact support." },
        { status: 500 }
      );
    }
  }

  const finalAmount = parseFloat(
    (plan.amount * (1 - discountPercent / 100)).toFixed(2)
  );

  /*
   * The period travels with the order rather than being re-derived when the webhook lands. That is
   * what makes a redelivered webhook harmless: it recomputes the same absolute expiry instead of
   * extending a second time. See the note in `lib/plans.ts`.
   */
  const checkout = await sdk.createCheckout({
    amount: finalAmount,
    currency: "eur",
    orderId: encodeOrderId({ months: plan.months, base }),
    description: String(email),
  });

  return Response.json({
    embedUrl: `https://nowpayments.io/embeds/payment-widget?iid=${checkout.id}`,
    finalAmount,
    discountPercent,
    plan: plan.id,
    months: plan.months,
    renewal: held !== null,
    currentEndsAt: held?.expiresAt ? paidThroughOf(held.expiresAt).toISOString() : null,
    // The date the licence will carry once the payment confirms. The checkout hands this straight
    // back to /api/licence-status, which is how it knows *this* payment landed rather than an
    // older one the account already had.
    newExpiresAt: newExpiresAt.toISOString(),
    newEndsAt: addMonths(base, plan.months).toISOString(),
  });
}
