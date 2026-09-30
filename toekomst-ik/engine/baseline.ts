/**
 * Baselines: what is "normal" for this customer, computed from their own history.
 * Everything here is deterministic and cheap enough to run nightly for millions of customers.
 */
import { A } from './assumptions';
import { addDays, daysInMonth, diffDays, monthKey, monthKeyOffset, parseISO, clampDay, addMonths } from './dates';
import { mean, median, stddev, sum } from './finance';
import { currentRecurringAmount } from './generator';
import {
  NON_SPENDING_CATEGORIES,
  VARIABLE_CATEGORIES,
  type Category,
  type CustomerState,
  type ISODate,
  type SubscriptionKind,
  type Transaction,
} from './types';

export function isSpending(tx: Transaction): boolean {
  return tx.amountCents < 0 && !NON_SPENDING_CATEGORIES.includes(tx.category) && tx.accountId === 'zicht';
}

/** Spending transactions that count towards baselines (customer-excluded one-offs removed). */
export function spendingTransactions(state: Pick<CustomerState, 'transactions' | 'excludedTxIds'>): Transaction[] {
  const excluded = new Set(state.excludedTxIds);
  return state.transactions.filter((t) => isSpending(t) && !excluded.has(t.id));
}

/** Keys of the last `n` full months before `today`'s month, oldest first. */
export function lastFullMonths(today: ISODate, n: number): string[] {
  const out: string[] = [];
  for (let i = n; i >= 1; i--) out.push(monthKeyOffset(today, -i));
  return out;
}

export interface MonthTotal {
  month: string;
  totalCents: number;
}

export interface CategoryStats {
  category: Category;
  isVariable: boolean;
  /** Median of the last full months (positive number). */
  baselineCents: number;
  months: MonthTotal[];
  mtdCents: number;
  daysElapsed: number;
  daysInMonth: number;
  /** Expected month-end total at the current pace (variable) or max(mtd, baseline) for fixed categories. */
  projectedCents: number;
  rolling30Cents: number;
  /** Which window the overspend rule uses: month-to-date pace, or rolling 30 days early in the month. */
  window: 'mtd' | 'rolling30';
  /** Merchant breakdown for the comparison window (largest first). */
  topMerchants: { merchant: string; totalCents: number; count: number }[];
  budgetCents: number | null;
}

function monthTotals(txs: Transaction[], months: string[], category?: Category): MonthTotal[] {
  const map = new Map<string, number>();
  for (const m of months) map.set(m, 0);
  for (const t of txs) {
    if (category && t.category !== category) continue;
    const k = monthKey(t.date);
    if (map.has(k)) map.set(k, (map.get(k) ?? 0) + -t.amountCents);
  }
  return months.map((m) => ({ month: m, totalCents: map.get(m) ?? 0 }));
}

export function categoryStats(state: CustomerState, category: Category): CategoryStats {
  const txs = spendingTransactions(state).filter((t) => t.category === category);
  const today = state.today;
  const months = lastFullMonths(today, A.baselineMonths);
  const monthsTotals = monthTotals(txs, months);
  const baselineCents = median(monthsTotals.map((m) => m.totalCents));
  const { y, m, d } = parseISO(today);
  const dim = daysInMonth(y, m);
  const thisMonth = monthKey(today);
  const mtdTxs = txs.filter((t) => monthKey(t.date) === thisMonth);
  const mtdCents = sum(mtdTxs.map((t) => -t.amountCents));
  const isVariable = VARIABLE_CATEGORIES.includes(category);
  const from30 = addDays(today, -29);
  const rollingTxs = txs.filter((t) => t.date >= from30 && t.date <= today);
  const rolling30Cents = sum(rollingTxs.map((t) => -t.amountCents));
  const window: CategoryStats['window'] = d < 7 ? 'rolling30' : 'mtd';
  let projectedCents: number;
  if (isVariable) {
    projectedCents = window === 'mtd' ? Math.round((mtdCents / d) * dim) : rolling30Cents;
  } else {
    projectedCents = Math.max(mtdCents, window === 'mtd' ? 0 : rolling30Cents);
  }
  const windowTxs = window === 'mtd' ? mtdTxs : rollingTxs;
  const byMerchant = new Map<string, { totalCents: number; count: number }>();
  for (const t of windowTxs) {
    const e = byMerchant.get(t.merchant) ?? { totalCents: 0, count: 0 };
    e.totalCents += -t.amountCents;
    e.count += 1;
    byMerchant.set(t.merchant, e);
  }
  const topMerchants = [...byMerchant.entries()]
    .map(([merchant, v]) => ({ merchant, ...v }))
    .sort((a, b) => b.totalCents - a.totalCents)
    .slice(0, 5);
  const budget = state.budgets.find((b) => b.category === category);
  return {
    category,
    isVariable,
    baselineCents,
    months: monthsTotals,
    mtdCents,
    daysElapsed: d,
    daysInMonth: dim,
    projectedCents,
    rolling30Cents,
    window,
    topMerchants,
    budgetCents: budget ? budget.monthlyCents : null,
  };
}

