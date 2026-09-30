import { addDays, monthDay } from '../dates';
import type { Channel, ISODate, Transaction } from '../types';

/**
 * A tiny builder for synthetic but believable account histories.
 *
 * Everything is placed relative to an anchor ("today"), so the demo always
 * looks fresh: the move was eleven weeks ago, whenever you open it.
 * Randomness is seeded, so the same anchor always gives the same ledger.
 */

export function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const HISTORY_DAYS = 395;

type Text = string | ((date: ISODate, i: number) => string);

const MONTH_TAG = (date: ISODate) => `${date.slice(5, 7)}/${date.slice(0, 4)}`;

export class Ledger {
  readonly txs: Transaction[] = [];
  readonly rand: () => number;
  readonly prefix: string;
  readonly anchor: ISODate;
  private n = 0;

  constructor(prefix: string, anchor: ISODate) {
    this.prefix = prefix;
    this.anchor = anchor;
    this.rand = seededRandom(`${prefix}:${anchor}`);
  }

  get start(): ISODate {
    return addDays(this.anchor, -HISTORY_DAYS);
  }

  date(offset: number): ISODate {
    return addDays(this.anchor, offset);
  }

  /** A value between min and max, rounded to cents. */
  between(min: number, max: number): number {
    return Math.round((min + this.rand() * (max - min)) * 100) / 100;
  }

  pick<T>(items: T[]): T {
    return items[Math.floor(this.rand() * items.length)];
  }

  add(date: ISODate, amount: number, counterparty: string, description: string, channel: Channel): Transaction {
    const tx: Transaction = {
      id: `${this.prefix}-${date}-${String(this.n++).padStart(3, '0')}`,
      date,
      amount: Math.round(amount * 100) / 100,
      counterparty,
      description,
      channel,
    };
    if (date >= this.start && date < this.anchor) this.txs.push(tx);
    return tx;
  }

  at(offset: number, amount: number, counterparty: string, description: Text, channel: Channel) {
    const date = this.date(offset);
    return this.add(date, amount, counterparty, typeof description === 'function' ? description(date, 0) : description, channel);
  }

  /** On a fixed day of every calendar month (salary, rent). */
  monthlyOnDay(
    day: number,
    amount: number | ((i: number) => number),
    counterparty: string,
    description: Text,
    channel: Channel,
    range: { from?: number; to?: number } = {},
  ) {
    const from = this.date(range.from ?? -HISTORY_DAYS);
    const to = this.date(range.to ?? -1);
    for (let m = -14, i = 0; m <= 0; m++) {
      const date = monthDay(this.anchor, m, day);
      if (date < from || date > to) continue;
      const amt = typeof amount === 'function' ? amount(i) : amount;
      this.add(date, amt, counterparty, typeof description === 'function' ? description(date, i) : description, channel);
      i++;
    }
  }

  /**
   * Every `interval` days starting at `from` (an offset from the anchor).
   * Used where the count of charges matters for the story, so it does not
   * depend on which day of the month the demo happens to run.
   */
  every(
    interval: number,
    amount: number | ((i: number, date: ISODate) => number),
    counterparty: string,
    description: Text,
    channel: Channel,
    range: { from?: number; to?: number } = {},
  ) {
    const to = range.to ?? -1;
    for (let offset = range.from ?? -HISTORY_DAYS, i = 0; offset <= to; offset += interval, i++) {
      const date = this.date(Math.round(offset));
      const amt = typeof amount === 'function' ? amount(i, date) : amount;
      this.add(date, amt, counterparty, typeof description === 'function' ? description(date, i) : description, channel);
    }
  }

  /** Irregular spending: `perWeek` purchases on average, amounts in a range. */
  scatter(
    perWeek: number,
    min: number,
    max: number,
    merchants: string[],
    description: (merchant: string) => string,
    range: { from?: number; to?: number } = {},
  ) {
    const from = range.from ?? -HISTORY_DAYS;
    const to = range.to ?? -1;
    const p = perWeek / 7;
    for (let offset = from; offset <= to; offset++) {
      if (this.rand() < p) {
        const merchant = this.pick(merchants);
        this.at(offset, -this.between(min, max), merchant, description(merchant), 'card');
      }
    }
  }

  sorted(): Transaction[] {
    return [...this.txs].sort((a, b) => (a.date === b.date ? a.id.localeCompare(b.id) : a.date < b.date ? -1 : 1));
  }
}

export { MONTH_TAG };
