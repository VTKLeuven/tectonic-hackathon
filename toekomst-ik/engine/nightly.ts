/**
 * "Nachtelijke run": the cheap batch job that recomputes every customer's twin and produces
 * proactive messages (goal drift, milestones, opportunities). Deterministic, no LLM involved.
 */
import { allCategoryStats, cashflowOutlook } from './baseline';
import { formatDateNL } from './dates';
import { formatEUR } from './money';
import { buildProjectionInput, project, type ProjectionResult } from './projection';
import { evaluateAlerts, type AlertEvaluation } from './alerts';
import { sum } from './finance';
import type { CustomerState, ISODate } from './types';

export type NightlyKind = 'goal_drift' | 'milestone' | 'opportunity' | 'info';

export interface NightlyMessage {
  id: string;
  kind: NightlyKind;
  title: string;
  message: string;
  date: ISODate;
}

export interface NightlyResult {
  ranAt: ISODate;
  projection: ProjectionResult;
  alerts: AlertEvaluation;
  messages: NightlyMessage[];
  /** Milliseconds the engine needed; shows how cheap the batch is. */
  durationMs: number;
}

export function runNightly(state: CustomerState, nowMs: () => number = () => Date.now()): NightlyResult {
  const t0 = nowMs();
  const input = buildProjectionInput(state);
  const projection = project(input);
  const alerts = evaluateAlerts(state);
  const messages: NightlyMessage[] = [];
  const today = state.today;
  const first = state.persona.firstName;

  for (const g of projection.goals) {
    if (g.achievedDate && g.achievedDate <= today) {
      messages.push({
        id: `milestone:${g.goalId}`,
        kind: 'milestone',
        title: `Mijlpaal: '${g.name}' is binnen`,
        message: `Je hebt ${formatEUR(g.currentCents, { decimals: 0 })} opzij, meer dan de ${formatEUR(g.targetCents, { decimals: 0 })} die je voor '${g.name}' nodig had. Tijd om het volgende doel te kiezen?`,
        date: today,
      });
    } else if (g.monthsDelta !== null && g.monthsDelta <= -2) {
      messages.push({
        id: `ahead:${g.goalId}`,
        kind: 'milestone',
        title: `Je loopt voor op '${g.name}'`,
        message: `Aan dit ritme haal je '${g.name}' ${-g.monthsDelta} maanden vroeger dan gepland (${formatDateNL(g.achievedDate!)}).`,
        date: today,
      });
    } else if (g.monthsDelta !== null && g.monthsDelta >= 2) {
      messages.push({
        id: `drift:${g.goalId}`,
        kind: 'goal_drift',
        title: `'${g.name}' schuift ${g.monthsDelta} maanden op`,
        message: `Verwacht op ${formatDateNL(g.achievedDate!)} in plaats van ${formatDateNL(g.targetDate)}. Kijk bij de Waakhond wat er speelt, of vraag het aan jezelf in 2035.`,
        date: today,
      });
    } else if (g.achievedDate === null) {
      messages.push({
        id: `unreachable:${g.goalId}`,
        kind: 'goal_drift',
        title: `'${g.name}' is nog niet in zicht`,
        message: `Aan je huidige ritme haal je dit doel niet vóór je pensioen. Een gesprek met een KBC-adviseur kan helpen om het plan bij te sturen.`,
        date: today,
      });
    }
  }

  // Opportunity: too much idle money on the current account.
  const zicht = state.accounts.find((a) => a.id === 'zicht')?.balanceCents ?? 0;
  const stats = allCategoryStats(state);
  const monthly = sum(stats.map((s) => s.baselineCents));
  if (zicht > monthly * 2 && zicht > 300000) {
    const move = Math.floor((zicht - monthly * 1.5) / 10000) * 10000;
    messages.push({
      id: 'opportunity:idle-cash',
      kind: 'opportunity',
      title: 'Geld dat stilstaat',
      message: `Er staat ${formatEUR(zicht, { decimals: 0 })} op je zichtrekening, meer dan twee maanden uitgaven. ${formatEUR(move, { decimals: 0 })} overzetten naar je spaarrekening levert rente op zonder dat je het mist.`,
      date: today,
    });
  }

  // Opportunity: mortgage nearly paid off.
  if (state.persona.housing.type === 'hypotheek' && state.persona.housing.monthsRemaining <= 36) {
    messages.push({
      id: 'opportunity:mortgage-end',
      kind: 'opportunity',
      title: 'Je woonkrediet is bijna afbetaald',
      message: `Nog ${state.persona.housing.monthsRemaining} maanden en dan komt er ${formatEUR(state.persona.housing.monthlyPaymentCents, { decimals: 0 })} per maand vrij. Als je dat bedrag blijft sparen, groeit je pensioenpot stevig verder.`,
      date: today,
    });
  }

  // Info: short-term cash outlook.
  const outlook = cashflowOutlook(state);
  if (outlook.minBalanceCents >= outlook.bufferCents) {
    messages.push({
      id: 'info:cashflow-ok',
      kind: 'info',
      title: 'Je komt de maand door',
      message: `Tot je volgende inkomen blijft je zichtrekening boven ${formatEUR(outlook.minBalanceCents, { decimals: 0 })}. Geen actie nodig, ${first}.`,
      date: today,
    });
  }

  messages.push({
    id: 'info:summary',
    kind: 'info',
    title: 'Je twin is bijgewerkt',
    message: `Vermogen in 2035 volgens je huidige koers: ${formatEUR(projection.at2035.netWorthCents, { decimals: 0 })}. ${alerts.active.length} actieve ${alerts.active.length === 1 ? 'signaal' : 'signalen'}.`,
    date: today,
  });

  return { ranAt: today, projection, alerts, messages, durationMs: nowMs() - t0 };
}