/** Stats for every category that has any spending in the history. */
export function allCategoryStats(state: CustomerState): CategoryStats[] {
  const txs = spendingTransactions(state);
  const cats = new Set<Category>(txs.map((t) => t.category));
  for (const b of state.budgets) cats.add(b.category);
  return [...cats].map((c) => categoryStats(state, c)).sort((a, b) => b.baselineCents - a.baselineCents);
}

export interface TotalStats {
  baselineCents: number;
  mtdCents: number;
  projectedCents: number;
  months: MonthTotal[];
  daysElapsed: number;
  daysInMonth: number;
  /** Fixed part of the monthly baseline (housing, energy, telecom, subscriptions, insurance, children). */
  fixedCents: number;
  variableCents: number;
}

export function totalStats(state: CustomerState): TotalStats {
  const stats = allCategoryStats(state);
  const months = lastFullMonths(state.today, A.baselineMonths);
  const txs = spendingTransactions(state);
  const monthsTotals = monthTotals(txs, months);
  const baselineCents = sum(stats.map((s) => s.baselineCents));
  const fixedCents = sum(stats.filter((s) => !s.isVariable).map((s) => s.baselineCents));
  const { y, m, d } = parseISO(state.today);
  return {
    baselineCents,
    mtdCents: sum(stats.map((s) => s.mtdCents)),
    projectedCents: sum(stats.map((s) => s.projectedCents)),
    months: monthsTotals,
    daysElapsed: d,
    daysInMonth: daysInMonth(y, m),
    fixedCents,
    variableCents: baselineCents - fixedCents,
  };
}

export interface TxStats {
  count: number;
  meanCents: number;
  sdCents: number;
  maxCents: number;
}

function txStats(txs: Transaction[]): TxStats {
  const amounts = txs.map((t) => -t.amountCents);
  return {
    count: amounts.length,
    meanCents: Math.round(mean(amounts)),
    sdCents: Math.round(stddev(amounts)),
    maxCents: amounts.length ? Math.max(...amounts) : 0,
  };
}

/** Per-payment statistics for one merchant over the last 12 months, excluding one transaction. */
export function merchantStats(state: CustomerState, merchant: string, excludeId?: string): TxStats {
  const from = addMonths(state.today, -12);
  return txStats(
    spendingTransactions(state).filter((t) => t.merchant === merchant && t.date >= from && t.id !== excludeId && !t.recurring),
  );
}

export function categoryTxStats(state: CustomerState, category: Category, excludeId?: string): TxStats {
  const from = addMonths(state.today, -12);
  return txStats(
    spendingTransactions(state).filter((t) => t.category === category && t.date >= from && t.id !== excludeId && !t.recurring),
  );
}

export function overallTxStats(state: CustomerState, excludeId?: string): TxStats {
  const from = addMonths(state.today, -12);
  return txStats(spendingTransactions(state).filter((t) => t.date >= from && t.id !== excludeId && !t.recurring));
}

export interface Subscription {
  merchant: string;
  category: Category;
  kind: SubscriptionKind;
  amountCents: number;
  previousAmountCents: number | null;
  firstDate: ISODate;
  lastDate: ISODate;
  occurrences: number;
  /** First seen less than 45 days ago. */
  isNew: boolean;
  /** Fraction increase of the latest amount versus the median of earlier ones (null if none). */
  increasePct: number | null;
}

export const SUBSCRIPTION_KIND_LABELS: Record<SubscriptionKind, string> = {
  video: 'streaming (video)',
  muziek: 'muziek',
  fitness: 'fitness',
  nieuws: 'nieuws',
  software: 'software',
  ander: 'abonnement',
};

