import { daysBetween } from './dates';
import { pensionSeason } from './detectors/savings';
import { l } from './format';
import type {
  Domain,
  FeedbackState,
  Insight,
  InsightStatus,
  InsightType,
  ISODate,
  Preferences,
  RankedInsight,
  ScoreParts,
  Suppressed,
} from './types';

/**
 * Step 5: decide what deserves attention, and when.
 *
 *   score = value x confidence x timeliness x affinity
 *
 * - value: how much it is worth to the customer, on a log scale so a big
 *   ticket does not drown everything else.
 * - confidence: how sure the detector is about the premise.
 * - timeliness: each type has a moment. An oil delivery is hot for a few
 *   weeks; solar panels fit best once the boxes of a move are unpacked.
 * - affinity: a Beta posterior per insight type. The prior is what all
 *   customers did with this type (learned at population scale); the
 *   customer's own "useful" and "not for me" taps update it.
 *
 * Then a delivery policy keeps it quiet: at most one tip on the home screen,
 * and nothing that was dismissed, snoozed or muted comes back early.
 */

/** Population prior per type: (useful, not useful) pseudo-counts. */
export const PRIORS: Record<InsightType, [number, number]> = {
  solar: [4, 6],
  heat_pump: [3, 7],
  renovation: [3, 7],
  ev_switch: [3, 7],
  home_charging: [5, 5],
  energy_contract: [5, 5],
  streaming_rotation: [6, 4],
  price_increase: [5, 5],
  trial_converted: [6, 4],
  pension_saving: [5, 5],
  idle_cash: [4, 6],
};

export const DOMAIN_OF: Record<InsightType, Domain> = {
  solar: 'energy',
  heat_pump: 'energy',
  renovation: 'energy',
  ev_switch: 'energy',
  home_charging: 'energy',
  energy_contract: 'energy',
  streaming_rotation: 'subscriptions',
  price_increase: 'subscriptions',
  trial_converted: 'subscriptions',
  pension_saving: 'savings',
  idle_cash: 'savings',
};

/** Below this, an insight is not worth anyone's attention. */
export const MIN_SCORE = 0.12;
/** Below this, it waits in the inbox and never claims the home screen. */
export const FEATURE_SCORE = 0.3;

function clamp(v: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, v));
}

/** Piecewise-linear curve through (day, value) points. */
function curve(points: [number, number][], x: number): number {
  if (x <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x0, y0] = points[i - 1];
    if (x <= x1) return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
  }
  return points[points.length - 1][1];
}

/** How well today fits the moment of this insight. */
export function timeliness(insight: Insight, today: ISODate): number {
  const age = daysBetween(insight.triggeredAt, today);
  switch (insight.type) {
    case 'heat_pump':
      // The bill is fresh: act within a few weeks, then it fades until the next delivery.
      return curve([[0, 1], [21, 0.9], [60, 0.45], [180, 0.25]], age);
    case 'solar':
      // Not in the chaos of the move itself; best once settled, before a year has passed.
      return curve([[0, 0.1], [21, 0.6], [45, 1], [150, 0.85], [365, 0.35]], age);
    case 'renovation':
      return curve([[0, 0.6], [30, 0.8], [365, 0.6], [5 * 365, 0.3]], age);
    case 'ev_switch':
      // A garage bill is a decision moment; plain fuel spend is a slow burn.
      return insight.id.endsWith(':fuel') ? 0.4 : curve([[0, 1], [30, 0.7], [90, 0.4]], age);
    case 'home_charging':
      return curve([[0, 0.7], [60, 0.8], [240, 0.5]], age);
    case 'energy_contract':
      return curve([[0, 1], [30, 0.75], [90, 0.3]], age);
    case 'streaming_rotation':
      return curve([[0, 1], [14, 0.85], [60, 0.55]], age);
    case 'price_increase':
      return curve([[0, 1], [14, 0.8], [60, 0.3]], age);
    case 'trial_converted':
      return curve([[0, 1], [10, 0.9], [45, 0.3]], age);
    case 'pension_saving':
      return pensionSeason(today);
    case 'idle_cash':
      return 0.5;
  }
}

