/** Small financial maths helpers shared by personas, projection and tests. */
import type { Cents } from './types';

/**
 * Monthly annuity payment for a loan.
 * M = P * r / (1 - (1 + r)^-n), with r the monthly rate and n the number of months.
 */
export function annuityPayment(principalCents: Cents, annualRate: number, months: number): Cents {
  if (months <= 0) return 0;
  if (principalCents <= 0) return 0;
  const r = annualRate / 12;
  if (r === 0) return Math.round(principalCents / months);
  const factor = r / (1 - Math.pow(1 + r, -months));
  return Math.round(principalCents * factor);
}

/** Remaining principal after one month: interest accrues, then the payment is applied. */
export function amortizeMonth(
  principalCents: Cents,
  annualRate: number,
  paymentCents: Cents,
): { principalCents: Cents; interestCents: Cents; capitalCents: Cents } {
  const interestCents = Math.round(principalCents * (annualRate / 12));
  const capitalCents = Math.min(principalCents, paymentCents - interestCents);
  return { principalCents: Math.max(0, principalCents - capitalCents), interestCents, capitalCents };
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const v = values.reduce((a, b) => a + (b - m) * (b - m), 0) / (values.length - 1);
  return Math.sqrt(v);
}

export function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
