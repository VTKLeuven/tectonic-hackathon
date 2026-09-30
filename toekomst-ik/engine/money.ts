/** Formatting helpers that do not depend on Intl locale data (Hermes ships without it). */
import type { Cents } from './types';

function groupThousands(intPart: string): string {
  let out = '';
  let count = 0;
  for (let i = intPart.length - 1; i >= 0; i--) {
    out = intPart[i] + out;
    count++;
    if (count % 3 === 0 && i > 0) out = '.' + out;
  }
  return out;
}

export interface FormatEUROptions {
  /** Number of decimals (default 2). */
  decimals?: 0 | 2;
  /** Show a "+" for positive amounts. */
  signed?: boolean;
  /** Omit the currency symbol. */
  bare?: boolean;
}

/** formatEUR(123456) -> "€ 1.234,56"; formatEUR(-1250, {decimals: 0}) -> "-€ 13" */
export function formatEUR(cents: Cents, opts: FormatEUROptions = {}): string {
  const decimals = opts.decimals ?? 2;
  const negative = cents < 0;
  const abs = Math.abs(cents);
  let intPart: number;
  let fracPart = '';
  if (decimals === 0) {
    intPart = Math.round(abs / 100);
  } else {
    intPart = Math.floor(abs / 100);
    fracPart = String(Math.round(abs % 100)).padStart(2, '0');
    if (fracPart === '100') {
      intPart += 1;
      fracPart = '00';
    }
  }
  const body = decimals === 0 ? groupThousands(String(intPart)) : `${groupThousands(String(intPart))},${fracPart}`;
  const symbol = opts.bare ? '' : '€ ';
  if (negative) return `-${symbol}${body}`;
  if (opts.signed && cents > 0) return `+${symbol}${body}`;
  return `${symbol}${body}`;
}

/** Compact form for charts: "€ 12k", "€ 1,2M". */
export function formatEURCompact(cents: Cents): string {
  const abs = Math.abs(cents) / 100;
  const sign = cents < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}€ ${(abs / 1_000_000).toFixed(1).replace('.', ',')}M`;
  if (abs >= 10_000) return `${sign}€ ${Math.round(abs / 1000)}k`;
  if (abs >= 1_000) return `${sign}€ ${(abs / 1000).toFixed(1).replace('.', ',')}k`;
  return `${sign}€ ${Math.round(abs)}`;
}

/** "12 %" style percentage without Intl. */
export function formatPct(fraction: number, decimals = 0): string {
  return `${(fraction * 100).toFixed(decimals).replace('.', ',')} %`;
}

export function euros(n: number): Cents {
  return Math.round(n * 100);
}
