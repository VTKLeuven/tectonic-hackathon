import type { ISODate } from './types';

/**
 * Date helpers on `YYYY-MM-DD` keys. All arithmetic happens at UTC noon, so a
 * daylight saving jump or the device timezone can never move a transaction to
 * another day.
 */

const DAY = 86_400_000;

function toUTC(date: ISODate): number {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d, 12);
}

function fromUTC(ms: number): ISODate {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Today in the local calendar of the device. */
export function todayISO(now: Date = new Date()): ISODate {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(date: ISODate, days: number): ISODate {
  return fromUTC(toUTC(date) + days * DAY);
}

/** Whole days from `a` to `b` (positive when `b` is later). */
export function daysBetween(a: ISODate, b: ISODate): number {
  return Math.round((toUTC(b) - toUTC(a)) / DAY);
}

export function monthKey(date: ISODate): string {
  return date.slice(0, 7);
}

/** The date in the month `offset` months from `date`, on `day` (clamped to the month length). */
export function monthDay(date: ISODate, offset: number, day: number): ISODate {
  const [y, m] = date.split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1 + offset, 1, 12));
  const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0, 12)).getUTCDate();
  first.setUTCDate(Math.min(day, lastDay));
  return fromUTC(first.getTime());
}

export function maxDate(a: ISODate, b: ISODate): ISODate {
  return a > b ? a : b;
}

export function dayOfWeek(date: ISODate): number {
  return new Date(toUTC(date)).getUTCDay();
}

export function monthIndex(date: ISODate): number {
  return Number(date.slice(5, 7)) - 1;
}
