import type { ISODate, L10n, Lang } from './types';

/**
 * Formatting without `Intl`, so the output is identical in Hermes, in every
 * browser and in Node. Belgian conventions: `1.575,00` in Dutch.
 */

export function l(nl: string, en: string): L10n {
  return { nl, en };
}

export function t(text: L10n, lang: Lang): string {
  return text[lang];
}

function group(int: string, sep: string): string {
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
}

/** `1575.5` -> `1.575,50` (nl) or `1,575.50` (en). */
export function formatNumber(value: number, lang: Lang, decimals = 2): string {
  const fixed = Math.abs(value).toFixed(decimals);
  const [int, frac] = fixed.split('.');
  const thousands = lang === 'nl' ? '.' : ',';
  const decimal = lang === 'nl' ? ',' : '.';
  const sign = value < 0 ? '-' : '';
  return sign + group(int, thousands) + (frac ? decimal + frac : '');
}

/** Money with the euro sign, e.g. `€ 1.575,00`. `signed` adds a `+` for credits. */
export function formatMoney(value: number, lang: Lang, opts: { decimals?: number; signed?: boolean } = {}): string {
  const decimals = opts.decimals ?? 2;
  const body = formatNumber(Math.abs(value), lang, decimals);
  const sign = value < 0 ? '- ' : opts.signed && value > 0 ? '+ ' : '';
  return `${sign}€ ${body}`;
}

/** A rounded amount for prose: `€ 560`. */
export function euro(value: number, lang: Lang): string {
  return formatMoney(Math.round(value), lang, { decimals: 0 });
}

/** The same rounded amount in both languages. */
export function euroL(value: number): L10n {
  return { nl: euro(value, 'nl'), en: euro(value, 'en') };
}

export function numL(value: number, decimals = 0): L10n {
  return { nl: formatNumber(value, 'nl', decimals), en: formatNumber(value, 'en', decimals) };
}

const MONTHS: Record<Lang, string[]> = {
  nl: ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

const MONTHS_SHORT: Record<Lang, string[]> = {
  nl: ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

/** `2026-09-24` -> `24 september` / `24 September`. */
export function formatDate(date: ISODate, lang: Lang, withYear = false): string {
  const [y, m, d] = date.split('-').map(Number);
  const base = lang === 'nl' ? `${d} ${MONTHS.nl[m - 1]}` : `${d} ${MONTHS.en[m - 1]}`;
  return withYear ? `${base} ${y}` : base;
}

export function formatDateL(date: ISODate, withYear = false): L10n {
  return { nl: formatDate(date, 'nl', withYear), en: formatDate(date, 'en', withYear) };
}

export function monthName(month: number, lang: Lang, short = false): string {
  return (short ? MONTHS_SHORT : MONTHS)[lang][month];
}

/** `2026-09` -> `sep` */
export function shortMonth(key: string, lang: Lang): string {
  return MONTHS_SHORT[lang][Number(key.slice(5, 7)) - 1];
}
