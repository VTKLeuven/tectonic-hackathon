/**
 * Toekomst-ik engine: shared types.
 * Pure TypeScript. No React Native imports anywhere in engine/.
 */

/** Amounts are always integer cents. Negative = money leaves the customer. */
export type Cents = number;
/** Calendar date as YYYY-MM-DD (no time, no timezone). */
export type ISODate = string;

export const CATEGORIES = [
  'inkomen',
  'wonen',
  'boodschappen',
  'maaltijdbezorging',
  'restaurants',
  'vervoer',
  'auto',
  'energie',
  'telecom',
  'abonnementen',
  'verzekeringen',
  'shopping',
  'vrije_tijd',
  'gezondheid',
  'reizen',
  'kinderen',
  'sparen',
  'cash',
  'overig',
] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  inkomen: 'Inkomen',
  wonen: 'Wonen',
  boodschappen: 'Boodschappen',
  maaltijdbezorging: 'Maaltijdbezorging',
  restaurants: 'Restaurants & café',
  vervoer: 'Openbaar vervoer',
  auto: 'Auto',
  energie: 'Energie',
  telecom: 'Telecom',
  abonnementen: 'Abonnementen',
  verzekeringen: 'Verzekeringen',
  shopping: 'Shopping',
  vrije_tijd: 'Vrije tijd',
  gezondheid: 'Gezondheid',
  reizen: 'Reizen',
  kinderen: 'Kinderen',
  sparen: 'Sparen & beleggen',
  cash: 'Cash',
  overig: 'Overig',
};

/** Categories whose monthly total is "pace-driven" (many small payments). */
export const VARIABLE_CATEGORIES: readonly Category[] = [
  'boodschappen',
  'maaltijdbezorging',
  'restaurants',
  'vervoer',
  'auto',
  'shopping',
  'vrije_tijd',
  'gezondheid',
  'reizen',
  'cash',
  'overig',
];

/** Categories that are (mostly) fixed monthly amounts. */
export const FIXED_CATEGORIES: readonly Category[] = [
  'wonen',
  'energie',
  'telecom',
  'abonnementen',
  'verzekeringen',
  'kinderen',
];

/** Not spending: excluded from all spending statistics. */
export const NON_SPENDING_CATEGORIES: readonly Category[] = ['inkomen', 'sparen'];

export type AccountId = 'zicht' | 'spaar' | 'beleggen';

export interface Account {
  id: AccountId;
  name: string;
  balanceCents: Cents;
}

export type SubscriptionKind = 'video' | 'muziek' | 'fitness' | 'nieuws' | 'software' | 'ander';

export interface Transaction {
  id: string;
  date: ISODate;
  amountCents: Cents;
  merchant: string;
  category: Category;
  accountId: AccountId;
  description?: string;
  /** Known recurring payment (e.g. SEPA direct debit / subscription). */
  recurring?: boolean;
  subscriptionKind?: SubscriptionKind;
}

export type GoalType = 'huis' | 'auto' | 'pensioen' | 'buffer' | 'studie' | 'verbouwing' | 'ander';

export interface Goal {
  id: string;
  name: string;
  type: GoalType;
  targetCents: Cents;
  targetDate: ISODate;
  /** Which balance counts towards the goal. */
  measure: 'liquid' | 'liquid_plus_investments';
  note?: string;
}

export interface Budget {
  category: Category;
  monthlyCents: Cents;
}

/** A known monthly payment or income, used to post transactions when the clock advances. */
export interface RecurringItem {
  id: string;
  merchant: string;
  category: Category;
  amountCents: Cents;
  dayOfMonth: number;
  accountId: AccountId;
  subscriptionKind?: SubscriptionKind;
  description?: string;
}

export type Housing =
  | { type: 'huur'; rentCents: Cents }
  | {
      type: 'hypotheek';
      principalCents: Cents;
      annualRate: number;
      monthsRemaining: number;
      monthlyPaymentCents: Cents;
      homeValueCents: Cents;
    };

export type WorkRegime = 'voltijds' | '4/5' | 'halftijds';

export type PersonaId = 'lotte' | 'sam-noor' | 'marc' | 'emma';

