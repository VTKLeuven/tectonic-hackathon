/**
 * Core data model of the engine.
 *
 * Everything here is plain data so the same engine runs in the Expo app, in the
 * demo website and (conceptually) as a streaming job next to KBC's transaction
 * ledger. No I/O, no clock: the caller passes "today" explicitly.
 */

/** Calendar date as `YYYY-MM-DD`. Never a timestamp, so no timezone can shift a day. */
export type ISODate = string;

export type Lang = 'nl' | 'en';

/** A string in every language the interface supports. */
export interface L10n {
  nl: string;
  en: string;
}

export type Channel = 'card' | 'transfer' | 'direct_debit' | 'instant';

/** A booked transaction on the customer's current account, as the bank already has it. */
export interface Transaction {
  id: string;
  date: ISODate;
  /** EUR. Negative is money out, positive is money in. */
  amount: number;
  counterparty: string;
  /** Free text or structured communication, as it appears on the statement. */
  description: string;
  channel: Channel;
}

export type CategoryId =
  | 'income'
  | 'rent'
  | 'mortgage'
  | 'groceries'
  | 'electricity'
  | 'gas'
  | 'energy_credit'
  | 'heating_oil'
  | 'water'
  | 'fuel'
  | 'ev_charging'
  | 'car'
  | 'public_transport'
  | 'streaming'
  | 'music'
  | 'cloud'
  | 'telecom'
  | 'gym'
  | 'insurance'
  | 'furniture'
  | 'diy'
  | 'moving'
  | 'notary'
  | 'taxes'
  | 'restaurants'
  | 'shopping'
  | 'health'
  | 'childcare'
  | 'pension_saving'
  | 'savings'
  | 'solar'
  | 'other';

export interface Category {
  id: CategoryId;
  label: L10n;
  /** Name of a lucide icon; the UI maps it to a component. */
  icon: string;
  group: 'income' | 'housing' | 'energy' | 'mobility' | 'subscriptions' | 'daily' | 'finance' | 'other';
}

/** A transaction after enrichment: categorised and linked to a known merchant when possible. */
export interface EnrichedTransaction extends Transaction {
  category: CategoryId;
  /** Stable key of the recognised merchant, e.g. `netflix`. Falls back to a normalised counterparty. */
  merchantKey: string;
  /** Display name of the merchant, e.g. `Netflix`. */
  merchantName: string;
  /** Extra facts parsed from the description, such as litres of heating oil. */
  facts: { litres?: number; kwh?: number };
}

export type Cadence = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

/** A payment that repeats on a rhythm: a subscription, a rent, an energy advance. */
export interface RecurringStream {
  /** `merchant:category`, unique per stream. */
  id: string;
  /** The merchant key, e.g. `netflix`. */
  key: string;
  name: string;
  category: CategoryId;
  cadence: Cadence;
  /** Typical amount per charge, positive EUR. */
  amount: number;
  /** Most recent amount, positive EUR. */
  lastAmount: number;
  firstDate: ISODate;
  lastDate: ISODate;
  count: number;
  active: boolean;
  transactionIds: string[];
  /** Set when the amount changed and then stayed changed. */
  priceChange?: { from: number; to: number; date: ISODate; transactionId: string };
  /** Set when the first charge was a near-free trial and full price followed. */
  trialConverted?: { trialAmount: number; date: ISODate; transactionId: string };
  /** Cost per year at the current price. */
  annualCost: number;
}

export type SignalId =
  | 'moved'
  | 'home_purchase'
  | 'homeowner'
  | 'renter'
  | 'heating_oil'
  | 'has_solar'
  | 'ev_driver'
  | 'petrol_driver'
  | 'car_repair'
  | 'energy_advance_up'
  | 'energy_settlement'
  | 'streaming_stack'
  | 'pension_saving'
  | 'salary'
  | 'student_life';

/** Something the engine believes about the customer's situation, with the proof. */
export interface Signal {
  id: SignalId;
  /** The moment the signal became true (the move, the delivery, ...). */
  date: ISODate;
  /** 0..1 */
  confidence: number;
  label: L10n;
  evidence: string[];
  data: Record<string, number | string | boolean>;
}

