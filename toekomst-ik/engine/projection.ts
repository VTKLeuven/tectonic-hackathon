/**
 * The financial twin: a deterministic month-by-month projection from today to 2035 and on to retirement.
 * No randomness, no network, no UI. The same function runs in the app, in the backend and in tests.
 */
import { A } from './assumptions';
import { addMonths, monthKey, monthsBetween, monthStart, yearOf } from './dates';
import { amortizeMonth, annuityPayment, sum } from './finance';
import { formatEUR } from './money';
import { CATEGORY_LABELS } from './types';
import { allCategoryStats } from './baseline';
import type { Category, CustomerState, Goal, Housing, ISODate, WorkRegime } from './types';

export interface ProjectionInput {
  startDate: ISODate;
  birthYear: number;
  retirementAge: number;
  /** Monthly net income at the current work regime. */
  netIncomeCents: number;
  workRegime: WorkRegime;
  housing: Housing;
  liquidCents: number;
  investmentsCents: number;
  /** Fixed monthly costs excluding housing (energy, telecom, subscriptions, insurance, children). */
  fixedMonthlyCents: number;
  /** Variable monthly spending (groceries, delivery, shopping, ...). */
  variableMonthlyCents: number;
  investMonthlyCents: number;
  goals: Goal[];
  categoryBaselines: Partial<Record<Category, number>>;
}

export interface HomePurchaseScenario {
  priceCents: number;
  year: number;
  /** Own contribution; default = 10 % of the price plus all purchase costs. */
  ownContributionCents?: number;
}

export interface Scenario {
  label?: string;
  workRegime?: WorkRegime;
  homePurchase?: HomePurchaseScenario;
  /** Money that is no longer spent but kept (positive = save more). */
  extraMonthlySavingCents?: number;
  categoryChange?: { category: Category; deltaMonthlyCents: number };
  child?: { year: number };
  car?: { priceCents: number; year: number };
  /** Extra outflow each month (used for alert impact: "als dit zo doorgaat"). */
  extraMonthlySpendCents?: number;
}

export interface MonthPoint {
  date: ISODate;
  liquidCents: number;
  investmentsCents: number;
  debtCents: number;
  homeValueCents: number;
  netWorthCents: number;
  incomeCents: number;
  spendingCents: number;
}

export interface GoalOutcome {
  goalId: string;
  name: string;
  type: Goal['type'];
  targetCents: number;
  targetDate: ISODate;
  achievedDate: ISODate | null;
  /** Months later (+) or earlier (-) than planned; null if not reached within the horizon. */
  monthsDelta: number | null;
  /** Current progress towards the target, 0..1 */
  progress: number;
  currentCents: number;
}

export interface Feasibility {
  ok: boolean;
  reasons: string[];
  loanCents?: number;
  ownContributionCents?: number;
  purchaseCostsCents?: number;
  monthlyPaymentCents?: number;
  paymentToIncome?: number;
  loanToValue?: number;
}

export interface ProjectionResult {
  scenario: Scenario;
  points: MonthPoint[];
  goals: GoalOutcome[];
  at2035: MonthPoint;
  atRetirement: MonthPoint;
  retirementDate: ISODate;
  monthlySurplusCents: number;
  monthlyIncomeCents: number;
  monthlySpendingCents: number;
  feasibility: Feasibility | null;
}

export const HORIZON_YEAR = 2035;

function regimeFactor(r: WorkRegime): number {
  if (r === '4/5') return A.netFactor45;
  if (r === 'halftijds') return A.netFactorHalftijds;
  return 1;
}

function goalMeasure(goal: Goal, liquid: number, investments: number): number {
  return goal.measure === 'liquid' ? liquid : liquid + investments;
}

/** Build the twin's input from the customer's live state (balances + own baselines). */
export function buildProjectionInput(state: CustomerState): ProjectionInput {
  const stats = allCategoryStats(state);
  const baselines: Partial<Record<Category, number>> = {};
  for (const s of stats) baselines[s.category] = s.baselineCents;
  const fixed = sum(stats.filter((s) => !s.isVariable && s.category !== 'wonen').map((s) => s.baselineCents));
  const variable = sum(stats.filter((s) => s.isVariable).map((s) => s.baselineCents));
  const liquid = sum(state.accounts.filter((a) => a.id !== 'beleggen').map((a) => a.balanceCents));
  const investments = sum(state.accounts.filter((a) => a.id === 'beleggen').map((a) => a.balanceCents));
  return {
    startDate: state.today,
    birthYear: state.persona.birthYear,
    retirementAge: state.persona.retirementAge,
    netIncomeCents: state.persona.netIncomeCents,
    workRegime: state.persona.workRegime,
    housing: state.persona.housing,
    liquidCents: liquid,
    investmentsCents: investments,
    fixedMonthlyCents: fixed,
    variableMonthlyCents: variable,
    investMonthlyCents: state.persona.investMonthlyCents,
    goals: state.goals,
    categoryBaselines: baselines,
  };
}

