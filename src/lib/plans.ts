/**
 * The subscription: what it costs, how long a payment buys, and how that turns into a licence
 * expiry date.
 *
 * This is the only place a price or a period length is written down. `create-invoice` charges from
 * it, the webhook dates the licence from it, and the pricing card renders from it, so the three can
 * never drift from each other the way the copy and the checkout once did.
 *
 * ## Why a subscription is prepaid here
 *
 * Crypto payments cannot be auto-charged: there is no stored instrument to bill, and the
 * NOWPayments SDK we use exposes only one-off invoices. So every period is bought before it starts.
 * A payment moves the licence's `expiresAt` forward; when nobody pays, it lapses on its own —
 * the Client API stops returning expired licences, and the Terminal API re-checks on every session
 * poll, so access ends without anything here having to revoke it.
 */

export type PlanId = "monthly" | "yearly";

export interface Plan {
  id: PlanId;
  /** How many months one payment buys. */
  months: number;
  /** What that payment costs, in EUR. */
  amount: number;
  label: string;
  /** Price per month, for the "works out at" line. Derived — never quote it as the charge. */
  perMonth: number;
  /** Percent saved against paying monthly for the same span. 0 for the monthly plan itself. */
  savingPercent: number;
}

const MONTHLY_AMOUNT = 7.49;
const YEARLY_AMOUNT = 67.41; // 12 × 7.49 = 89.88, less 25%

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export const PLANS: Record<PlanId, Plan> = {
  monthly: {
    id: "monthly",
    months: 1,
    amount: MONTHLY_AMOUNT,
    label: "Monthly",
    perMonth: MONTHLY_AMOUNT,
    savingPercent: 0,
  },
  yearly: {
    id: "yearly",
    months: 12,
    amount: YEARLY_AMOUNT,
    label: "Yearly",
    perMonth: round2(YEARLY_AMOUNT / 12),
    savingPercent: Math.round((1 - YEARLY_AMOUNT / (MONTHLY_AMOUNT * 12)) * 100),
  },
};

export const DEFAULT_PLAN: PlanId = "yearly";

export function isPlanId(value: unknown): value is PlanId {
  return value === "monthly" || value === "yearly";
}

/**
 * Days of access granted past the end of the paid-for period.
 *
 * A crypto payment can take an hour to confirm and a renewal can land on a Sunday, so cutting
 * access at the exact second the period ends locks people out while their own renewal is in
 * flight. The grace is deliberately *not* part of the period: it is added when the expiry is
 * written and taken back off when the next period is measured, so it cannot compound into a free
 * month across a year of renewals — see `paidThroughOf`.
 */
export const GRACE_DAYS = 3;

const DAY_MS = 86_400_000;

/**
 * Adds calendar months, clamping to the end of a shorter month.
 *
 * Plain `setMonth` overflows: 31 January plus one month lands on 3 March, which would hand out two
 * extra days every time a subscription renewed from a long month.
 */
export function addMonths(from: Date, months: number): Date {
  const result = new Date(from.getTime());
  const day = result.getUTCDate();

  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);

  const lastDayOfTargetMonth = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)
  ).getUTCDate();

  result.setUTCDate(Math.min(day, lastDayOfTargetMonth));
  return result;
}

/** The expiry we actually store: the end of the paid period, plus the grace window. */
export function expiryFor(paidThrough: Date): Date {
  return new Date(paidThrough.getTime() + GRACE_DAYS * DAY_MS);
}

/**
 * The inverse of `expiryFor`: recovers the paid-through date from a stored expiry.
 *
 * Renewals measure the next period from here rather than from the raw expiry, which is what keeps
 * the grace window from being re-granted — and so compounding — on every renewal.
 */
export function paidThroughOf(expiresAt: Date): Date {
  return new Date(expiresAt.getTime() - GRACE_DAYS * DAY_MS);
}

/**
 * Where the next period should start.
 *
 * A subscriber renewing early keeps the time they have already paid for: the new period is stacked
 * on the end of the current one rather than starting today. Someone whose licence has lapsed
 * starts from now instead — backdating would sell them days that had already gone by.
 */
export function nextPeriodStart(now: Date, currentExpiresAt: Date | null): Date {
  if (!currentExpiresAt) return now;

  const paidThrough = paidThroughOf(currentExpiresAt);
  return paidThrough > now ? paidThrough : now;
}

/*
 * ## The order id, and why the period is encoded in it
 *
 * NOWPayments redelivers webhooks, and there is no database on this side to remember which
 * payments have been honoured. "Extend by one month" is therefore unsafe: a redelivery would
 * extend a second time, and a buyer who pays once would get two months.
 *
 * So the webhook computes an *absolute* expiry from values fixed when the invoice was created —
 * the period length, and the point the period is measured from. Writing the same absolute date
 * twice is a no-op, which makes redelivery harmless without any state being kept.
 *
 * `start` is `max(base, payment time)`: `base` carries whatever the buyer had already paid for, so
 * an early renewal keeps it, while a buyer who leaves the checkout open for a day and pays later
 * measures from when they actually paid rather than from when the tab was opened.
 */

const ORDER_PREFIX = "cpt";
const ORDER_VERSION = "v2";

export interface OrderTerms {
  months: number;
  /** The paid-through date the invoice was quoted against. */
  base: Date;
}

export function encodeOrderId({ months, base }: OrderTerms): string {
  const nonce = Math.random().toString(36).slice(2, 10);
  return [ORDER_PREFIX, ORDER_VERSION, months, base.getTime(), nonce].join(".");
}

/**
 * Reads the terms back out of an order id. Returns null for anything this version did not write —
 * see the legacy note in the payment webhook.
 */
export function decodeOrderId(orderId: unknown): OrderTerms | null {
  if (typeof orderId !== "string") return null;

  const [prefix, version, monthsRaw, baseRaw] = orderId.split(".");
  if (prefix !== ORDER_PREFIX || version !== ORDER_VERSION) return null;

  const months = Number(monthsRaw);
  const baseMs = Number(baseRaw);

  if (!Number.isInteger(months) || months <= 0 || months > 24) return null;
  if (!Number.isFinite(baseMs) || baseMs <= 0) return null;

  return { months, base: new Date(baseMs) };
}

/**
 * The order ids written by the one-off €24 lifetime product: `cpt-<timestamp>`.
 *
 * An invoice created moments before the subscription shipped can still be paid afterwards, and
 * that buyer paid for a licence that never expires. Recognising the old shape explicitly is what
 * lets the webhook honour it without also treating every unparseable id as a free lifetime
 * licence. Safe to delete once no invoice from before the switch can still be outstanding.
 */
export function isLegacyOrderId(orderId: unknown): boolean {
  return typeof orderId === "string" && /^cpt-\d+$/.test(orderId);
}

/** The expiry a payment on these terms should produce. Deterministic, hence safe to recompute. */
export function expiryForOrder(terms: OrderTerms, paidAt: Date): Date {
  const start = terms.base > paidAt ? terms.base : paidAt;
  return expiryFor(addMonths(start, terms.months));
}

/** e.g. "8 April 2027". Used in emails and in the checkout, so both phrase a date the same way. */
export function formatDate(value: Date): string {
  return value.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
