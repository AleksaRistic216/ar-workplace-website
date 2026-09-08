import { getExpiringLicences } from "@/lib/client-api";
import { sendRenewalReminder } from "@/lib/email";
import { GRACE_DAYS, paidThroughOf } from "@/lib/plans";

/**
 * The renewal nudge, run once a day by the Vercel cron in `vercel.json`.
 *
 * Nothing here charges anyone. A crypto subscription has no stored instrument to bill, so renewing
 * is an action the subscriber has to take, and this email is the only thing that prompts it —
 * without it a subscription lapses because someone forgot, not because they decided to stop.
 */

/** Days before the period ends that we write. One email per band, so three over the last week. */
const BANDS = [7, 3, 1];

const DAY_MS = 86_400_000;

/**
 * Whole days from today to `date`, counted in calendar days rather than elapsed hours.
 *
 * The cron does not fire at the same second every day. Measuring elapsed hours would let a
 * subscription drift across a band boundary and get an email twice, or step over one and get none;
 * counting UTC dates makes each band fire on exactly one day whatever time the run happens.
 */
function calendarDaysUntil(date: Date, now: Date): number {
  const startOfDay = (value: Date) =>
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());

  return Math.round((startOfDay(date) - startOfDay(now)) / DAY_MS);
}

function authorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET;

  // Fail closed. Without a secret configured this would be an open endpoint that emails every
  // subscriber on demand, so it refuses to run at all rather than run unauthenticated.
  if (!secret) return false;

  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorised(request)) {
    return Response.json({ error: "Unauthorised" }, { status: 401 });
  }

  const now = new Date();

  let expiring;
  try {
    // The stored expiry carries the grace window on top of the period, so the furthest band has to
    // be widened by it to catch a subscription whose *period* ends seven days out.
    expiring = await getExpiringLicences(Math.max(...BANDS) + GRACE_DAYS);
  } catch (e) {
    console.error("[reminders] Could not list expiring subscriptions:", e);
    return Response.json({ error: "Lookup failed" }, { status: 500 });
  }

  let sent = 0;
  const failed: string[] = [];

  for (const { username, expiresAt } of expiring) {
    // Reminders talk about the period the subscriber paid for, not the grace window behind it.
    const endsAt = paidThroughOf(expiresAt);
    const daysLeft = calendarDaysUntil(endsAt, now);

    if (!BANDS.includes(daysLeft)) continue;
    if (!username.includes("@")) continue; // the username is the address we email

    try {
      await sendRenewalReminder(username, endsAt, daysLeft);
      sent += 1;
    } catch (e) {
      // One bad address must not cost everyone else their reminder.
      console.error(`[reminders] Send failed for ${username}:`, e);
      failed.push(username);
    }
  }

  console.log(`[reminders] Considered ${expiring.length}, sent ${sent}, failed ${failed.length}`);

  return Response.json({ considered: expiring.length, sent, failed: failed.length });
}
