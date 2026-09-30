import { addDays } from './dates';
import type { FeedbackState, Insight, ISODate } from './types';

/**
 * The only thing the customer ever tells the engine, and always optional:
 * what they did with a tip. One tap, no forms.
 */
export type FeedbackAction =
  /** Opened the tip. */
  | 'seen'
  /** Followed the tip's main action. Counts as useful. */
  | 'useful'
  /** "Later": hide for a month. */
  | 'snooze'
  /** "Not for me": hide this tip and mute its type for half a year. */
  | 'dismiss'
  /** Undo any of the above. */
  | 'reset';

export const SNOOZE_DAYS = 30;
export const MUTE_DAYS = 180;

export function applyFeedback(state: FeedbackState, insight: Pick<Insight, 'id' | 'type'>, action: FeedbackAction, today: ISODate): FeedbackState {
  const byInsight = { ...state.byInsight };
  const byType = { ...state.byType };
  const typeState = { positive: 0, negative: 0, ...byType[insight.type] };
  const current = byInsight[insight.id];

  switch (action) {
    case 'seen':
      if (!current) byInsight[insight.id] = { status: 'seen', at: today };
      break;
    case 'useful':
      byInsight[insight.id] = { status: 'done', at: today };
      if (current?.status !== 'done') typeState.positive += 1;
      break;
    case 'snooze':
      byInsight[insight.id] = { status: 'snoozed', at: today, until: addDays(today, SNOOZE_DAYS) };
      break;
    case 'dismiss':
      byInsight[insight.id] = { status: 'dismissed', at: today };
      typeState.negative += 1;
      typeState.mutedUntil = addDays(today, MUTE_DAYS);
      break;
    case 'reset':
      delete byInsight[insight.id];
      if (current?.status === 'dismissed') {
        typeState.negative = Math.max(0, typeState.negative - 1);
        delete typeState.mutedUntil;
      }
      if (current?.status === 'done') typeState.positive = Math.max(0, typeState.positive - 1);
      break;
  }
  byType[insight.type] = typeState;
  return { byInsight, byType };
}
