/**
 * De Waakhond: spending warnings relative to the customer's own baseline.
 * Rules run on the transaction stream; every alert carries the numbers behind it and its future impact.
 */
import { A } from './assumptions';
import {
  allCategoryStats,
  cashflowOutlook,
  categoryTxStats,
  detectSubscriptions,
  merchantStats,
  overallTxStats,
  spendingTransactions,
  SUBSCRIPTION_KIND_LABELS,
  type CategoryStats,
  type Subscription,
} from './baseline';
import { addDays, diffDays, formatDateNL, formatMonthNL, monthKey, monthsBetween } from './dates';
import { formatEUR, formatPct } from './money';
import { median } from './finance';
import { buildProjectionInput, compareProjections, project, type ProjectionInput, type ProjectionResult } from './projection';
import {
  CATEGORY_LABELS,
  SEVERITY_RANK,
  type Alert,
  type AlertAction,
  type AlertImpact,
  type AlertMemory,
  type CustomerState,
  type GoalDelay,
  type ISODate,
  type Severity,
  type SubscriptionKind,
} from './types';

interface Ctx {
  state: CustomerState;
  input: ProjectionInput;
  base: ProjectionResult;
  stats: CategoryStats[];
}

const ACT = {
  eenmalig: (label = 'Klopt, was eenmalig'): AlertAction => ({ kind: 'eenmalig', label }),
  budget: (label = 'Stel een budget in'): AlertAction => ({ kind: 'budget', label }),
  snooze: (): AlertAction => ({ kind: 'snooze', label: 'Snooze 3 dagen' }),
  chat: (): AlertAction => ({ kind: 'chat', label: 'Vraag het aan jezelf in 2035' }),
};

function roundUp(cents: number, step: number): number {
  return Math.ceil(cents / step) * step;
}

/** Future impact of an extra monthly outflow, computed by the twin. */
export function impactOfMonthlyDelta(ctx: Ctx, monthlyDeltaCents: number, intro = 'Als dit elke maand zo doorgaat'): AlertImpact | undefined {
  if (monthlyDeltaCents < 500) return undefined;
  const scen = project(ctx.input, { extraMonthlySpendCents: monthlyDeltaCents });
  const cmp = compareProjections(ctx.base, scen);
  const goalDelays: GoalDelay[] = cmp.goals
    .filter((g) => (g.monthsDelta !== null && g.monthsDelta > 0) || (g.baseDate && !g.scenarioDate))
    .map((g) => ({ goalId: g.goalId, goalName: g.name, months: g.monthsDelta ?? 999 }));
  const less = -cmp.netWorth2035DeltaCents;
  let text = `${intro}: ${formatEUR(less, { decimals: 0 })} minder in 2035`;
  if (goalDelays.length) {
    const g = goalDelays[0];
    text += g.months >= 999 ? ` en '${g.goalName}' raakt buiten bereik` : ` en '${g.goalName}' ${g.months} ${g.months === 1 ? 'maand' : 'maanden'} later`;
  }
  return { monthlyDeltaCents, netWorth2035DeltaCents: cmp.netWorth2035DeltaCents, goalDelays, text: text + '.' };
}

function severityForExtra(extraCents: number, ratio: number): Severity {
  if (extraCents >= 60000 || ratio >= 4) return 'dringend';
  if (extraCents >= 25000 || ratio >= 2.5) return 'waarschuwing';
  return 'let_op';
}

function scoreOf(severity: Severity, cents: number, bonus = 0): number {
  return SEVERITY_RANK[severity] * 1000 + Math.min(1000, Math.round(cents / 100)) + bonus;
}

