import { daysBetween } from './dates';
import type { Cadence, CategoryId, EnrichedTransaction, ISODate, RecurringStream } from './types';

/**
 * Step 2: find what repeats.
 *
 * Group outgoing payments per merchant, look at the gaps between them and at
 * how stable the amount is. A stream is what a customer would call "a fixed
 * cost": a subscription, an energy advance, the rent. No list of known
 * subscriptions is needed for this; the rhythm gives it away.
 */

const CADENCES: { cadence: Cadence; min: number; max: number; days: number; perYear: number }[] = [
  { cadence: 'weekly', min: 6, max: 8, days: 7, perYear: 52 },
  { cadence: 'monthly', min: 26, max: 35, days: 30, perYear: 12 },
  { cadence: 'quarterly', min: 84, max: 97, days: 91, perYear: 4 },
  { cadence: 'yearly', min: 350, max: 380, days: 365, perYear: 1 },
];

/** Categories where amounts vary by nature, so rhythm alone does not make a fixed cost. */
const VARIABLE: CategoryId[] = ['groceries', 'restaurants', 'fuel', 'ev_charging', 'shopping', 'health', 'other', 'diy', 'furniture'];

const ONE_OFF = /AFREKENING|SLOTFACTUUR|EINDAFREKENING/;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function detectRecurring(transactions: EnrichedTransaction[], today: ISODate): RecurringStream[] {
  const groups = new Map<string, EnrichedTransaction[]>();
  for (const tx of transactions) {
    if (tx.amount >= 0 || VARIABLE.includes(tx.category)) continue;
    // Settlements and final bills are one-offs by nature, even from a recurring payee.
    if (ONE_OFF.test(tx.description.toUpperCase())) continue;
    // One merchant can bill several things (electricity and gas from the same supplier).
    const id = `${tx.merchantKey}:${tx.category}`;
    const list = groups.get(id) ?? [];
    list.push(tx);
    groups.set(id, list);
  }

  const streams: RecurringStream[] = [];
  for (const [id, list] of groups) {
    if (list.length < 3) continue;
    const txs = [...list].sort((a, b) => (a.date < b.date ? -1 : 1));

    const gaps = txs.slice(1).map((tx, i) => daysBetween(txs[i].date, tx.date));
    const gap = median(gaps);
    const match = CADENCES.find((c) => gap >= c.min && gap <= c.max);
    if (!match) continue;

    const amounts = txs.map((tx) => -tx.amount);
    const typical = median(amounts);
    const stable = amounts.filter((a) => Math.abs(a - typical) / typical < 0.25).length / amounts.length;
    if (stable < 0.6) continue;

    const last = txs[txs.length - 1];
    const lastAmount = -last.amount;
    const active = daysBetween(last.date, today) <= match.days * 1.6;

    const stream: RecurringStream = {
      id,
      key: last.merchantKey,
      name: last.merchantName,
      category: last.category,
      cadence: match.cadence,
      amount: round2(typical),
      lastAmount: round2(lastAmount),
      firstDate: txs[0].date,
      lastDate: last.date,
      count: txs.length,
      active,
      transactionIds: txs.map((tx) => tx.id),
      annualCost: round2(lastAmount * match.perYear),
    };

    // A trial: the first charge is (nearly) free and full price follows.
    if (amounts[0] < 3 && amounts.length >= 3 && amounts[1] > 5) {
      stream.trialConverted = { trialAmount: amounts[0], date: txs[1].date, transactionId: txs[1].id };
    }

    // A price change: the most recent step of more than 3% that the following charges kept.
    const start = stream.trialConverted ? 2 : 1;
    for (let i = amounts.length - 1; i >= start; i--) {
      const prev = amounts[i - 1];
      const cur = amounts[i];
      const step = (cur - prev) / prev;
      const kept = amounts.slice(i).every((a) => Math.abs(a - cur) / cur < 0.02);
      // Above +60% it is more likely a one-off than a new price.
      if (Math.abs(step) > 0.03 && Math.abs(step) < 0.6 && kept) {
        stream.priceChange = { from: round2(prev), to: round2(cur), date: txs[i].date, transactionId: txs[i].id };
        break;
      }
    }

    streams.push(stream);
  }

  return streams.sort((a, b) => b.annualCost - a.annualCost);
}