export function project(input: ProjectionInput, scenario: Scenario = {}): ProjectionResult {
  const start = monthStart(input.startDate);
  const retirementDate: ISODate = `${input.birthYear + input.retirementAge}-07-01`;
  const horizonEnd = retirementDate > `${HORIZON_YEAR}-12-01` ? retirementDate : `${HORIZON_YEAR}-12-01`;
  const months = Math.max(12, monthsBetween(start, horizonEnd));

  let liquid = input.liquidCents;
  let investments = input.investmentsCents;
  let housing: Housing = { ...input.housing };
  let homeValue = housing.type === 'hypotheek' ? housing.homeValueCents : 0;
  let debt = housing.type === 'hypotheek' ? housing.principalCents : 0;
  let mortgagePayment = housing.type === 'hypotheek' ? housing.monthlyPaymentCents : 0;
  let mortgageRate = housing.type === 'hypotheek' ? housing.annualRate : 0;
  let mortgageMonthsLeft = housing.type === 'hypotheek' ? housing.monthsRemaining : 0;
  let owns = housing.type === 'hypotheek';
  let carMonthly = 0;
  let feasibility: Feasibility | null = null;

  const regime = regimeFactor(scenario.workRegime ?? input.workRegime) / regimeFactor(input.workRegime);
  const purchaseDate = scenario.homePurchase ? `${scenario.homePurchase.year}-06-01` : null;
  const childDate = scenario.child ? `${scenario.child.year}-01-01` : null;
  const carDate = scenario.car ? `${scenario.car.year}-03-01` : null;

  const points: MonthPoint[] = [];
  const achieved = new Map<string, ISODate>();
  const check = (date: ISODate) => {
    for (const g of input.goals) {
      if (achieved.has(g.id)) continue;
      if (goalMeasure(g, liquid, investments) >= g.targetCents) achieved.set(g.id, date);
    }
  };
  check(start);
  points.push({
    date: start,
    liquidCents: liquid,
    investmentsCents: investments,
    debtCents: debt,
    homeValueCents: homeValue,
    netWorthCents: liquid + investments + homeValue - debt,
    incomeCents: 0,
    spendingCents: 0,
  });

  let firstIncome = 0;
  let firstSpending = 0;
  // Surplus is reported for the first month after every scenario event has happened (child, car, house),
  // so "wat als" answers describe the new situation instead of today's.
  const eventDates = [purchaseDate, childDate, carDate].filter((d): d is string => !!d);
  const steadyFrom = eventDates.length ? eventDates.sort()[eventDates.length - 1] : null;
  let steadyIncome: number | null = null;
  let steadySpending: number | null = null;

  for (let t = 1; t <= months; t++) {
    const date = addMonths(start, t);
    const years = t / 12;
    const infl = Math.pow(1 + A.inflation, years);
    const wage = Math.pow(1 + A.wageIndexation, years);
    const retired = date >= retirementDate;

    // Income
    let income = Math.round(input.netIncomeCents * wage * regime);
    if (retired) income = Math.round(input.netIncomeCents * wage * A.pensionReplacement);

    // Home purchase event
    if (purchaseDate && monthKey(date) === monthKey(purchaseDate) && scenario.homePurchase && !owns) {
      const hp = scenario.homePurchase;
      const costs = Math.round(hp.priceCents * (A.registrationDuty + A.notaryPct)) + A.notaryFixedCents;
      const defaultOwn = Math.round(hp.priceCents * (1 - A.maxLoanToValue)) + costs;
      const own = Math.min(hp.ownContributionCents ?? defaultOwn, Math.max(0, liquid - A.safetyBufferMinCents));
      const loan = Math.max(0, hp.priceCents + costs - own);
      const payment = annuityPayment(loan, A.mortgageRate, A.mortgageTermYears * 12);
      const ltv = loan / hp.priceCents;
      const pti = payment / income;
      const reasons: string[] = [];
      if (ltv > A.maxLoanToValue + 1e-9) reasons.push(`Je zou ${Math.round(ltv * 100)} % van de prijs moeten lenen, meer dan de ${Math.round(A.maxLoanToValue * 100)} % die de bank toestaat.`);
      if (pti > A.maxPaymentToIncome + 1e-9) reasons.push(`De afbetaling zou ${Math.round(pti * 100)} % van je inkomen zijn, meer dan de ${Math.round(A.maxPaymentToIncome * 100)} % uit de betaalbaarheidsregel.`);
      feasibility = {
        ok: reasons.length === 0,
        reasons,
        loanCents: loan,
        ownContributionCents: own,
        purchaseCostsCents: costs,
        monthlyPaymentCents: payment,
        paymentToIncome: pti,
        loanToValue: ltv,
      };
      liquid -= own;
      debt = loan;
      homeValue = hp.priceCents;
      mortgagePayment = payment;
      mortgageRate = A.mortgageRate;
      mortgageMonthsLeft = A.mortgageTermYears * 12;
      owns = true;
      housing = {
        type: 'hypotheek',
        principalCents: loan,
        annualRate: A.mortgageRate,
        monthsRemaining: mortgageMonthsLeft,
        monthlyPaymentCents: payment,
        homeValueCents: hp.priceCents,
      };
      for (const g of input.goals) {
        if (g.type === 'huis' && !achieved.has(g.id) && reasons.length === 0) achieved.set(g.id, date);
      }
    }

    // Housing cost
    let housingCost = 0;
    if (owns) {
      if (mortgageMonthsLeft > 0 && debt > 0) {
        const step = amortizeMonth(debt, mortgageRate, mortgagePayment);
        housingCost = Math.min(mortgagePayment, debt + step.interestCents);
        debt = step.principalCents;
        mortgageMonthsLeft -= 1;
      }
      homeValue = Math.round(homeValue * Math.pow(1 + A.homeValueGrowth, 1 / 12));
    } else if (housing.type === 'huur') {
      housingCost = Math.round(housing.rentCents * infl);
    }

    // Other spending
    let spending = Math.round((input.fixedMonthlyCents + input.variableMonthlyCents) * infl);
    if (scenario.categoryChange) spending += Math.round(scenario.categoryChange.deltaMonthlyCents * infl);
    if (scenario.extraMonthlySpendCents) spending += Math.round(scenario.extraMonthlySpendCents * infl);
    if (scenario.extraMonthlySavingCents) spending -= Math.round(scenario.extraMonthlySavingCents * infl);
    if (childDate && date >= childDate) spending += Math.round((A.childCostMonthlyCents - A.groeipakketMonthlyCents) * infl);
    if (carDate && monthKey(date) === monthKey(carDate) && scenario.car) {
      liquid -= scenario.car.priceCents;
      carMonthly = A.carMonthlyCostCents;
    }
    if (carMonthly) spending += Math.round(carMonthly * infl);
    spending = Math.max(0, spending);

    const cash = income - housingCost - spending;
    liquid += cash;

    // Savings interest and investing
    liquid += Math.round(Math.max(0, liquid) * (A.savingsRate / 12));
    if (!retired && input.investMonthlyCents > 0) {
      liquid -= input.investMonthlyCents;
      investments += input.investMonthlyCents;
    }
    investments = Math.round(investments * (1 + A.investmentReturn / 12));

    if (t === 1) {
      firstIncome = income;
      firstSpending = housingCost + spending;
    }
    if (steadyIncome === null && !retired && (steadyFrom === null || date > steadyFrom)) {
      steadyIncome = income;
      steadySpending = housingCost + spending;
    }
    check(date);
    points.push({
      date,
      liquidCents: liquid,
      investmentsCents: investments,
      debtCents: debt,
      homeValueCents: homeValue,
      netWorthCents: liquid + investments + homeValue - debt,
      incomeCents: income,
      spendingCents: housingCost + spending,
    });
  }

  const goals: GoalOutcome[] = input.goals.map((g) => {
    const achievedDate = achieved.get(g.id) ?? null;
    const current = goalMeasure(g, input.liquidCents, input.investmentsCents);
    return {
      goalId: g.id,
      name: g.name,
      type: g.type,
      targetCents: g.targetCents,
      targetDate: g.targetDate,
      achievedDate,
      monthsDelta: achievedDate ? monthsBetween(monthStart(g.targetDate), achievedDate) : null,
      progress: Math.max(0, Math.min(1, current / g.targetCents)),
      currentCents: current,
    };
  });

  const at2035 = points.find((p) => yearOf(p.date) === HORIZON_YEAR && p.date.slice(5, 7) === '12') ?? points[points.length - 1];
  const atRetirement = points.find((p) => p.date >= retirementDate) ?? points[points.length - 1];

  return {
    scenario,
    points,
    goals,
    at2035,
    atRetirement,
    retirementDate,
    monthlySurplusCents: (steadyIncome ?? firstIncome) - (steadySpending ?? firstSpending),
    monthlyIncomeCents: steadyIncome ?? firstIncome,
    monthlySpendingCents: steadySpending ?? firstSpending,
    feasibility,
  };
}