function overspendAlerts(ctx: Ctx, subs: Subscription[]): Alert[] {
  const out: Alert[] = [];
  const month = monthKey(ctx.state.today);
  for (const s of ctx.stats) {
    if (s.category === 'wonen') continue;
    const baseline = s.baselineCents;
    let projected = s.projectedCents;
    if (!s.isVariable) {
      // Fixed cost: only once this month's bill has posted, and not if a price-increase alert covers it.
      if (s.mtdCents === 0) continue;
      if (subs.some((sub) => sub.category === s.category && (sub.increasePct ?? 0) >= 0.1)) continue;
      projected = s.mtdCents;
    }
    const extra = projected - baseline;
    const ratio = baseline > 0 ? projected / baseline : projected > 6000 ? 99 : 0;
    // Noise guard: the jump must be larger than the customer's own month-to-month variation,
    // and matter relative to their income.
    // Robust spread (median absolute deviation) so one wild month does not hide the next one.
    const mad = median(s.months.map((m) => Math.abs(m.totalCents - baseline)));
    const spread = Math.round(mad * 1.4826);
    const noiseCeiling = baseline + 2.5 * spread;
    const minExtra = Math.max(5000, Math.round(ctx.input.netIncomeCents * 0.04));
    if (extra < minExtra || ratio < 1 + A.overspendThreshold || projected < noiseCeiling) continue;
    const label = CATEGORY_LABELS[s.category];
    // With no history in this category the ratio says nothing; judge on the amount alone, and never "dringend".
    const severity: Severity = baseline > 0 ? severityForExtra(extra, ratio) : extra >= 60000 ? 'waarschuwing' : 'let_op';
    const top = s.topMerchants[0];
    const windowTxIds = spendingTransactions(ctx.state)
      .filter((t) => t.category === s.category && (s.window === 'mtd' ? monthKey(t.date) === month : t.date >= addDays(ctx.state.today, -29)))
      .map((t) => t.id);
    const windowText =
      s.window === 'mtd'
        ? `Na ${s.daysElapsed} van ${s.daysInMonth} dagen zit je aan ${formatEUR(s.mtdCents)}; aan dit tempo wordt dat ${formatEUR(projected, { decimals: 0 })} tegen het einde van de maand.`
        : `De laatste 30 dagen gaf je ${formatEUR(s.rolling30Cents)} uit.`;
    const message = s.isVariable
      ? `${label} loopt op. ${windowText} Normaal zit je rond ${formatEUR(baseline, { decimals: 0 })} per maand.`
      : `Je ${label.toLowerCase()} kost deze maand ${formatEUR(s.mtdCents)}, normaal ${formatEUR(baseline, { decimals: 0 })}.`;
    const lines = [
      { label: 'Jouw normaal (mediaan laatste 6 maanden)', value: formatEUR(baseline, { decimals: 0 }) },
      ...s.months.map((m) => ({ label: `  ${formatMonthNL(m.month)}`, value: formatEUR(m.totalCents, { decimals: 0 }) })),
      { label: s.window === 'mtd' ? `Deze maand tot nu (dag ${s.daysElapsed}/${s.daysInMonth})` : 'Laatste 30 dagen', value: formatEUR(s.window === 'mtd' ? s.mtdCents : s.rolling30Cents) },
      ...(s.isVariable && s.window === 'mtd' ? [{ label: 'Verwacht einde maand (tempo)', value: formatEUR(projected, { decimals: 0 }) }] : []),
      { label: 'Verschil met normaal', value: baseline > 0 ? `${formatEUR(extra, { decimals: 0, signed: true })} (${formatPct(ratio - 1)})` : `${formatEUR(extra, { decimals: 0, signed: true })} (nieuw in deze categorie)` },
      ...s.topMerchants.map((m) => ({ label: `  ${m.merchant} (${m.count}×)`, value: formatEUR(m.totalCents) })),
    ];
    out.push({
      id: `overspend:${s.category}:${month}`,
      type: 'category_overspend',
      severity,
      title: `${label}: meer dan normaal`,
      message,
      category: s.category,
      merchant: top?.merchant,
      transactionIds: windowTxIds,
      amountCents: extra,
      suggestedBudgetCents: roundUp(Math.max(baseline * 1.1, 2000), 1000),
      why: {
        rule: `Verwacht maandtotaal ≥ ${Math.round((1 + A.overspendThreshold) * 100)} % van je eigen mediaan, minstens ${formatEUR(minExtra, { decimals: 0 })} erboven (4 % van je inkomen) én boven je gewone schommeling (mediaan + 2,5 × robuuste spreiding = ${formatEUR(noiseCeiling, { decimals: 0 })}). ${s.window === 'rolling30' ? 'Vroeg in de maand kijken we naar de laatste 30 dagen.' : 'We rekenen je tempo door naar het einde van de maand.'}`,
        lines,
      },
      impact: impactOfMonthlyDelta(ctx, extra),
      actions: [ACT.eenmalig('Klopt, was eenmalig (telt niet mee voor mijn normaal)'), ACT.budget(), ACT.snooze(), ACT.chat()],
      score: scoreOf(severity, extra, 100),
      chatPrompt: top ? `Waarom waarschuw je me over ${top.merchant}?` : `Waarom waarschuw je me over ${label.toLowerCase()}?`,
    });
  }
  return out;
}