export type InsightType =
  | 'solar'
  | 'heat_pump'
  | 'renovation'
  | 'ev_switch'
  | 'home_charging'
  | 'energy_contract'
  | 'streaming_rotation'
  | 'price_increase'
  | 'trial_converted'
  | 'pension_saving'
  | 'idle_cash'
  | 'nightlife_budget';

export type Domain = 'energy' | 'subscriptions' | 'savings';

export interface Evidence {
  transactionId?: string;
  label: L10n;
  date?: ISODate;
  amount?: number;
}

export interface Line {
  label: L10n;
  value: L10n;
  /** Emphasise the line (totals). */
  strong?: boolean;
}

export type ActionKind = 'simulate' | 'product' | 'learn' | 'manage';

export interface InsightAction {
  kind: ActionKind;
  label: L10n;
  /** What the action opens, for the UI to decide how to render it. */
  target?: string;
}

/** A scenario the customer can toggle in the detail screen, with its own numbers. */
export interface Scenario {
  id: string;
  label: L10n;
  annualSaving: number;
  upfrontCost?: number;
  co2SavedKg?: number;
  note?: L10n;
}

export interface Insight {
  /** Stable across runs: the same situation produces the same id. */
  id: string;
  type: InsightType;
  domain: Domain;
  title: L10n;
  summary: L10n;
  /** One line for a push/banner. */
  teaser: L10n;
  /** Estimated value per year in EUR (saving or tax advantage). */
  annualValue?: number;
  upfrontCost?: number;
  paybackYears?: number;
  co2SavedKg?: number;
  /** 0..1, how sure the engine is that the premise holds. */
  confidence: number;
  /** The event that makes now a good moment. */
  triggeredAt: ISODate;
  trigger: L10n;
  evidence: Evidence[];
  /** "Why am I seeing this?" in plain words. */
  reasons: L10n[];
  /** How the number was computed. */
  breakdown: Line[];
  assumptions: Line[];
  scenarios?: Scenario[];
  actions: InsightAction[];
}

/** An insight the engine considered and deliberately did not show, with the reason. */
export interface Suppressed {
  type: InsightType;
  reason: L10n;
}

export interface ScoreParts {
  value: number;
  confidence: number;
  timeliness: number;
  affinity: number;
  total: number;
}

export interface RankedInsight extends Insight {
  score: ScoreParts;
  status: InsightStatus;
}

export type InsightStatus = 'new' | 'seen' | 'snoozed' | 'dismissed' | 'done';

/** What the customer did with earlier insights. The only input that comes from the customer. */
export interface FeedbackState {
  byInsight: Record<string, { status: Exclude<InsightStatus, 'new'>; at: ISODate; until?: ISODate }>;
  byType: Partial<Record<InsightType, { positive: number; negative: number; mutedUntil?: ISODate }>>;
}

export interface Preferences {
  domains: Record<Domain, boolean>;
}

export interface SwarmAgent {
  id: string;
  name: string;
  role: L10n;
  icon: 'shield' | 'beer' | 'graduation-cap';
  status: 'active' | 'evaluating' | 'idle';
  confidence: number;
  verdict: L10n;
  metrics: { label: L10n; value: string }[];
}

export interface Analysis {
  today: ISODate;
  transactions: EnrichedTransaction[];
  recurring: RecurringStream[];
  signals: Signal[];
  insights: RankedInsight[];
  suppressed: Suppressed[];
  /** The single insight worth a spot on the home screen, if any. */
  featured: RankedInsight | null;
  energy: EnergyProfile;
  /** Active specialized agents deliberating in the Kate Swarm */
  agents?: SwarmAgent[];
}

export interface EnergyMonth {
  month: string; // YYYY-MM
  electricity: number;
  heating: number;
  mobility: number;
}

export interface EnergyProfile {
  months: EnergyMonth[];
  annual: { electricity: number; heating: number; mobility: number; total: number };
  co2Kg: number;
  estimatedKwh?: number;
  heatingSource: 'oil' | 'gas' | 'unknown';
}