/** Recurring payments (subscriptions, bills). Uses the bank's "recurring" flag, plus a cadence check. */
export function detectSubscriptions(state: CustomerState): Subscription[] {
  const txs = state.transactions.filter((t) => t.amountCents < 0 && t.accountId === 'zicht' && t.category !== 'sparen');
  const byMerchant = new Map<string, Transaction[]>();
  for (const t of txs) {
    if (!t.recurring) continue;
    const arr = byMerchant.get(t.merchant) ?? [];
    arr.push(t);
    byMerchant.set(t.merchant, arr);
  }
  const out: Subscription[] = [];
  const cutoffActive = addDays(state.today, -45);
  for (const [merchant, arr] of byMerchant) {
    arr.sort((a, b) => (a.date < b.date ? -1 : 1));
    const last = arr[arr.length - 1];
    if (last.date < cutoffActive) continue; // lapsed
    const amounts = arr.map((t) => -t.amountCents);
    const latest = amounts[amounts.length - 1];
    const earlier = amounts.slice(0, -1).slice(-6);
    const prevMedian = earlier.length ? median(earlier) : null;
    const increasePct = prevMedian && prevMedian > 0 ? (latest - prevMedian) / prevMedian : null;
    out.push({
      merchant,
      category: last.category,
      kind: last.subscriptionKind ?? (last.category === 'abonnementen' ? 'ander' : 'ander'),
      amountCents: latest,
      previousAmountCents: prevMedian,
      firstDate: arr[0].date,
      lastDate: last.date,
      occurrences: arr.length,
      isNew: diffDays(state.today, arr[0].date) < 45,
      increasePct,
    });
  }
  return out.sort((a, b) => b.amountCents - a.amountCents);
}

export interface CashflowOutlook {
  balanceCents: number;
  nextIncomeDate: ISODate | null;
  nextIncomeCents: number;
  /** Lowest projected balance before the next income arrives (or within the horizon). */
  minBalanceCents: number;
  minDate: ISODate;
  balanceBeforeIncomeCents: number;
  dailyBurnCents: number;
  scheduled: { date: ISODate; merchant: string; amountCents: number }[];
  bufferCents: number;
}

/** Day-by-day outlook of the current account until the next income (max 35 days). */
export function cashflowOutlook(state: CustomerState, horizonDays = 35): CashflowOutlook {
  const zicht = state.accounts.find((a) => a.id === 'zicht');
  let balance = zicht?.balanceCents ?? 0;
  const startBalance = balance;
  const stats = allCategoryStats(state);
  const variableMonthly = sum(stats.filter((s) => s.isVariable).map((s) => s.baselineCents));
  const dailyBurnCents = Math.round(variableMonthly / 30);
  const fixedMonthly = sum(stats.filter((s) => !s.isVariable).map((s) => s.baselineCents));
  const bufferCents = Math.max(A.safetyBufferMinCents, Math.round(fixedMonthly * 0.5));

  let minBalanceCents = balance;
  let minDate = state.today;
  let nextIncomeDate: ISODate | null = null;
  let nextIncomeCents = 0;
  let balanceBeforeIncomeCents = balance;
  const scheduled: CashflowOutlook['scheduled'] = [];

  for (let i = 1; i <= horizonDays; i++) {
    const date = addDays(state.today, i);
    const { y, m, d } = parseISO(date);
    let incomeToday = 0;
    for (const item of state.persona.recurring) {
      if (item.accountId !== 'zicht') continue;
      if (clampDay(y, m, item.dayOfMonth) !== date) continue;
      const amount = currentRecurringAmount(state.persona, item);
      if (amount > 0) {
        incomeToday += amount;
      } else {
        balance += amount;
        scheduled.push({ date, merchant: item.merchant, amountCents: amount });
      }
    }
    if (incomeToday > 0 && !nextIncomeDate) {
      // Income lands today: the low point was reached before it arrived.
      if (balance < minBalanceCents) {
        minBalanceCents = balance;
        minDate = addDays(date, -1);
      }
      nextIncomeDate = date;
      nextIncomeCents = incomeToday;
      balanceBeforeIncomeCents = balance;
      break;
    }
    balance -= dailyBurnCents;
    if (balance < minBalanceCents) {
      minBalanceCents = balance;
      minDate = date;
    }
    void d;
  }
  if (!nextIncomeDate) balanceBeforeIncomeCents = balance;
  return {
    balanceCents: startBalance,
    nextIncomeDate,
    nextIncomeCents,
    minBalanceCents,
    minDate,
    balanceBeforeIncomeCents,
    dailyBurnCents,
    scheduled,
    bufferCents,
  };
}