function budgetAlerts(ctx: Ctx, subs: Subscription[]): Alert[] {
  const out: Alert[] = [];
  const month = monthKey(ctx.state.today);
  for (const b of ctx.state.budgets) {
    const s = ctx.stats.find((x) => x.category === b.category);
    if (!s) continue;
    // A fixed bill that got more expensive is already covered by the price-increase signal.
    if (!s.isVariable && subs.some((sub) => sub.category === s.category && (sub.increasePct ?? 0) >= 0.1)) continue;
    const label = CATEGORY_LABELS[b.category];
    const exceeded = s.mtdCents >= b.monthlyCents;
    const willExceed = !exceeded && s.window === 'mtd' && s.isVariable && s.projectedCents >= b.monthlyCents;
    if (!exceeded && !willExceed) continue;
    const severity: Severity = exceeded ? 'waarschuwing' : 'let_op';
    const message = exceeded
      ? `Je budget van ${formatEUR(b.monthlyCents, { decimals: 0 })} voor ${label.toLowerCase()} is op: je zit al aan ${formatEUR(s.mtdCents)} en de maand is nog niet om.`
      : `Aan dit tempo ga je over je budget van ${formatEUR(b.monthlyCents, { decimals: 0 })} voor ${label.toLowerCase()}: verwacht ${formatEUR(s.projectedCents, { decimals: 0 })}.`;
    const extra = Math.max(0, s.projectedCents - b.monthlyCents);
    out.push({
      id: `budget:${b.category}:${month}`,
      type: 'budget',
      severity,
      title: exceeded ? `Budget ${label.toLowerCase()} overschreden` : `Budget ${label.toLowerCase()} bijna op`,
      message,
      category: b.category,
      merchant: s.topMerchants[0]?.merchant,
      amountCents: s.mtdCents,
      suggestedBudgetCents: b.monthlyCents,
      why: {
        rule: 'Uitgaven deze maand ≥ je budget, of (voor variabele categorieën) je tempo doorgerekend tot het einde van de maand ≥ je budget.',
        lines: [
          { label: 'Jouw budget', value: formatEUR(b.monthlyCents, { decimals: 0 }) },
          { label: `Uitgegeven (dag ${s.daysElapsed}/${s.daysInMonth})`, value: formatEUR(s.mtdCents) },
          { label: 'Verwacht einde maand', value: formatEUR(s.projectedCents, { decimals: 0 }) },
          { label: 'Jouw normaal', value: formatEUR(s.baselineCents, { decimals: 0 }) },
          ...s.topMerchants.map((m) => ({ label: `  ${m.merchant} (${m.count}×)`, value: formatEUR(m.totalCents) })),
        ],
      },
      impact: impactOfMonthlyDelta(ctx, Math.max(extra, s.projectedCents - s.baselineCents)),
      actions: [ACT.budget('Pas je budget aan'), ACT.snooze(), ACT.chat()],
      score: scoreOf(severity, extra, 50),
      chatPrompt: `Hoe hou ik ${label.toLowerCase()} binnen mijn budget?`,
    });
  }
  return out;
}