export interface Persona {
  id: PersonaId;
  firstName: string;
  displayName: string;
  /** How the future self introduces itself, e.g. "Lotte, 37". */
  futureSelfName: string;
  age: number;
  birthYear: number;
  city: string;
  employer: string;
  householdLabel: string;
  netIncomeCents: Cents;
  incomeDay: number;
  workRegime: WorkRegime;
  housing: Housing;
  accounts: Account[];
  goals: Goal[];
  budgets: Budget[];
  recurring: RecurringItem[];
  retirementAge: number;
  /** Planned monthly transfer to investments. */
  investMonthlyCents: Cents;
  /** Planned monthly transfer to savings. */
  saveMonthlyCents: Cents;
  suggestedQuestions: string[];
  story: string;
  emoji: string;
}

export type Severity = 'info' | 'let_op' | 'waarschuwing' | 'dringend';

export const SEVERITY_LABELS: Record<Severity, string> = {
  info: 'Info',
  let_op: 'Let op',
  waarschuwing: 'Waarschuwing',
  dringend: 'Dringend',
};

export const SEVERITY_RANK: Record<Severity, number> = {
  info: 1,
  let_op: 2,
  waarschuwing: 3,
  dringend: 4,
};

export type AlertType =
  | 'category_overspend'
  | 'budget'
  | 'subscription_new'
  | 'subscription_increase'
  | 'subscription_overlap'
  | 'unusual_transaction'
  | 'buffer'
  | 'goal_drift';

export const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  category_overspend: 'Meer dan normaal',
  budget: 'Budget',
  subscription_new: 'Nieuw abonnement',
  subscription_increase: 'Abonnement duurder',
  subscription_overlap: 'Overlappende abonnementen',
  unusual_transaction: 'Ongewone uitgave',
  buffer: 'Buffer',
  goal_drift: 'Doel schuift op',
};

export type AlertActionKind = 'eenmalig' | 'budget' | 'snooze' | 'chat';

export interface AlertAction {
  kind: AlertActionKind;
  label: string;
}

export interface WhyLine {
  label: string;
  value: string;
}

export interface GoalDelay {
  goalId: string;
  goalName: string;
  months: number;
}

export interface AlertImpact {
  /** Extra outflow per month if the pattern continues. */
  monthlyDeltaCents: Cents;
  /** Net worth difference in 2035 versus baseline (negative = less). */
  netWorth2035DeltaCents: Cents;
  goalDelays: GoalDelay[];
  text: string;
}

export interface Alert {
  /** Stable dedupe key; also used as id. */
  id: string;
  type: AlertType;
  severity: Severity;
  title: string;
  message: string;
  category?: Category;
  merchant?: string;
  transactionId?: string;
  /** All transactions the customer marks as one-off when resolving this alert. */
  transactionIds?: string[];
  amountCents?: Cents;
  suggestedBudgetCents?: Cents;
  why: { rule: string; lines: WhyLine[] };
  impact?: AlertImpact;
  actions: AlertAction[];
  /** Relevance score used for ranking (higher first). */
  score: number;
  /** Question to seed the chat with. */
  chatPrompt: string;
}

export interface AlertMemory {
  /** key -> date resolved ("was eenmalig") */
  resolved: Record<string, ISODate>;
  /** key -> snoozed until (inclusive) */
  snoozedUntil: Record<string, ISODate>;
  /** key -> first date this alert was shown */
  firstSeen: Record<string, ISODate>;
  /** date of the last push notification */
  lastNotificationDate: ISODate | null;
}

export const emptyAlertMemory = (): AlertMemory => ({
  resolved: {},
  snoozedUntil: {},
  firstSeen: {},
  lastNotificationDate: null,
});

/** Everything the engine needs to evaluate one customer at one moment. */
export interface CustomerState {
  persona: Persona;
  today: ISODate;
  transactions: Transaction[];
  accounts: Account[];
  goals: Goal[];
  budgets: Budget[];
  /** Transactions the customer marked as one-off: excluded from baselines. */
  excludedTxIds: string[];
  alertMemory: AlertMemory;
}
