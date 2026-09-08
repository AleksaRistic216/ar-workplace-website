import assert from "node:assert/strict";
import test from "node:test";

import {
  addMonths,
  decodeOrderId,
  encodeOrderId,
  expiryFor,
  expiryForOrder,
  GRACE_DAYS,
  isLegacyOrderId,
  nextPeriodStart,
  paidThroughOf,
  PLANS,
} from "./plans.ts";

/*
 * The subscription's date arithmetic decides how much access a payment buys, so every bug in here
 * is either a customer losing time they paid for or a free period being handed out. Run with
 * `npm test`.
 */

const utc = (iso: string) => new Date(`${iso}T00:00:00Z`);
const day = (date: Date) => date.toISOString().slice(0, 10);

test("addMonths clamps to the end of a shorter month", () => {
  // Plain setMonth overflows 31 January into 3 March, which would hand out two extra days every
  // time a subscription renewed from a long month.
  assert.equal(day(addMonths(utc("2027-01-31"), 1)), "2027-02-28");
  assert.equal(day(addMonths(utc("2027-03-31"), 1)), "2027-04-30");
  assert.equal(day(addMonths(utc("2028-02-29"), 12)), "2029-02-28");
  assert.equal(day(addMonths(utc("2027-01-15"), 12)), "2028-01-15");
});

test("the grace window round-trips and does not compound", () => {
  assert.equal(day(expiryFor(utc("2027-06-10"))), "2027-06-13");
  assert.equal(day(paidThroughOf(expiryFor(utc("2027-06-10")))), "2027-06-10");

  // Twelve monthly renewals must land exactly a year on. Measuring each new period from the raw
  // expiry instead of the paid-through date would re-grant the grace every time and drift a
  // month and a half into the customer's favour over a year.
  let paidThrough = utc("2027-01-01");
  for (let i = 0; i < 12; i++) {
    paidThrough = addMonths(paidThroughOf(expiryFor(paidThrough)), 1);
  }
  assert.equal(day(paidThrough), "2028-01-01");
});

test("a period starts from unused time, or from today once it has lapsed", () => {
  const now = utc("2027-05-01");

  // Renewing early keeps what is already paid for — the new period stacks on the end.
  assert.equal(day(nextPeriodStart(now, expiryFor(utc("2027-08-01")))), "2027-08-01");

  // A lapsed subscription starts today; backdating would sell days that had already gone by.
  assert.equal(day(nextPeriodStart(now, expiryFor(utc("2027-01-01")))), "2027-05-01");
  assert.equal(day(nextPeriodStart(now, null)), "2027-05-01");
});

test("order ids round-trip the terms", () => {
  const base = utc("2027-05-01");
  const terms = decodeOrderId(encodeOrderId({ months: 12, base }));

  assert.ok(terms);
  assert.equal(terms.months, 12);
  assert.equal(terms.base.getTime(), base.getTime());
});

test("the same payment always yields the same expiry", () => {
  // This is the property that makes a redelivered NOWPayments webhook a no-op. Without it, a
  // redelivery would extend a second time and one payment would buy two periods.
  const order = encodeOrderId({ months: 1, base: utc("2027-05-01") });
  const paidAt = new Date("2027-05-02T09:30:00Z");

  const first = expiryForOrder(decodeOrderId(order)!, paidAt);
  const second = expiryForOrder(decodeOrderId(order)!, paidAt);

  assert.equal(first.getTime(), second.getTime());
});

test("the period is measured from the later of the invoice and the payment", () => {
  // Paying a fortnight after opening the checkout must not quietly lose that fortnight.
  assert.equal(
    day(expiryForOrder({ months: 1, base: utc("2027-05-01") }, utc("2027-05-20"))),
    "2027-06-23"
  );

  // ...but an early renewal is still measured from the time the buyer already holds.
  assert.equal(
    day(expiryForOrder({ months: 1, base: utc("2027-09-01") }, utc("2027-05-20"))),
    "2027-10-04"
  );
});

test("only the old one-off order shape counts as legacy", () => {
  // A legacy order is honoured as a perpetual licence, so nothing else may be mistaken for one.
  assert.equal(isLegacyOrderId("cpt-1757000000000"), true);
  assert.equal(isLegacyOrderId(encodeOrderId({ months: 1, base: utc("2027-05-01") })), false);
  assert.equal(isLegacyOrderId("nonsense"), false);

  assert.equal(decodeOrderId("cpt-1757000000000"), null);
  assert.equal(decodeOrderId("nonsense"), null);
  assert.equal(decodeOrderId(undefined), null);
  assert.equal(decodeOrderId("cpt.v2.0.123.abc"), null); // a zero-month period buys nothing
  assert.equal(decodeOrderId("cpt.v2.99.123.abc"), null); // and 99 months is not a plan
});

test("the prices the site quotes are the prices the checkout charges", () => {
  assert.equal(PLANS.monthly.amount, 7.49);
  assert.equal(PLANS.monthly.months, 1);
  assert.equal(PLANS.yearly.amount, 67.41);
  assert.equal(PLANS.yearly.months, 12);

  // Both are rendered in the pricing card, so a rounding change would show up as wrong copy.
  assert.equal(PLANS.yearly.perMonth, 5.62);
  assert.equal(PLANS.yearly.savingPercent, 25);

  assert.equal(GRACE_DAYS, 3);
});