function subscriptionAlerts(ctx: Ctx, subs: Subscription[]): Alert[] {
  const out: Alert[] = [];
  for (const sub of subs) {
    if (sub.isNew && sub.category === 'abonnementen') {
      const severity: Severity = 'let_op';
      out.push({
        id: `subscription_new:${sub.merchant}`,
        type: 'subscription_new',
        severity,
        title: `Nieuw abonnement: ${sub.merchant}`,
        message: `Sinds ${formatDateNL(sub.firstDate, { year: false })} betaal je ${formatEUR(sub.amountCents)} per maand aan ${sub.merchant}. Bewust gekozen? Dan is dit gewoon ter info.`,
        category: sub.category,
        merchant: sub.merchant,
        amountCents: sub.amountCents,
        why: {
          rule: 'Een terugkerende betaling die minder dan 45 dagen geleden voor het eerst verscheen.',
          lines: [
            { label: 'Eerste betaling', value: formatDateNL(sub.firstDate) },
            { label: 'Bedrag per maand', value: formatEUR(sub.amountCents) },
            { label: 'Per jaar', value: formatEUR(sub.amountCents * 12, { decimals: 0 }) },
          ],
        },
        impact: impactOfMonthlyDelta(ctx, sub.amountCents, 'Als je dit abonnement houdt'),
        actions: [ACT.eenmalig('Klopt, bewust gekozen'), ACT.snooze(), ACT.chat()],
        score: scoreOf(severity, sub.amountCents),
        chatPrompt: `Is ${sub.merchant} een probleem voor mijn plannen?`,
      });
    }
    if (sub.increasePct !== null && sub.previousAmountCents && sub.increasePct >= 0.1 && sub.amountCents - sub.previousAmountCents >= 500) {
      const delta = sub.amountCents - sub.previousAmountCents;
      const severity: Severity = delta >= 5000 ? 'waarschuwing' : 'let_op';
      out.push({
        id: `subscription_increase:${sub.merchant}:${sub.amountCents}`,
        type: 'subscription_increase',
        severity,
        title: `${sub.merchant} is duurder geworden`,
        message: `${sub.merchant} rekent nu ${formatEUR(sub.amountCents)} per maand aan, vroeger ${formatEUR(sub.previousAmountCents)} (${formatPct(sub.increasePct)} meer). ${sub.category === 'energie' ? 'Misschien tijd om je voorschot of leverancier te bekijken?' : ''}`.trim(),
        category: sub.category,
        merchant: sub.merchant,
        amountCents: delta,
        why: {
          rule: 'Laatste betaling ≥ 10 % (en ≥ € 5) hoger dan de mediaan van je vorige betalingen aan dezelfde handelaar.',
          lines: [
            { label: 'Laatste betaling', value: `${formatEUR(sub.amountCents)} op ${formatDateNL(sub.lastDate, { year: false })}` },
            { label: 'Vroeger (mediaan)', value: formatEUR(sub.previousAmountCents) },
            { label: 'Verschil per maand', value: formatEUR(delta, { signed: true }) },
            { label: 'Verschil per jaar', value: formatEUR(delta * 12, { decimals: 0, signed: true }) },
          ],
        },
        impact: impactOfMonthlyDelta(ctx, delta, 'Als dit zo blijft'),
        actions: [ACT.eenmalig('Klopt, ik weet ervan'), ACT.budget(), ACT.snooze(), ACT.chat()],
        score: scoreOf(severity, delta, 40),
        chatPrompt: `Wat betekent de duurdere ${sub.merchant}-factuur voor mijn toekomst?`,
      });
    }
  }
  // Overlapping subscriptions of the same kind
  const byKind = new Map<SubscriptionKind, Subscription[]>();
  for (const sub of subs) {
    if (sub.category !== 'abonnementen') continue;
    const arr = byKind.get(sub.kind) ?? [];
    arr.push(sub);
    byKind.set(sub.kind, arr);
  }
  for (const [kind, arr] of byKind) {
    if (arr.length < 2 || kind === 'ander' || kind === 'software') continue;
    const total = arr.reduce((s, x) => s + x.amountCents, 0);
    const cheapest = Math.min(...arr.map((x) => x.amountCents));
    const saving = total - cheapest;
    const severity: Severity = arr.length >= 3 ? 'let_op' : 'info';
    const names = arr.map((x) => x.merchant);
    const nameList = names.length > 1 ? `${names.slice(0, -1).join(', ')} en ${names[names.length - 1]}` : names[0];
    const impact = impactOfMonthlyDelta(ctx, saving, 'Als je er één houdt');
    out.push({
      id: `subscription_overlap:${kind}`,
      type: 'subscription_overlap',
      severity,
      title: `${arr.length} abonnementen voor ${SUBSCRIPTION_KIND_LABELS[kind]}`,
      message: `Je betaalt voor ${arr.length} diensten van hetzelfde soort tegelijk: ${nameList}, samen ${formatEUR(total)} per maand. Gebruik je ze allemaal?`,
      category: 'abonnementen',
      merchant: arr[0].merchant,
      amountCents: saving,
      why: {
        rule: `Twee of meer actieve abonnementen van het soort "${SUBSCRIPTION_KIND_LABELS[kind]}".`,
        lines: [
          ...arr.map((x) => ({ label: `  ${x.merchant}`, value: `${formatEUR(x.amountCents)} / maand` })),
          { label: 'Samen per maand', value: formatEUR(total) },
          { label: 'Samen per jaar', value: formatEUR(total * 12, { decimals: 0 }) },
          { label: 'Mogelijke besparing (één houden)', value: formatEUR(saving) },
        ],
      },
      impact: impact
        ? { ...impact, text: `Als je er één houdt: ${formatEUR(-impact.netWorth2035DeltaCents, { decimals: 0 })} meer in 2035.` }
        : undefined,
      actions: [ACT.eenmalig('Klopt, ik gebruik ze allemaal'), ACT.snooze(), ACT.chat()],
      score: scoreOf(severity, saving),
      chatPrompt: `Moet ik een streamingdienst opzeggen?`,
    });
  }
  return out;
}

