import { euroL, formatDateL, formatMoney, formatNumber, l } from '../format';
import type { EnrichedTransaction, Evidence, L10n, Line } from '../types';

/** Small helpers so detectors read like the sentences they produce. */

export function line(nl: string, en: string, value: L10n, strong = false): Line {
  return { label: l(nl, en), value, strong };
}

export function unit(value: number, unitNl: string, unitEn = unitNl, decimals = 0): L10n {
  return {
    nl: `${formatNumber(value, 'nl', decimals)} ${unitNl}`,
    en: `${formatNumber(value, 'en', decimals)} ${unitEn}`,
  };
}

export function pricePer(value: number, per: string): L10n {
  return { nl: `${formatMoney(value, 'nl')} per ${per}`, en: `${formatMoney(value, 'en')} per ${per}` };
}

export function pct(value: number): L10n {
  const n = Math.round(value * 10_000) / 100;
  const decimals = Number.isInteger(n) ? 0 : 2;
  return { nl: `${formatNumber(n, 'nl', decimals)}%`, en: `${formatNumber(n, 'en', decimals)}%` };
}

export function years(value: number): L10n {
  const n = Math.round(value * 10) / 10;
  return { nl: `${formatNumber(n, 'nl', 1)} jaar`, en: `${formatNumber(n, 'en', 1)} years` };
}

export function perYear(value: number): L10n {
  const e = euroL(value);
  return { nl: `${e.nl} per jaar`, en: `${e.en} a year` };
}

/** `Gabriëls, 24 september: € 1.575` as evidence pointing at the transaction. */
export function txEvidence(tx: EnrichedTransaction, nl?: string, en?: string): Evidence {
  const date = formatDateL(tx.date);
  const amount = euroL(Math.abs(tx.amount));
  return {
    transactionId: tx.id,
    date: tx.date,
    amount: tx.amount,
    label: l(nl ?? `${tx.merchantName}, ${date.nl}: ${amount.nl}`, en ?? `${tx.merchantName}, ${date.en}: ${amount.en}`),
  };
}

/** Join names as `A, B en C` / `A, B and C`. */
export function list(names: string[]): L10n {
  if (names.length <= 1) return l(names[0] ?? '', names[0] ?? '');
  const head = names.slice(0, -1).join(', ');
  const last = names[names.length - 1];
  return l(`${head} en ${last}`, `${head} and ${last}`);
}

export const tonnes = (kg: number): L10n => {
  const t = Math.round(kg / 100) / 10;
  return { nl: `${formatNumber(t, 'nl', 1)} ton`, en: `${formatNumber(t, 'en', 1)} tonnes` };
};
