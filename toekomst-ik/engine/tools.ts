/**
 * The tools the future self may call. Shared by the backend (Claude tool loop) and the offline fallback.
 * Every number the customer sees in a chat answer comes from here, never from the language model.
 */
import { formatDateNL } from './dates';
import { compareProjections, describeScenario, project, toSeries, type Scenario } from './projection';
import type { Snapshot } from './snapshot';
import type { ScenarioCard } from './chat-types';
import { CATEGORIES, CATEGORY_LABELS, type Category, type WorkRegime } from './types';
import { assumptions } from './assumptions';

const eur = (cents: number) => Math.round(cents / 100);

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'get_financial_snapshot',
    description:
      'Overzicht van de huidige financiële situatie van de klant: inkomen, woonsituatie, saldo\'s, doelen, maandelijks overschot en de basisprojectie (vermogen in 2035 en bij pensioen). Roep dit eerst aan bij een algemene vraag.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'simulate_scenario',
    description:
      'Laat de deterministische twin een wat-als-scenario doorrekenen en vergelijk met de basisprojectie. Gebruik dit voor elke vraag van het type "wat als ...": anders werken, een huis kopen, extra sparen, minder uitgeven in een categorie, een kind, een auto. Bedragen in euro.',
    input_schema: {
      type: 'object',
      properties: {
        workRegime: { type: 'string', enum: ['voltijds', '4/5', 'halftijds'], description: 'Nieuw werkregime' },
        homePurchase: {
          type: 'object',
          properties: {
            priceEuros: { type: 'number', description: 'Aankoopprijs in euro' },
            year: { type: 'integer', description: 'Jaar van aankoop' },
            ownContributionEuros: { type: 'number', description: 'Eigen inbreng in euro (optioneel)' },
          },
          required: ['priceEuros', 'year'],
          additionalProperties: false,
        },
        extraMonthlySavingEuros: { type: 'number', description: 'Bedrag dat de klant elke maand extra opzij zet (positief) of minder (negatief)' },
        categoryChange: {
          type: 'object',
          properties: {
            category: { type: 'string', enum: [...CATEGORIES] },
            deltaMonthlyEuros: { type: 'number', description: 'Verandering per maand in euro; negatief = minder uitgeven' },
          },
          required: ['category', 'deltaMonthlyEuros'],
          additionalProperties: false,
        },
        child: { type: 'object', properties: { year: { type: 'integer' } }, required: ['year'], additionalProperties: false },
        car: {
          type: 'object',
          properties: { priceEuros: { type: 'number' }, year: { type: 'integer' } },
          required: ['priceEuros', 'year'],
          additionalProperties: false,
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'get_spending_details',
    description:
      'Details over de uitgaven: per categorie (normaal, deze maand, verwacht, budget) en per handelaar (deze maand, laatste 3 maanden). Geef een categorie of handelaar om te filteren, of niets voor het volledige overzicht.',
    input_schema: {
      type: 'object',
      properties: {
        category: { type: 'string', enum: [...CATEGORIES] },
        merchant: { type: 'string', description: 'Naam van de handelaar, bv. "Deliveroo"' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'get_alerts',
    description: 'De actieve signalen van de Waakhond voor deze klant, met de cijfers en de regel erachter en de toekomstimpact.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
];

export interface SimulateArgs {
  workRegime?: WorkRegime;
  homePurchase?: { priceEuros: number; year: number; ownContributionEuros?: number };
  extraMonthlySavingEuros?: number;
  categoryChange?: { category: Category; deltaMonthlyEuros: number };
  child?: { year: number };
  car?: { priceEuros: number; year: number };
}

function num(v: unknown): number | undefined {
  const n = typeof v === 'string' ? Number(v.replace(/[^\d.,-]/g, '').replace(',', '.')) : typeof v === 'number' ? v : undefined;
  return n !== undefined && Number.isFinite(n) ? n : undefined;
}

/** Coerce loosely-typed tool arguments (local models sometimes send numbers as strings). */
export function sanitizeSimulateArgs(raw: unknown): SimulateArgs {
  const a = (raw ?? {}) as Record<string, unknown>;
  const out: SimulateArgs = {};
  if (a.workRegime === 'voltijds' || a.workRegime === '4/5' || a.workRegime === 'halftijds') out.workRegime = a.workRegime;
  const hp = a.homePurchase as Record<string, unknown> | undefined;
  if (hp && num(hp.priceEuros) && num(hp.year)) out.homePurchase = { priceEuros: num(hp.priceEuros)!, year: Math.round(num(hp.year)!), ownContributionEuros: num(hp.ownContributionEuros) };
  if (num(a.extraMonthlySavingEuros) !== undefined) out.extraMonthlySavingEuros = num(a.extraMonthlySavingEuros);
  const cc = a.categoryChange as Record<string, unknown> | undefined;
  if (cc && typeof cc.category === 'string' && (CATEGORIES as readonly string[]).includes(cc.category) && num(cc.deltaMonthlyEuros) !== undefined) {
    out.categoryChange = { category: cc.category as Category, deltaMonthlyEuros: num(cc.deltaMonthlyEuros)! };
  }
  const child = a.child as Record<string, unknown> | undefined;
  if (child && num(child.year)) out.child = { year: Math.round(num(child.year)!) };
  const car = a.car as Record<string, unknown> | undefined;
  if (car && num(car.priceEuros) && num(car.year)) out.car = { priceEuros: num(car.priceEuros)!, year: Math.round(num(car.year)!) };
  return out;
}

export function scenarioFromArgs(args: SimulateArgs): Scenario {
  const s: Scenario = {};
  if (args.workRegime) s.workRegime = args.workRegime;
  if (args.homePurchase) {
    s.homePurchase = {
      priceCents: Math.round(args.homePurchase.priceEuros * 100),
      year: args.homePurchase.year,
      ownContributionCents: args.homePurchase.ownContributionEuros !== undefined ? Math.round(args.homePurchase.ownContributionEuros * 100) : undefined,
    };
  }
  if (args.extraMonthlySavingEuros) s.extraMonthlySavingCents = Math.round(args.extraMonthlySavingEuros * 100);
  if (args.categoryChange) s.categoryChange = { category: args.categoryChange.category, deltaMonthlyCents: Math.round(args.categoryChange.deltaMonthlyEuros * 100) };
  if (args.child) s.child = { year: args.child.year };
  if (args.car) s.car = { priceCents: Math.round(args.car.priceEuros * 100), year: args.car.year };
  return s;
}

export interface ToolOutcome {
  result: unknown;
  scenarioCard?: ScenarioCard;
}

export function simulate(snapshot: Snapshot, args: SimulateArgs): ToolOutcome {
  const scenario = scenarioFromArgs(args);
  const base = project(snapshot.projectionInput);
  const scen = project(snapshot.projectionInput, scenario);
  const cmp = compareProjections(base, scen);
  const label = describeScenario(scenario);
  const keyAssumptions: string[] = [];
  if (scenario.workRegime === '4/5') keyAssumptions.push(`${assumptions.netFactor45.label}: ${assumptions.netFactor45.display}`);
  if (scenario.workRegime === 'halftijds') keyAssumptions.push(`${assumptions.netFactorHalftijds.label}: ${assumptions.netFactorHalftijds.display}`);
  if (scenario.homePurchase) {
    keyAssumptions.push(`${assumptions.mortgageRate.label}: ${assumptions.mortgageRate.display}, ${assumptions.mortgageTermYears.display}`);
    keyAssumptions.push(`${assumptions.registrationDuty.label}: ${assumptions.registrationDuty.display}`);
    keyAssumptions.push(`${assumptions.maxPaymentToIncome.label}: ${assumptions.maxPaymentToIncome.display}`);
  }
  if (scenario.child) keyAssumptions.push(`${assumptions.childCostMonthlyCents.label}: ${assumptions.childCostMonthlyCents.display} min ${assumptions.groeipakketMonthlyCents.display}`);
  if (scenario.car) keyAssumptions.push(`${assumptions.carMonthlyCostCents.label}: ${assumptions.carMonthlyCostCents.display}`);
  keyAssumptions.push(`${assumptions.investmentReturn.label}: ${assumptions.investmentReturn.display} (geen garantie)`);
  keyAssumptions.push(`${assumptions.inflation.label} en ${assumptions.wageIndexation.label.toLowerCase()}: ${assumptions.inflation.display}`);

  const result = {
    scenario: label,
    baseline: {
      netWorth2035Eur: eur(base.at2035.netWorthCents),
      liquid2035Eur: eur(base.at2035.liquidCents),
      netWorthAtRetirementEur: eur(base.atRetirement.netWorthCents),
      monthlySurplusEur: eur(base.monthlySurplusCents),
    },
    withScenario: {
      netWorth2035Eur: eur(scen.at2035.netWorthCents),
      liquid2035Eur: eur(scen.at2035.liquidCents),
      netWorthAtRetirementEur: eur(scen.atRetirement.netWorthCents),
      monthlySurplusEur: eur(scen.monthlySurplusCents),
      monthlyIncomeEur: eur(scen.monthlyIncomeCents),
    },
    difference: {
      netWorth2035Eur: eur(cmp.netWorth2035DeltaCents),
      netWorthAtRetirementEur: eur(cmp.netWorthRetirementDeltaCents),
      monthlySurplusEur: eur(cmp.monthlySurplusDeltaCents),
    },
    retirementDate: base.retirementDate,
    goals: cmp.goals.map((g) => ({
      name: g.name,
      baselineDate: g.baseDate ? formatDateNL(g.baseDate) : 'niet binnen de horizon',
      scenarioDate: g.scenarioDate ? formatDateNL(g.scenarioDate) : 'niet binnen de horizon',
      monthsLater: g.monthsDelta,
    })),
    feasibility: scen.feasibility
      ? {
          ok: scen.feasibility.ok,
          reasons: scen.feasibility.reasons,
          loanEur: eur(scen.feasibility.loanCents ?? 0),
          ownContributionEur: eur(scen.feasibility.ownContributionCents ?? 0),
          purchaseCostsEur: eur(scen.feasibility.purchaseCostsCents ?? 0),
          monthlyPaymentEur: eur(scen.feasibility.monthlyPaymentCents ?? 0),
          paymentToIncomePct: Math.round((scen.feasibility.paymentToIncome ?? 0) * 100),
        }
      : null,
    keyAssumptions,
  };
  const scenarioCard: ScenarioCard = {
    label,
    baseline: toSeries(base),
    scenario: toSeries(scen),
    netWorth2035DeltaCents: cmp.netWorth2035DeltaCents,
    goalDeltas: cmp.goals,
    feasibilityOk: scen.feasibility ? scen.feasibility.ok : null,
  };
  return { result, scenarioCard };
}

export function financialSnapshot(snapshot: Snapshot): ToolOutcome {
  const s = snapshot;
  return {
    result: {
      firstName: s.firstName,
      age: s.age,
      city: s.city,
      household: s.householdLabel,
      today: s.today,
      netIncomeEurPerMonth: eur(s.netIncomeCents),
      workRegime: s.workRegime,
      housing: s.housing,
      balances: { currentAccountEur: eur(s.balances.zichtCents), liquidTotalEur: eur(s.balances.liquidCents), investmentsEur: eur(s.balances.investmentsCents) },
      monthlySurplusEur: eur(s.baseline.monthlySurplusCents),
      goals: s.goals.map((g) => ({
        name: g.name,
        targetEur: eur(g.targetCents),
        plannedDate: formatDateNL(g.targetDate),
        savedSoFarEur: eur(g.currentCents),
        expectedDate: g.expectedDate ? formatDateNL(g.expectedDate) : 'niet binnen de horizon',
        monthsLaterThanPlanned: g.monthsDelta,
      })),
      baselineProjection: {
        netWorth2035Eur: eur(s.baseline.netWorth2035Cents),
        liquid2035Eur: eur(s.baseline.liquid2035Cents),
        netWorthAtRetirementEur: eur(s.baseline.netWorthRetirementCents),
        retirementDate: formatDateNL(s.baseline.retirementDate),
      },
      cashflowUntilNextIncome: {
        lowestBalanceEur: eur(s.cashflow.minBalanceCents),
        lowestOn: formatDateNL(s.cashflow.minDate),
        nextIncome: s.cashflow.nextIncomeDate ? `${formatDateNL(s.cashflow.nextIncomeDate)}: € ${eur(s.cashflow.nextIncomeCents)}` : null,
        bufferEur: eur(s.cashflow.bufferCents),
      },
      activeAlerts: s.alerts.length,
      topSpendingCategories: s.categories.slice(0, 6).map((c) => ({ category: CATEGORY_LABELS[c.category], normalEurPerMonth: eur(c.baselineCents), thisMonthEur: eur(c.mtdCents) })),
    },
  };
}

export function spendingDetails(snapshot: Snapshot, args: { category?: Category; merchant?: string }): ToolOutcome {
  if (args.merchant) {
    const needle = args.merchant.toLowerCase();
    const m = snapshot.merchants.find((x) => x.merchant.toLowerCase().includes(needle));
    if (!m) return { result: { error: `Geen uitgaven gevonden bij "${args.merchant}" in de laatste 3 maanden.` } };
    const cat = snapshot.categories.find((c) => c.category === m.category);
    return {
      result: {
        merchant: m.merchant,
        category: CATEGORY_LABELS[m.category],
        thisMonthEur: eur(m.thisMonthCents),
        last3MonthsEur: eur(m.last3MonthsCents),
        paymentsLast3Months: m.count3Months,
        categoryNormalEurPerMonth: cat ? eur(cat.baselineCents) : null,
        categoryThisMonthEur: cat ? eur(cat.mtdCents) : null,
        categoryExpectedThisMonthEur: cat ? eur(cat.projectedCents) : null,
        relatedAlerts: snapshot.alerts.filter((a) => a.merchant === m.merchant || a.category === m.category).map((a) => a.title),
      },
    };
  }
  if (args.category) {
    const c = snapshot.categories.find((x) => x.category === args.category);
    if (!c) return { result: { error: 'Geen uitgaven in die categorie.' } };
    return {
      result: {
        category: CATEGORY_LABELS[c.category],
        normalEurPerMonth: eur(c.baselineCents),
        thisMonthEur: eur(c.mtdCents),
        expectedThisMonthEur: eur(c.projectedCents),
        budgetEur: c.budgetCents !== null ? eur(c.budgetCents) : null,
        lastMonths: c.months.map((m) => ({ month: m.month, totalEur: eur(m.totalCents) })),
        topMerchants: snapshot.merchants.filter((m) => m.category === c.category).slice(0, 6).map((m) => ({ merchant: m.merchant, thisMonthEur: eur(m.thisMonthCents), last3MonthsEur: eur(m.last3MonthsCents) })),
      },
    };
  }
  return {
    result: {
      categories: snapshot.categories.map((c) => ({
        category: CATEGORY_LABELS[c.category],
        key: c.category,
        normalEurPerMonth: eur(c.baselineCents),
        thisMonthEur: eur(c.mtdCents),
        expectedThisMonthEur: eur(c.projectedCents),
        budgetEur: c.budgetCents !== null ? eur(c.budgetCents) : null,
      })),
      subscriptions: snapshot.subscriptions.map((s) => ({ merchant: s.merchant, eurPerMonth: s.amountCents / 100, kind: s.kind, isNew: s.isNew })),
    },
  };
}

export function alertsTool(snapshot: Snapshot): ToolOutcome {
  return {
    result: {
      alerts: snapshot.alerts.map((a) => ({
        title: a.title,
        severity: a.severity,
        message: a.message,
        numbers: a.why,
        futureImpact: a.impact,
      })),
    },
  };
}

/** Dispatch a tool call by name. Unknown tool -> error result (never throws). */
export function runTool(name: string, args: unknown, snapshot: Snapshot): ToolOutcome {
  const a = (args ?? {}) as Record<string, unknown>;
  switch (name) {
    case 'get_financial_snapshot':
      return financialSnapshot(snapshot);
    case 'simulate_scenario':
      return simulate(snapshot, sanitizeSimulateArgs(a));
    case 'get_spending_details':
      return spendingDetails(snapshot, a as { category?: Category; merchant?: string });
    case 'get_alerts':
      return alertsTool(snapshot);
    default:
      return { result: { error: `Onbekende tool: ${name}` } };
  }
}
