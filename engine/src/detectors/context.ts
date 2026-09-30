import type {
  EnrichedTransaction,
  Insight,
  ISODate,
  RecurringStream,
  Signal,
  SignalId,
  Suppressed,
} from '../types';

/** What every detector gets to look at. Read-only. */
export interface DetectorContext {
  today: ISODate;
  transactions: EnrichedTransaction[];
  streams: RecurringStream[];
  signals: Signal[];
  profile: CustomerProfile;
  /** Current-account balance at the end of each day, oldest first. */
  balances: { date: ISODate; balance: number }[];
  signal(id: SignalId): Signal | undefined;
  tx(id: string): EnrichedTransaction | undefined;
}

/** What the bank knows from onboarding (KYC). Not asked again. */
export interface CustomerProfile {
  firstName: string;
  age: number;
}

export type DetectorResult = Insight | Suppressed | null | (Insight | Suppressed)[];

export type Detector = (ctx: DetectorContext) => DetectorResult;

export function isInsight(r: Insight | Suppressed): r is Insight {
  return 'id' in r;
}