function unusualAlerts(ctx: Ctx): Alert[] {
  const out: Alert[] = [];
  const from = addDays(ctx.state.today, -14);
  const recent = spendingTransactions(ctx.state).filter((t) => t.date >= from && !t.recurring && -t.amountCents >= 15000);
  for (const t of recent) {
    const amount = -t.amountCents;
    let stats = merchantStats(ctx.state, t.merchant, t.id);
    let basis = `je vorige betalingen aan ${t.merchant}`;
    if (stats.count < 3) {
      stats = categoryTxStats(ctx.state, t.category, t.id);
      basis = `je gewone uitgaven voor ${CATEGORY_LABELS[t.category].toLowerCase()}`;
    }
    if (stats.count < 3) {
      stats = overallTxStats(ctx.state, t.id);
      basis = 'al je gewone uitgaven';
    }
    if (stats.count < 3) continue;
    const spread = Math.max(stats.sdCents, stats.meanCents * 0.25, 1000);
    const z = (amount - stats.meanCents) / spread;
    if (z < A.unusualSigma) continue;
    const severity: Severity = amount >= 100000 ? 'waarschuwing' : 'let_op';
    out.push({
      id: `unusual:${t.id}`,
      type: 'unusual_transaction',
      severity,
      title: `Ongewone uitgave bij ${t.merchant}`,
      message: `Op ${formatDateNL(t.date, { year: false })} ging er ${formatEUR(amount)} naar ${t.merchant}${t.description ? ` (${t.description})` : ''}. Dat is een stuk meer dan ${basis} (gemiddeld ${formatEUR(stats.meanCents, { decimals: 0 })}). Was dit eenmalig?`,
      category: t.category,
      merchant: t.merchant,
      transactionId: t.id,
      transactionIds: [t.id],
      amountCents: amount,
      why: {
        rule: `Bedrag ≥ ${A.unusualSigma} standaardafwijkingen boven je gemiddelde (${basis}) én ≥ € 150. Enkel niet-terugkerende betalingen van de laatste 14 dagen.`,
        lines: [
          { label: 'Bedrag', value: formatEUR(amount) },
          { label: 'Gemiddelde', value: formatEUR(stats.meanCents) },
          { label: 'Standaardafwijking', value: formatEUR(stats.sdCents) },
          { label: 'Hoogste vorige betaling', value: formatEUR(stats.maxCents) },
          { label: 'Afwijking (z-score)', value: z.toFixed(1).replace('.', ',') },
          { label: 'Aantal vergelijkbare betalingen', value: String(stats.count) },
        ],
      },
      impact: impactOfMonthlyDelta(ctx, amount, 'Eenmalig verandert er weinig. Zou dit elke maand gebeuren'),
      actions: [ACT.eenmalig(), ACT.budget(), ACT.snooze(), ACT.chat()],
      score: scoreOf(severity, amount, 60),
      chatPrompt: `Waarom waarschuw je me over ${t.merchant}?`,
    });
  }
  return out;
}

