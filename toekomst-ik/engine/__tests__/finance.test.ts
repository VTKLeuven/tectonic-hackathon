import { test } from 'node:test';
import assert from 'node:assert/strict';
import { annuityPayment, amortizeMonth, median, formatEUR, formatEURCompact, addMonths, addDays, monthsBetween, daysInMonth } from '../index';

test('annuity payment matches the textbook formula', () => {
  // € 250.000 at 3,5 % over 25 years -> about € 1.251,56 per month
  const m = annuityPayment(25_000_000, 0.035, 300);
  assert.ok(Math.abs(m - 125156) <= 2, `got ${m}`);
  // zero rate -> straight line
  assert.equal(annuityPayment(120_000, 0, 12), 10_000);
  assert.equal(annuityPayment(0, 0.03, 12), 0);
});

test('amortisation pays the loan off exactly at the end of the term', () => {
  const principal = 20_000_000;
  const rate = 0.03;
  const n = 240;
  const payment = annuityPayment(principal, rate, n);
  let p = principal;
  for (let i = 0; i < n; i++) p = amortizeMonth(p, rate, payment).principalCents;
  assert.ok(p <= 500 && p >= 0, `remaining ${p} cents`);
});

test('median handles odd and even lengths', () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([4, 1, 3, 2]), 3);
  assert.equal(median([]), 0);
});

test('formatEUR produces Belgian formatting without Intl', () => {
  assert.equal(formatEUR(123456), '€ 1.234,56');
  assert.equal(formatEUR(-1250), '-€ 12,50');
  assert.equal(formatEUR(100000000, { decimals: 0 }), '€ 1.000.000');
  assert.equal(formatEUR(999, { decimals: 0 }), '€ 10');
  assert.equal(formatEUR(5, { signed: true }), '+€ 0,05');
  assert.equal(formatEURCompact(1234567), '€ 12k');
});

test('date helpers are calendar-safe', () => {
  assert.equal(addMonths('2026-01-31', 1), '2026-02-28');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(monthsBetween('2026-09-30', '2029-06-01'), 33);
  assert.equal(daysInMonth(2028, 2), 29);
});
