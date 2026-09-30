/** Shared request/response shapes between the app, the offline fallback and the backend. */
import type { GoalDelta, SeriesPoint } from './projection';
import type { Snapshot } from './snapshot';

export interface ScenarioCard {
  label: string;
  baseline: SeriesPoint[];
  scenario: SeriesPoint[];
  netWorth2035DeltaCents: number;
  goalDeltas: GoalDelta[];
  feasibilityOk: boolean | null;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  snapshot: Snapshot;
  messages: ChatMessage[];
  /** Optional alert the customer tapped "Vraag het aan jezelf in 2035" on. */
  alertContext?: string;
}

export interface ChatReply {
  reply: string;
  mode: 'claude' | 'offline';
  scenario?: ScenarioCard;
  toolsUsed: string[];
}

export const CHAT_LIMITS = {
  maxMessages: 20,
  maxMessageChars: 1000,
  maxAlertContextChars: 2000,
} as const;
