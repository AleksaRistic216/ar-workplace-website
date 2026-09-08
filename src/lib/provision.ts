import { createAccount, generatePassword, getLicence, grantLicence } from "@/lib/client-api";
import { sendCredentials, sendLicenceAdded, sendRenewed } from "@/lib/email";

/**
 * How far short of the target expiry still counts as "this payment is already provisioned".
 *
 * The date is recomputed rather than remembered, so the two sides agree to the millisecond in
 * principle; the tolerance absorbs a database truncating sub-second precision, not a real
 * difference. It is far smaller than any period we sell, so it can never swallow a renewal.
 */
const ALREADY_PROVISIONED_TOLERANCE_MS = 60_000;

export type ProvisionOutcome =
  /** A new subscriber: account opened (or adopted) and the licence granted. */
  | "provisioned"
  /** A renewal: the existing subscription was pushed out to the new date. */
  | "renewed"
  /** This exact payment had already been honoured — a redelivered webhook. */
  | "alreadyProvisioned"
  /** The account holds one of the old lifetime licences. Nothing to sell, nothing touched. */
  | "perpetual";

/**
 * Turns a paid-for email address into a working, dated sign-in.
 *
 * Shared by the payment webhook and the 100%-discount path so both provision identically.
 *
 * `expiresAt` is the absolute date the licence should carry once this payment is honoured, worked
 * out by the caller from `lib/plans.ts`. It is absolute rather than a "+1 month" instruction on
 * purpose: NOWPayments redelivers webhooks, there is no database here to record which payments
 * have been seen, and writing the same date twice is a no-op where extending twice would hand out
 * a free month. `null` grants a licence that never expires and is reserved for the legacy path.
 *
 * The order matters. Granting the licence is the *last* step, which makes it the marker for "this
 * purchase is fully provisioned": every earlier failure leaves the licence short of the new date,
 * so a webhook redelivery re-enters here and finishes the job instead of reporting success on a
 * buyer who never received anything. An earlier version granted before emailing, so one dropped
 * email left a paid account permanently unreachable.
 */
export async function provisionPurchase(
  email: string,
  expiresAt: Date | null
): Promise<{ outcome: ProvisionOutcome }> {
  const existing = await getLicence(email);

  /*
   * Grandfathered lifetime licences. `grantLicence` overwrites the expiry rather than extending
   * it, so granting a dated licence to one of these would take away the thing they were sold.
   * `create-invoice` refuses to charge them in the first place; this is the backstop for a
   * payment that somehow got past it.
   */
  if (existing && existing.expiresAt === null) {
    return { outcome: "perpetual" };
  }

  if (
    existing?.expiresAt &&
    expiresAt &&
    existing.expiresAt.getTime() >= expiresAt.getTime() - ALREADY_PROVISIONED_TOLERANCE_MS
  ) {
    return { outcome: "alreadyProvisioned" };
  }

  // A live subscription being pushed out. A lapsed one reads as no licence at all — the Client API
  // drops expired rows — so it takes the path below and is welcomed back rather than "renewed".
  if (existing) {
    // Allowed to throw: better to fail the webhook and be retried than to move the date silently.
    await sendRenewed(email, expiresAt);
    await grantLicence(email, expiresAt);
    return { outcome: "renewed" };
  }

  const password = generatePassword();

  // Safe to repeat: the Client API creates only when the username is free, and tells us which
  // happened. It never resets an existing account's password.
  const created = await createAccount(email, password);

  // Allowed to throw. The generated password is stored nowhere, so if this email does not go out
  // the buyer has no way in — better to fail the webhook and be retried than to grant the licence
  // and call it done.
  if (created) {
    await sendCredentials(email, password, expiresAt);
  } else {
    // The account predates this payment — a lapsed subscriber coming back, or someone who already
    // uses another Limitless Soft product. We do not know their password and must not reset it.
    await sendLicenceAdded(email, expiresAt);
  }

  await grantLicence(email, expiresAt);

  return { outcome: "provisioned" };
}