function bufferAlerts(ctx: Ctx): Alert[] {
  const o = cashflowOutlook(ctx.state);
  const month = monthKey(ctx.state.today);
  if (o.minBalanceCents >= o.bufferCents) return [];
  const negative = o.minBalanceCents < 0;
  const severity: Severity = negative ? 'dringend' : 'waarschuwing';
  const nextIncome = o.nextIncomeDate ? `je volgende inkomen op ${formatDateNL(o.nextIncomeDate, { year: false })} (${formatEUR(o.nextIncomeCents, { decimals: 0 })})` : 'de komende 35 dagen';
  const message = negative
    ? `Rond ${formatDateNL(o.minDate, { year: false })} komt je zichtrekening op ${formatEUR(o.minBalanceCents, { decimals: 0 })}, vóór ${nextIncome}. Misschien even iets overzetten van je spaarrekening?`
    : `Vóór ${nextIncome} zakt je zichtrekening naar ongeveer ${formatEUR(o.minBalanceCents, { decimals: 0 })}, onder je buffer van ${formatEUR(o.bufferCents, { decimals: 0 })}.`;
  return [
    {
      id: `buffer:${month}`,
      type: 'buffer',
      severity,
      title: negative ? 'Je saldo dreigt onder nul te gaan' : 'Je buffer wordt krap',
      message,
      amountCents: Math.abs(o.minBalanceCents),
      why: {
        rule: 'Huidig saldo min de geplande betalingen tot je volgende inkomen, min je gemiddelde dagelijkse uitgaven. Waarschuwing onder je buffer (de helft van je vaste kosten, minstens € 500), dringend onder nul.',
        lines: [
          { label: 'Saldo zichtrekening nu', value: formatEUR(o.balanceCents) },
          ...o.scheduled.map((s) => ({ label: `  ${formatDateNL(s.date, { year: false })} · ${s.merchant}`, value: formatEUR(s.amountCents) })),
          { label: 'Gemiddelde dagelijkse uitgaven', value: `${formatEUR(o.dailyBurnCents)} / dag` },
          { label: `Laagste punt (${formatDateNL(o.minDate, { year: false })})`, value: formatEUR(o.minBalanceCents) },
          { label: 'Jouw buffer', value: formatEUR(o.bufferCents, { decimals: 0 }) },
          ...(o.nextIncomeDate ? [{ label: 'Volgend inkomen', value: `${formatDateNL(o.nextIncomeDate, { year: false })} · ${formatEUR(o.nextIncomeCents)}` }] : []),
        ],
      },
      impact: {
        monthlyDeltaCents: 0,
        netWorth2035DeltaCents: 0,
        goalDelays: [],
        text: negative
          ? `Dit is een kortetermijnsignaal. Overbrug je het met ${formatEUR(Math.abs(o.minBalanceCents) + o.bufferCents, { decimals: 0 })} van je spaarrekening, dan verandert er niets aan je toekomst. Onder nul gaan kost wel debetrente en kan betalingen doen mislukken.`
          : 'Dit is een kortetermijnsignaal: het verandert niets aan je toekomst zolang je niet onder nul gaat.',
      },
      actions: [ACT.snooze(), ACT.chat()],
      score: scoreOf(severity, Math.abs(o.minBalanceCents), 200),
      chatPrompt: 'Kom ik deze maand rond?',
    },
  ];
}

