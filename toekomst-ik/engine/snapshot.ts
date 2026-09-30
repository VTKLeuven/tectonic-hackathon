/**
 * The persona snapshot: the *only* thing the app sends to the backend during a chat.
 * Aggregates only. No transaction lines, no account numbers, no names of people other than the first name.
 */
import { allCategoryStats, cashflowOutlook, detectSubscriptions, spendingTransactions } from './baseline';
import { addMonths, monthKey } from './dates';
import { buildProjectionInput, project, type ProjectionInput } from './projection';
import { evaluateAlerts } from './alerts';
import { ASSUMPTIONS_VERSION } from './assumptions';
import type { Category, CustomerState, ISODate, Severity, AlertType } from './types';

export interface SnapshotCategory {
  category: Category;
  baselineCents: number;
  mtdCents: number;
  projectedCents: number;
  months: { month: string; totalCents: number }[];
  budgetCents: number | null;
}

export interface SnapshotMerchant {
  merchant: string;
  category: Category;
  thisMonthCents: number;
  last3MonthsCents: number;
  count3Months: number;
}

export interface SnapshotAlert {
  id: string;
  type: AlertType;
  severity: Severity;
  title: string;
  message: string;
  why: string[];
  impact: string | null;
  category: Category | null;
  merchant: string | null;
}

export interface Snapshot {
  version: string;
  personaId: string;
  firstName: string;
  futureSelfName: string;
  age: number;
  city: string;
  householdLabel: string;
  today: ISODate;
  netIncomeCents: number;
  workRegime: string;
  housing: string;
  balances: { liquidCents: number; investmentsCents: number; zichtCents: number };
  goals: { id: string; name: string; targetCents: number; targetDate: ISODate; currentCents: number; expectedDate: ISODate | null; monthsDelta: number | null }[];
  categories: SnapshotCategory[];
  merchants: SnapshotMerchant[];
  subscriptions: { merchant: string; amountCents: number; kind: string; isNew: boolean; previousAmountCents: number | null }[];
  alerts: SnapshotAlert[];
  cashflow: { minBalanceCents: number; minDate: ISODate; nextIncomeDate: ISODate | null; nextIncomeCents: number; bufferCents: number };
  projectionInput: ProjectionInput;
  baseline: { netWorth2035Cents: number; liquid2035Cents: number; netWorthRetirementCents: number; retirementDate: ISODate; monthlySurplusCents: number };
  suggestedQuestions: string[];
}

export function buildSnapshot(state: CustomerState): Snapshot {
  const p = state.persona;
  const input = buildProjectionInput(state);
  const base = project(input);
  const stats = allCategoryStats(state);
  const evaluation = evaluateAlerts(state);
  const subs = detectSubscriptions(state);
  const outlook = cashflowOutlook(state);
  const thisMonth = monthKey(state.today);
  const from3 = addMonths(state.today, -3);
  const byMerchant = new Map<string, SnapshotMerchant>();
  for (const t of spendingTransactions(state)) {
    if (t.date < from3) continue;
    const e = byMerchant.get(t.merchant) ?? { merchant: t.merchant, category: t.category, thisMonthCents: 0, last3MonthsCents: 0, count3Months: 0 };
    e.last3MonthsCents += -t.amountCents;
    e.count3Months += 1;
    if (monthKey(t.date) === thisMonth) e.thisMonthCents += -t.amountCents;
    byMerchant.set(t.merchant, e);
  }
  const merchants = [...byMerchant.values()].sort((a, b) => b.last3MonthsCents - a.last3MonthsCents).slice(0, 30);
  const housing =
    p.housing.type === 'huur'
      ? `huurt (€ ${Math.round(p.housing.rentCents / 100)} per maand)`
      : `eigen woning met woonkrediet (nog € ${Math.round(p.housing.principalCents / 100)} open, € ${Math.round(p.housing.monthlyPaymentCents / 100)} per maand, nog ${p.housing.monthsRemaining} maanden)`;
  return {
    version: ASSUMPTIONS_VERSION,
    personaId: p.id,
    firstName: p.firstName,
    futureSelfName: p.futureSelfName,
    age: p.age,
    city: p.city,
    householdLabel: p.householdLabel,
    today: state.today,
    netIncomeCents: p.netIncomeCents,
    workRegime: p.workRegime,
    housing,
    balances: {
      liquidCents: input.liquidCents,
      investmentsCents: input.investmentsCents,
      zichtCents: state.accounts.find((a) => a.id === 'zicht')?.balanceCents ?? 0,
    },
    goals: base.goals.map((g) => ({
      id: g.goalId,
      name: g.name,
      targetCents: g.targetCents,
      targetDate: g.targetDate,
      currentCents: g.currentCents,
      expectedDate: g.achievedDate,
      monthsDelta: g.monthsDelta,
    })),
    categories: stats.map((s) => ({
      category: s.category,
      baselineCents: s.baselineCents,
      mtdCents: s.mtdCents,
      projectedCents: s.projectedCents,
      months: s.months,
      budgetCents: s.budgetCents,
    })),
    merchants,
    subscriptions: subs.map((s) => ({ merchant: s.merchant, amountCents: s.amountCents, kind: s.kind, isNew: s.isNew, previousAmountCents: s.previousAmountCents })),
    alerts: [...evaluation.active, ...evaluation.more].map((a) => ({
      id: a.id,
      type: a.type,
      severity: a.severity,
      title: a.title,
      message: a.message,
      why: a.why.lines.map((l) => `${l.label.trim()}: ${l.value}`),
      impact: a.impact?.text ?? null,
      category: a.category ?? null,
      merchant: a.merchant ?? null,
    })),
    cashflow: {
      minBalanceCents: outlook.minBalanceCents,
      minDate: outlook.minDate,
      nextIncomeDate: outlook.nextIncomeDate,
      nextIncomeCents: outlook.nextIncomeCents,
      bufferCents: outlook.bufferCents,
    },
    projectionInput: input,
    baseline: {
      netWorth2035Cents: base.at2035.netWorthCents,
      liquid2035Cents: base.at2035.liquidCents,
      netWorthRetirementCents: base.atRetirement.netWorthCents,
      retirementDate: base.retirementDate,
      monthlySurplusCents: base.monthlySurplusCents,
    },
    suggestedQuestions: p.suggestedQuestions,
  };
}

/** Human-readable list of what the snapshot contains, for the trust screen. */
export const SNAPSHOT_CONTENTS: string[] = [
  'Je voornaam, leeftijd, stad en gezinssituatie',
  'Je netto maandinkomen en werkregime',
  'Een samenvatting van je woonsituatie (huur of woonkrediet)',
  'Totalen van je rekeningen (zicht, spaar, beleggen), geen rekeningnummers',
  'Je doelen en de verwachte datum waarop je ze haalt',
  'Per categorie: je normaal, deze maand en het verwachte maandtotaal',
  'De 30 handelaars waar je de laatste 3 maanden het meest uitgaf (enkel totalen)',
  'Je abonnementen (handelaar en bedrag)',
  'De actieve signalen van de Waakhond, met de cijfers erachter',
  'De invoer voor de simulatie, zodat de server dezelfde berekeningen kan doen',
];

export const NOT_IN_SNAPSHOT: string[] = [
  'Geen transactielijst: enkel de paar betalingen waar een signaal over gaat (datum, bedrag, handelaar)',
  'Geen rekeningnummers, adres, rijksregisternummer of familienaam',
  'Geen locatie- of toestelgegevens',
  'Geen gespreksgeschiedenis buiten het huidige gesprek',
];