export interface GoalDelta {
  goalId: string;
  name: string;
  baseDate: ISODate | null;
  scenarioDate: ISODate | null;
  /** Months later (+) in the scenario than in the baseline; null if either is unreachable. */
  monthsDelta: number | null;
}

export interface ProjectionComparison {
  netWorth2035DeltaCents: number;
  liquid2035DeltaCents: number;
  netWorthRetirementDeltaCents: number;
  monthlySurplusDeltaCents: number;
  goals: GoalDelta[];
}

export function compareProjections(base: ProjectionResult, scen: ProjectionResult): ProjectionComparison {
  return {
    netWorth2035DeltaCents: scen.at2035.netWorthCents - base.at2035.netWorthCents,
    liquid2035DeltaCents: scen.at2035.liquidCents - base.at2035.liquidCents,
    netWorthRetirementDeltaCents: scen.atRetirement.netWorthCents - base.atRetirement.netWorthCents,
    monthlySurplusDeltaCents: scen.monthlySurplusCents - base.monthlySurplusCents,
    goals: base.goals.map((bg) => {
      const sg = scen.goals.find((g) => g.goalId === bg.goalId);
      const baseDate = bg.achievedDate;
      const scenarioDate = sg?.achievedDate ?? null;
      let monthsDelta: number | null = null;
      if (baseDate && scenarioDate) monthsDelta = monthsBetween(baseDate, scenarioDate);
      else if (baseDate && !scenarioDate) monthsDelta = null;
      return { goalId: bg.goalId, name: bg.name, baseDate, scenarioDate, monthsDelta };
    }),
  };
}