function goalDriftAlerts(ctx: Ctx): Alert[] {
  const out: Alert[] = [];
  for (const g of ctx.base.goals) {
    const monthsToTarget = monthsBetween(ctx.state.today, g.targetDate);
    if (monthsToTarget <= 0) continue;
    const later = g.monthsDelta;
    const unreachable = g.achievedDate === null;
    if (!unreachable && (later === null || later < 2)) continue;
    const severity: Severity = unreachable || (later ?? 0) >= 12 ? 'waarschuwing' : 'let_op';
    const need = Math.max(0, g.targetCents - g.currentCents);
    const perMonthNeeded = Math.ceil(need / monthsToTarget);
    const surplus = ctx.base.monthlySurplusCents;
    const extraNeeded = Math.max(0, roundUp(perMonthNeeded - surplus, 1000));
    const message = unreachable
      ? `Aan je huidige spaarritme haal je '${g.name}' niet vóór je pensioen. Gepland was ${formatDateNL(g.targetDate)}.`
      : `Aan je huidige spaarritme haal je '${g.name}' ${later} maanden later dan gepland: ${formatDateNL(g.achievedDate!)} in plaats van ${formatDateNL(g.targetDate)}.`;
    out.push({
      id: `goal_drift:${g.goalId}`,
      type: 'goal_drift',
      severity,
      title: `'${g.name}' schuift op`,
      message,
      amountCents: extraNeeded,
      why: {
        rule: 'De twin rekent elke maand je inkomen, vaste kosten en je eigen normale uitgaven door en kijkt wanneer het doelbedrag bereikt wordt.',
        lines: [
          { label: 'Doelbedrag', value: formatEUR(g.targetCents, { decimals: 0 }) },
          { label: 'Nu al opzij', value: formatEUR(g.currentCents, { decimals: 0 }) },
          { label: 'Gepland', value: formatDateNL(g.targetDate) },
          { label: 'Verwacht', value: g.achievedDate ? formatDateNL(g.achievedDate) : 'niet binnen de horizon' },
          { label: 'Maandelijks overschot nu', value: formatEUR(surplus, { decimals: 0 }) },
          { label: 'Nodig per maand om op tijd te zijn', value: formatEUR(perMonthNeeded, { decimals: 0 }) },
        ],
      },
      impact: {
        monthlyDeltaCents: extraNeeded,
        netWorth2035DeltaCents: 0,
        goalDelays: [{ goalId: g.goalId, goalName: g.name, months: later ?? 999 }],
        text: extraNeeded > 0 ? `Met ${formatEUR(extraNeeded, { decimals: 0 })} per maand extra opzij haal je het wel op tijd.` : 'Een kleine bijsturing volstaat om op tijd te zijn.',
      },
      actions: [ACT.chat(), ACT.snooze()],
      score: scoreOf(severity, extraNeeded, 20),
      chatPrompt: g.type === 'huis' ? `Kan ik in ${g.targetDate.slice(0, 4)} een huis kopen?` : `Haal ik '${g.name}' nog op tijd?`,
    });
  }
  return out;
}

export interface AlertEvaluation {
  /** All alerts the rules produced, before attention rules. */
  candidates: Alert[];
  /** What the customer sees (max ~3, ranked). */
  active: Alert[];
  /** Also valid, but held back to respect attention. */
  more: Alert[];
  /** Hidden because resolved or snoozed. */
  suppressed: Alert[];
}