/** Log-scaled worth: €50 a year is small, €1.500 a year is as big as it gets. */
export function valueScore(insight: Insight): number {
  if (insight.annualValue === undefined) return 0.45;
  return clamp(Math.log10(1 + insight.annualValue) / Math.log10(1 + 1500), 0.1, 1);
}

export function affinity(type: InsightType, feedback: FeedbackState): number {
  const [a, b] = PRIORS[type];
  const fb = feedback.byType[type];
  const mean = (a + (fb?.positive ?? 0)) / (a + b + (fb?.positive ?? 0) + (fb?.negative ?? 0));
  // Map the 0..1 posterior mean to a multiplier around 1.
  return 0.6 + 0.8 * mean;
}

export function score(insight: Insight, feedback: FeedbackState, today: ISODate): ScoreParts {
  const value = valueScore(insight);
  const confidence = clamp(insight.confidence);
  const time = clamp(timeliness(insight, today));
  const aff = affinity(insight.type, feedback);
  return { value, confidence, timeliness: time, affinity: aff, total: clamp(value * confidence * time * aff) };
}

export const EMPTY_FEEDBACK: FeedbackState = { byInsight: {}, byType: {} };

export const DEFAULT_PREFS: Preferences = { domains: { energy: true, subscriptions: true, savings: true } };

const DOMAIN_LABEL: Record<Domain, { nl: string; en: string }> = {
  energy: l('energie', 'energy'),
  subscriptions: l('abonnementen', 'subscriptions'),
  savings: l('sparen', 'savings'),
};

export function rank(
  insights: Insight[],
  feedback: FeedbackState,
  prefs: Preferences,
  today: ISODate,
): { ranked: RankedInsight[]; suppressed: Suppressed[]; featured: RankedInsight | null } {
  const ranked: RankedInsight[] = [];
  const suppressed: Suppressed[] = [];

  for (const insight of insights) {
    if (!prefs.domains[insight.domain]) {
      suppressed.push({
        type: insight.type,
        reason: l(`Tips over ${DOMAIN_LABEL[insight.domain].nl} staan uit.`, `Tips about ${DOMAIN_LABEL[insight.domain].en} are turned off.`),
      });
      continue;
    }
    const muted = feedback.byType[insight.type]?.mutedUntil;
    if (muted && muted > today) {
      suppressed.push({ type: insight.type, reason: l('Je gaf aan dat dit niet voor jou is.', 'You said this is not for you.') });
      continue;
    }
    const parts = score(insight, feedback, today);
    if (parts.total < MIN_SCORE) {
      suppressed.push({
        type: insight.type,
        reason:
          parts.timeliness < 0.3
            ? l('Nog niet het juiste moment.', 'Not the right moment yet.')
            : l('Niet belangrijk genoeg om je nu te storen.', 'Not important enough to bother you now.'),
      });
      continue;
    }
    const fb = feedback.byInsight[insight.id];
    let status: InsightStatus = 'new';
    if (fb) {
      status = fb.status === 'snoozed' && fb.until && fb.until <= today ? 'seen' : fb.status;
    }
    ranked.push({ ...insight, score: parts, status });
  }

  ranked.sort((a, b) => b.score.total - a.score.total);
  const featured =
    ranked
      .filter((r) => (r.status === 'new' || r.status === 'seen') && r.score.total >= FEATURE_SCORE)
      .sort((a, b) => attention(b, today) - attention(a, today))[0] ?? null;
  return { ranked, suppressed, featured };
}

/**
 * Which insight gets the single spot on the home screen. The inbox is sorted
 * by score; the home screen also weighs novelty: a tip that was triggered in
 * the last days beats one the customer already looked at.
 */
export function attention(r: RankedInsight, today: ISODate): number {
  const fresh = daysBetween(r.triggeredAt, today) <= 3 ? 1.3 : 1;
  const novelty = r.status === 'seen' ? 0.7 : 1;
  return r.score.total * fresh * novelty;
}