export interface SeriesPoint {
  date: ISODate;
  netWorthCents: number;
  liquidCents: number;
}

/** Downsample monthly points to one point per `step` months (plus the last point) for compact charts. */
export function toSeries(result: ProjectionResult, step = 12, untilYear = HORIZON_YEAR): SeriesPoint[] {
  const out: SeriesPoint[] = [];
  result.points.forEach((p, i) => {
    if (yearOf(p.date) > untilYear) return;
    if (i % step === 0) out.push({ date: p.date, netWorthCents: p.netWorthCents, liquidCents: p.liquidCents });
  });
  const last = result.points.filter((p) => yearOf(p.date) <= untilYear).pop();
  if (last && out[out.length - 1]?.date !== last.date) {
    out.push({ date: last.date, netWorthCents: last.netWorthCents, liquidCents: last.liquidCents });
  }
  return out;
}

export function describeScenario(s: Scenario): string {
  const parts: string[] = [];
  if (s.workRegime) parts.push(`${s.workRegime} werken`);
  if (s.homePurchase) parts.push(`huis kopen in ${s.homePurchase.year} (${formatEUR(s.homePurchase.priceCents, { decimals: 0 })})`);
  if (s.extraMonthlySavingCents) parts.push(`${formatEUR(s.extraMonthlySavingCents, { decimals: 0 })} extra sparen per maand`);
  if (s.categoryChange) parts.push(`${formatEUR(s.categoryChange.deltaMonthlyCents, { decimals: 0, signed: true })} per maand voor ${CATEGORY_LABELS[s.categoryChange.category].toLowerCase()}`);
  if (s.child) parts.push(`een kindje in ${s.child.year}`);
  if (s.car) parts.push(`een auto in ${s.car.year}`);
  if (s.extraMonthlySpendCents) parts.push(`${formatEUR(s.extraMonthlySpendCents, { decimals: 0 })} extra uitgaven per maand`);
  return parts.length ? parts.join(', ') : 'huidige koers';
}
