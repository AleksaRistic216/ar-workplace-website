import { Resend } from "resend";

import { formatDate, GRACE_DAYS, paidThroughOf } from "@/lib/plans";

const FROM = process.env.RESEND_FROM ?? "Cross Platform Terminal <noreply@crossplatformterminal.com>";

const PORTAL_URL = process.env.CLIENT_PORTAL_URL ?? "https://client.limitlesssoft.com";
const RENEW_URL = "https://crossplatformterminal.com/#pricing";

async function send(to: string, subject: string, lines: string[]): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured");

  const { error } = await new Resend(apiKey).emails.send({
    from: FROM,
    to,
    subject,
    text: lines.join("\n"),
  });

  if (error) throw new Error(`Email send failed: ${error.message}`);
}

/**
 * How every email states the end of the paid period.
 *
 * The stored expiry carries the grace window on top of the period, so quoting it raw would advertise
 * three days the buyer did not pay for and make the next renewal date look wrong. This says the
 * date access is good through, and mentions the grace as the cushion it is rather than as a term.
 *
 * `null` is one of the grandfathered lifetime licences.
 */
function periodLines(expiresAt: Date | null): string[] {
  if (!expiresAt) {
    return ["Your licence does not expire — there is nothing to renew."];
  }

  return [
    `Your subscription runs to ${formatDate(paidThroughOf(expiresAt))}.`,
    "",
    `Renew any time before then at ${RENEW_URL} and the new period is added on to the end of`,
    `the current one, so renewing early costs you nothing. We will email you before it runs out.`,
    `There is a ${GRACE_DAYS}-day cushion after that date so a renewal still confirming cannot lock`,
    "you out.",
  ];
}

/**
 * Sends a new subscriber their sign-in details. The password is generated per purchase and is not
 * stored anywhere on this side, so this email is the only copy — a send failure has to fail the
 * caller loudly rather than be swallowed.
 */
export async function sendCredentials(
  email: string,
  password: string,
  expiresAt: Date | null
): Promise<void> {
  await send(email, "Your Cross Platform Terminal subscription", [
    "Thanks for subscribing to Cross Platform Terminal.",
    "",
    "Sign in from the app with:",
    "",
    `  Username: ${email}`,
    `  Password: ${password}`,
    "",
    "Open the app and sign in when prompted. Your subscription covers this account,",
    "and you can release a device from the licence dialog to move to another machine.",
    "",
    ...periodLines(expiresAt),
    "",
    "Keep this email — the password is not stored anywhere and cannot be shown again.",
  ]);
}

/**
 * For a payment on an account that already existed — a lapsed subscriber coming back, or someone
 * who already uses another Limitless Soft product. We never learn their password, so there is
 * nothing to send them but the news that the subscription is on it.
 */
export async function sendLicenceAdded(email: string, expiresAt: Date | null): Promise<void> {
  await send(email, "Your Cross Platform Terminal subscription", [
    "Thanks for subscribing to Cross Platform Terminal.",
    "",
    `The subscription has been added to your existing account (${email}).`,
    "Sign in from the app with the password you already use.",
    "",
    ...periodLines(expiresAt),
    "",
    "If you have forgotten your password, reply to this email and we will sort it out.",
  ]);
}

/** Confirms a renewal on a subscription that had not lapsed. */
export async function sendRenewed(email: string, expiresAt: Date | null): Promise<void> {
  await send(email, "Cross Platform Terminal — subscription renewed", [
    "Thanks for renewing Cross Platform Terminal.",
    "",
    ...periodLines(expiresAt),
    "",
    "Nothing to do in the app — it picks the new date up the next time it checks in.",
    `Manage your account at ${PORTAL_URL}`,
  ]);
}

/**
 * The nudge before a subscription lapses.
 *
 * A crypto subscription cannot auto-charge, so this email is the entire renewal mechanism: a
 * subscriber who is not reminded simply stops being one, having chosen nothing.
 */
export async function sendRenewalReminder(
  email: string,
  endsAt: Date,
  daysLeft: number
): Promise<void> {
  const when = daysLeft === 1 ? "tomorrow" : `in ${daysLeft} days`;

  await send(email, `Your Cross Platform Terminal subscription ends ${when}`, [
    `Your Cross Platform Terminal subscription runs out ${when}, on ${formatDate(endsAt)}.`,
    "",
    `Renew at ${RENEW_URL}`,
    "",
    "Crypto payments cannot be charged automatically, so renewing is something you have to do",
    "yourself — this email is the reminder, not a receipt. The new period is added on to the end",
    "of the current one, so renewing now costs you nothing in unused time.",
    "",
    "If you would rather stop here, there is nothing to cancel: the subscription simply ends and",
    "the app stops opening. Your account and settings stay where they are if you come back.",
  ]);
}
