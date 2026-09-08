import { NowPaymentsSDK } from "@nowpaymentsio/nowpayments-sdk-nodejs";
import { provisionPurchase } from "@/lib/provision";
import { decodeOrderId, expiryForOrder, isLegacyOrderId } from "@/lib/plans";

const sdk = new NowPaymentsSDK({
  ipnSecret: process.env.NOWPAYMENTS_IPN_SECRET!,
});

export async function POST(request: Request) {
  const payload = await request.json();
  const sig = request.headers.get("x-nowpayments-sig") ?? "";

  let event;
  try {
    event = sdk.parseWebhook(payload, sig);
  } catch {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  if (event.type !== "payment.status_changed" || event.payment.status !== "paid") {
    return Response.json({ ok: true });
  }

  const email = payload.order_description;
  if (!email || !String(email).includes("@")) {
    console.error("[webhook] No customer email in order_description", payload);
    return Response.json({ error: "Missing customer email" }, { status: 400 });
  }

  const orderId = payload.order_id ?? event.payment.order_id;
  const terms = decodeOrderId(orderId);

  /*
   * How long this payment bought, and when that period starts.
   *
   * The terms were fixed when the invoice was created, so the date below is a pure function of the
   * payment — which is what makes a redelivered webhook a no-op instead of a second month. It is
   * measured from the later of the buyer's existing paid-through date and the moment they actually
   * paid, so an early renewal keeps its unused time and a checkout left open overnight does not
   * quietly lose a day.
   */
  let expiresAt: Date | null;

  if (terms) {
    const paidAt = event.payment.createdAt ? new Date(event.payment.createdAt) : new Date();
    expiresAt = expiryForOrder(terms, Number.isNaN(paidAt.getTime()) ? new Date() : paidAt);
  } else if (isLegacyOrderId(orderId)) {
    // An invoice for the old one-off €24 licence, created before the switch to a subscription and
    // paid after it. They bought a licence that never expires, so that is what they get.
    console.log(`[webhook] Legacy perpetual order ${orderId} for ${email}`);
    expiresAt = null;
  } else {
    /*
     * Neither shape. Retrying cannot turn an unreadable order id into a readable one, so this
     * answers 4xx to stop the redeliveries and leaves a loud log line instead of guessing at a
     * period — the two ways to guess are giving away a lifetime licence and short-changing a
     * paying customer.
     */
    console.error(`[webhook] Unrecognised order id ${JSON.stringify(orderId)} for ${email}`);
    return Response.json({ error: "Unrecognised order id" }, { status: 400 });
  }

  try {
    const { outcome } = await provisionPurchase(String(email), expiresAt);
    console.log(
      `[webhook] ${email}: ${outcome} (payment ${event.payment.payment_id}` +
        `${expiresAt ? `, through ${expiresAt.toISOString()}` : ", perpetual"})`
    );
  } catch (e) {
    console.error("[webhook] Provisioning failed:", e);
    // A non-2xx makes NOWPayments retry, which is what we want here: provisioning recomputes the
    // same absolute expiry every time, and a paid customer with no subscription is worse than a
    // repeated delivery attempt. The body goes to NOWPayments rather than a person, so it stays
    // deliberately vague either way.
    return Response.json({ error: "Provisioning failed" }, { status: 500 });
  }

  return Response.json({ ok: true });
}
