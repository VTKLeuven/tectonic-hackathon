/** Timezone-safe calendar helpers for ISO dates (YYYY-MM-DD). All math is done in UTC. */
import type { ISODate } from './types';

export function parseISO(d: ISODate): { y: number; m: number; d: number } {
  const y = Number(d.slice(0, 4));
  const m = Number(d.slice(5, 7));
  const day = Number(d.slice(8, 10));
  return { y, m, d: day };
}

export function toISO(y: number, m: number, d: number): ISODate {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toISOString().slice(0, 10);
}

export function fromDate(date: Date): ISODate {
  // Local calendar date of the device, expressed as ISO.
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function todayISO(): ISODate {
  return fromDate(new Date());
}

export function toEpochDays(d: ISODate): number {
  const { y, m, d: day } = parseISO(d);
  return Math.round(Date.UTC(y, m - 1, day) / 86_400_000);
}

export function addDays(d: ISODate, n: number): ISODate {
  const { y, m, d: day } = parseISO(d);
  return toISO(y, m, day + n);
}

export function diffDays(a: ISODate, b: ISODate): number {
  return toEpochDays(a) - toEpochDays(b);
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function addMonths(d: ISODate, n: number): ISODate {
  const { y, m, d: day } = parseISO(d);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const nd = Math.min(day, daysInMonth(ny, nm));
  return toISO(ny, nm, nd);
}

/** "2026-09" */
export function monthKey(d: ISODate): string {
  return d.slice(0, 7);
}

export function monthStart(d: ISODate): ISODate {
  return `${monthKey(d)}-01`;
}

export function monthEnd(d: ISODate): ISODate {
  const { y, m } = parseISO(d);
  return toISO(y, m, daysInMonth(y, m));
}

export function monthKeyOffset(d: ISODate, n: number): string {
  return monthKey(addMonths(monthStart(d), n));
}

export function monthsBetween(from: ISODate, to: ISODate): number {
  const a = parseISO(from);
  const b = parseISO(to);
  return (b.y - a.y) * 12 + (b.m - a.m);
}

export function compareISO(a: ISODate, b: ISODate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function clampDay(y: number, m: number, day: number): ISODate {
  return toISO(y, m, Math.min(day, daysInMonth(y, m)));
}

const MONTHS_NL = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
];
const MONTHS_NL_SHORT = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

/** "30 september 2026" */
export function formatDateNL(d: ISODate, opts: { year?: boolean } = {}): string {
  const { y, m, d: day } = parseISO(d);
  const base = `${day} ${MONTHS_NL[m - 1]}`;
  return opts.year === false ? base : `${base} ${y}`;
}

/** "september 2026" */
export function formatMonthNL(d: ISODate | string): string {
  const y = Number(d.slice(0, 4));
  const m = Number(d.slice(5, 7));
  return `${MONTHS_NL[m - 1]} ${y}`;
}

/** "sep '26" */
export function formatMonthShortNL(d: ISODate | string): string {
  const y = d.slice(2, 4);
  const m = Number(d.slice(5, 7));
  return `${MONTHS_NL_SHORT[m - 1]} '${y}`;
}

export function yearOf(d: ISODate): number {
  return Number(d.slice(0, 4));
}