/** Run every rule. Pure: same state in, same alerts out. */
export function detectAlerts(state: CustomerState): Alert[] {
  const input = buildProjectionInput(state);
  const base = project(input);
  const stats = allCategoryStats(state);
  const ctx: Ctx = { state, input, base, stats };
  const subs = detectSubscriptions(state);
  const all = [
    ...bufferAlerts(ctx),
    ...overspendAlerts(ctx, subs),
    ...budgetAlerts(ctx, subs),
    ...subscriptionAlerts(ctx, subs),
    ...unusualAlerts(ctx),
    ...goalDriftAlerts(ctx),
  ];
  // Dedupe: an unusual transaction that is also the top merchant of an overspend keeps both (different questions),
  // but identical ids never appear twice.
  const seen = new Set<string>();
  return all.filter((a) => (seen.has(a.id) ? false : (seen.add(a.id), true))).sort((a, b) => b.score - a.score);
}

/** Apply the attention rules: dedupe, resolved/snoozed, cool-down, max active. */
export function selectAlerts(candidates: Alert[], memory: AlertMemory, today: ISODate): Omit<AlertEvaluation, 'candidates'> {
  const suppressed: Alert[] = [];
  const visible: Alert[] = [];
  for (const a of candidates) {
    if (memory.resolved[a.id]) {
      suppressed.push(a);
      continue;
    }
    const until = memory.snoozedUntil[a.id];
    if (until && until >= today) {
      suppressed.push(a);
      continue;
    }
    visible.push(a);
  }
  // Relevance = severity + money at stake + recency: a signal that appeared today deserves a slot.
  const rank = (a: Alert) => a.score + (!memory.firstSeen[a.id] || memory.firstSeen[a.id] === today ? 800 : 0);
  visible.sort((a, b) => rank(b) - rank(a));
  return { active: visible.slice(0, A.maxActiveAlerts), more: visible.slice(A.maxActiveAlerts), suppressed };
}

export function evaluateAlerts(state: CustomerState): AlertEvaluation {
  const candidates = detectAlerts(state);
  return { candidates, ...selectAlerts(candidates, state.alertMemory, state.today) };
}

export function resolveAlert(memory: AlertMemory, id: string, today: ISODate): AlertMemory {
  return { ...memory, resolved: { ...memory.resolved, [id]: today } };
}

export function snoozeAlert(memory: AlertMemory, id: string, today: ISODate): AlertMemory {
  return { ...memory, snoozedUntil: { ...memory.snoozedUntil, [id]: addDays(today, A.snoozeDays) } };
}

export interface NotificationPlan {
  alert: Alert;
  /** When to deliver; null = now. */
  deliverAt: Date | null;
  reason: string;
}

/**
 * Decide whether a push notification is appropriate. The bank knows when *not* to disturb:
 * only new alerts of at least "waarschuwing", at most one per day, never between 21:00 and 08:00.
 */
export function planNotification(active: Alert[], memory: AlertMemory, now: Date, todayISO: ISODate): NotificationPlan | null {
  if (memory.lastNotificationDate === todayISO) return null;
  const fresh = active.filter((a) => SEVERITY_RANK[a.severity] >= SEVERITY_RANK.waarschuwing && !memory.firstSeen[a.id]);
  if (fresh.length === 0) return null;
  const alert = fresh.sort((a, b) => b.score - a.score)[0];
  const hour = now.getHours();
  const quiet = hour >= A.quietHours || hour < 8;
  if (!quiet) return { alert, deliverAt: null, reason: 'Nieuw signaal met hoge prioriteit.' };
  const deliverAt = new Date(now);
  if (hour >= A.quietHours) deliverAt.setDate(deliverAt.getDate() + 1);
  deliverAt.setHours(8, 0, 0, 0);
  return { alert, deliverAt, reason: 'Stille uren: melding uitgesteld tot 08:00.' };
}

export function daysSince(date: ISODate, today: ISODate): number {
  return diffDays(today, date);
}
