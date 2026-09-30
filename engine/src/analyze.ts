import { ASSUMPTIONS as A } from './assumptions';
import { addDays, monthKey } from './dates';
import type { CustomerProfile, Detector, DetectorContext } from './detectors/context';
import { isInsight } from './detectors/context';
import { ENERGY_DETECTORS } from './detectors/energy';
import { NIGHTLIFE_DETECTORS } from './detectors/nightlife';
import { SAVINGS_DETECTORS } from './detectors/savings';
import { SUBSCRIPTION_DETECTORS } from './detectors/subscriptions';
import { categorise } from './merchants';
import { DEFAULT_PREFS, EMPTY_FEEDBACK, rank } from './rank';
import { detectRecurring } from './recurring';
import { detectSignals } from './signals';
import type {
  Analysis,
  EnergyProfile,
  EnrichedTransaction,
  FeedbackState,
  Insight,
  ISODate,
  Preferences,
  Suppressed,
  Transaction,
} from './types';

export const DETECTORS: Detector[] = [...ENERGY_DETECTORS, ...SUBSCRIPTION_DETECTORS, ...SAVINGS_DETECTORS, ...NIGHTLIFE_DETECTORS];

export interface AnalyzeInput {
  transactions: Transaction[];
  today: ISODate;
  profile: CustomerProfile;
  /** Balance of the current account before the first transaction. */
  openingBalance: number;
  feedback?: FeedbackState;
  prefs?: Preferences;
}

/**
 * The whole pipeline, as one pure function:
 *
 *   transactions -> enrich -> recurring -> signals -> detectors -> rank
 *
 * Pure means it can run on the phone, in the browser, or per customer in a
 * stream processor. Same input, same output.
 */
export function analyze(input: AnalyzeInput): Analysis {
  const { today } = input;
  const feedback = input.feedback ?? EMPTY_FEEDBACK;
  const prefs = input.prefs ?? DEFAULT_PREFS;

  const transactions = input.transactions
    .filter((tx) => tx.date <= today)
    .sort((a, b) => (a.date === b.date ? a.id.localeCompare(b.id) : a.date < b.date ? -1 : 1))
    .map(categorise);
  const byId = new Map(transactions.map((tx) => [tx.id, tx]));

  const recurring = detectRecurring(transactions, today);
  const signals = detectSignals(transactions, recurring, today);

  const ctx: DetectorContext = {
    today,
    transactions,
    streams: recurring,
    signals,
    profile: input.profile,
    balances: dailyBalances(transactions, input.openingBalance, today),
    signal: (id) => signals.find((s) => s.id === id),
    tx: (id) => byId.get(id),
  };

  const insights: Insight[] = [];
  const suppressed: Suppressed[] = [];
  for (const detect of DETECTORS) {
    const result = detect(ctx);
    if (!result) continue;
    for (const r of Array.isArray(result) ? result : [result]) {
      if (isInsight(r)) insights.push(r);
      else suppressed.push(r);
    }
  }

  const ranking = rank(insights, feedback, prefs, today);

  return {
    today,
    transactions,
    recurring,
    signals,
    insights: ranking.ranked,
    suppressed: [...suppressed, ...ranking.suppressed],
    featured: ranking.featured,
    energy: energyProfile(transactions, today),
  };
}

export function dailyBalances(transactions: EnrichedTransaction[], opening: number, today: ISODate) {
  if (!transactions.length) return [];
  const byDate = new Map<string, number>();
  for (const tx of transactions) byDate.set(tx.date, (byDate.get(tx.date) ?? 0) + tx.amount);
  const out: { date: ISODate; balance: number }[] = [];
  let balance = opening;
  for (let d = transactions[0].date; d <= today; d = addDays(d, 1)) {
    balance += byDate.get(d) ?? 0;
    out.push({ date: d, balance: Math.round(balance * 100) / 100 });
  }
  return out;
}

export function currentBalance(transactions: Transaction[], opening: number, today: ISODate): number {
  const total = transactions.filter((tx) => tx.date <= today).reduce((s, tx) => s + tx.amount, opening);
  return Math.round(total * 100) / 100;
}

/** Twelve months of energy spending, derived from categories alone. */
export function energyProfile(transactions: EnrichedTransaction[], today: ISODate): EnergyProfile {
  const months: EnergyProfile['months'] = [];
  const start = addDays(today, -364);
  for (let i = 11; i >= 0; i--) {
    const [y, m] = today.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1 - i, 1));
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    months.push({ month: key, electricity: 0, heating: 0, mobility: 0 });
  }
  let oilLitres = 0;
  let oilSpend = 0;
  let fuelSpend = 0;
  let gasSpend = 0;
  let elecSpend = 0;
  let chargeSpend = 0;
  let hasOil = false;
  let hasGas = false;

  for (const tx of transactions) {
    if (tx.date < start || tx.amount >= 0) continue;
    const month = months.find((m) => m.month === monthKey(tx.date));
    const amount = -tx.amount;
    switch (tx.category) {
      case 'electricity':
        elecSpend += amount;
        if (month) month.electricity += amount;
        break;
      case 'gas':
        hasGas = true;
        gasSpend += amount;
        if (month) month.heating += amount;
        break;
      case 'heating_oil':
        hasOil = true;
        oilSpend += amount;
        oilLitres += tx.facts.litres ?? amount / A.heatingOil.pricePerLitre;
        if (month) month.heating += amount;
        break;
      case 'fuel':
        fuelSpend += amount;
        if (month) month.mobility += amount;
        break;
      case 'ev_charging':
        chargeSpend += amount;
        if (month) month.mobility += amount;
        break;
    }
  }

  const annual = {
    electricity: Math.round(elecSpend),
    heating: Math.round(gasSpend + oilSpend),
    mobility: Math.round(fuelSpend + chargeSpend),
    total: 0,
  };
  annual.total = annual.electricity + annual.heating + annual.mobility;

  const elecKwh = Math.max(0, (elecSpend - A.electricity.fixedPerYear) / A.electricity.pricePerKwh);
  const gasKwh = Math.max(0, (gasSpend - A.gas.fixedPerYear) / A.gas.pricePerKwh);
  const co2 =
    elecKwh * A.electricity.co2PerKwh +
    gasKwh * A.gas.co2PerKwh +
    oilLitres * A.heatingOil.co2PerLitre +
    (fuelSpend / A.mobility.petrolPerLitre) * A.mobility.co2PerLitrePetrol +
    (chargeSpend / A.mobility.publicChargingObserved) * A.electricity.co2PerKwh;

  for (const m of months) {
    m.electricity = Math.round(m.electricity);
    m.heating = Math.round(m.heating);
    m.mobility = Math.round(m.mobility);
  }

  return {
    months,
    annual,
    co2Kg: Math.round(co2),
    estimatedKwh: elecSpend > 0 ? Math.round(elecKwh / 100) * 100 : undefined,
    heatingSource: hasOil ? 'oil' : hasGas ? 'gas' : 'unknown',
  };
}
