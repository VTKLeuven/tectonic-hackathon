/**
 * Offline fallback: answers the common questions with fixed Dutch templates on top of the same engine.
 * Used when the backend is unreachable or has no API key. Clearly labelled "offline modus" by the app.
 */
import type { ChatMessage, ChatReply, ScenarioCard } from './chat-types';
import { formatDateNL } from './dates';
import { formatEUR } from './money';
import type { Snapshot } from './snapshot';
import { simulate, type SimulateArgs } from './tools';
import { CATEGORY_LABELS, type Category } from './types';
import { A } from './assumptions';

const OFFLINE_NOTE = '\n\n(offline modus: dit antwoord komt uit vaste regels op dezelfde rekenmotor, zonder AI)';

function lastUser(messages: ChatMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) if (messages[i].role === 'user') return messages[i].content;
  return '';
}

function firstNumber(text: string): number | null {
  const m = text.replace(/\./g, '').match(/(\d+(?:,\d+)?)\s*(k|000)?/i);
  if (!m) return null;
  let n = Number(m[1].replace(',', '.'));
  if (m[2]?.toLowerCase() === 'k') n *= 1000;
  return Number.isFinite(n) ? n : null;
}

function yearIn(text: string): number | null {
  const m = text.match(/\b(20[2-6]\d)\b/);
  return m ? Number(m[1]) : null;
}

function simResult(snapshot: Snapshot, args: SimulateArgs) {
  const out = simulate(snapshot, args);
  const r = out.result as {
    scenario: string;
    baseline: { netWorth2035Eur: number; monthlySurplusEur: number };
    withScenario: { netWorth2035Eur: number; monthlySurplusEur: number; monthlyIncomeEur: number };
    difference: { netWorth2035Eur: number; monthlySurplusEur: number };
    goals: { name: string; baselineDate: string; scenarioDate: string; monthsLater: number | null }[];
    feasibility: { ok: boolean; reasons: string[]; loanEur: number; ownContributionEur: number; monthlyPaymentEur: number; paymentToIncomePct: number } | null;
    keyAssumptions: string[];
  };
  return { r, card: out.scenarioCard as ScenarioCard };
}

const e = (n: number) => formatEUR(Math.round(n * 100), { decimals: 0 });

function goalLines(r: ReturnType<typeof simResult>['r']): string {
  return r.goals
    .map((g) => {
      if (g.monthsLater === null) return `• ${g.name}: ${g.scenarioDate}`;
      if (g.monthsLater === 0) return `• ${g.name}: nog altijd ${g.scenarioDate}`;
      return `• ${g.name}: ${g.scenarioDate} (${Math.abs(g.monthsLater)} maanden ${g.monthsLater > 0 ? 'later' : 'vroeger'})`;
    })
    .join('\n');
}

export function offlineReply(snapshot: Snapshot, messages: ChatMessage[], alertContext?: string): ChatReply {
  const q = lastUser(messages).toLowerCase();
  const me = snapshot.futureSelfName;
  const name = snapshot.firstName;
  const tools: string[] = [];

  // What-if: work regime
  if (/4\s*\/\s*5|vier\s*vijfde|viervijfde|4-5/.test(q) || /halftijds|half-time/.test(q)) {
    const regime = /halftijds|half-time/.test(q) ? 'halftijds' : '4/5';
    const { r, card } = simResult(snapshot, { workRegime: regime });
    tools.push('simulate_scenario');
    const diff = r.difference.netWorth2035Eur;
    const dir = r.withScenario.monthlySurplusEur < r.baseline.monthlySurplusEur ? 'zakt' : 'stijgt';
    const reply =
      `Hier ${me}. Als je ${regime} gaat werken, hou je ${e(r.withScenario.monthlyIncomeEur)} netto per maand over en ${dir} je maandelijks overschot van ${e(r.baseline.monthlySurplusEur)} naar ${e(r.withScenario.monthlySurplusEur)}.\n\n` +
      `In 2035 heb je dan ${e(r.withScenario.netWorth2035Eur)} in plaats van ${e(r.baseline.netWorth2035Eur)}: ${e(Math.abs(diff))} ${diff < 0 ? 'minder' : 'meer'}.\n${goalLines(r)}\n\n` +
      `Belangrijkste aanname: ${r.keyAssumptions[0]}. Meer tijd voor jezelf is ook iets waard, dat reken ik niet uit.`;
    return { reply: reply + OFFLINE_NOTE, mode: 'offline', scenario: card, toolsUsed: tools };
  }

  // What-if: buying a home
  if (/huis|woning|appartement|kopen/.test(q)) {
    const goalYear = snapshot.goals.find((g) => g.name.toLowerCase().includes('huis'))?.targetDate.slice(0, 4);
    const year = yearIn(q) ?? (goalYear ? Number(goalYear) : Number(snapshot.today.slice(0, 4)) + 3);
    const priceRaw = firstNumber(q.replace(/\b20[2-6]\d\b/, ''));
    const price = priceRaw && priceRaw >= 50000 ? priceRaw : 280000;
    const { r, card } = simResult(snapshot, { homePurchase: { priceEuros: price, year } });
    tools.push('simulate_scenario');
    const f = r.feasibility;
    let reply = `Hier ${me}. Ik liet de twin een woning van ${e(price)} in ${year} doorrekenen.\n\n`;
    if (f) {
      reply += f.ok
        ? `Goed nieuws: dat past. Je brengt ${e(f.ownContributionEur)} zelf in, leent ${e(f.loanEur)} en betaalt ${e(f.monthlyPaymentEur)} per maand af (${f.paymentToIncomePct} % van je inkomen).\n\n`
        : `Eerlijk: zoals het nu loopt, wringt dat. ${f.reasons.join(' ')} Je zou ${e(f.ownContributionEur)} zelf inbrengen en ${e(f.loanEur)} lenen, aan ${e(f.monthlyPaymentEur)} per maand.\n\n`;
    }
    reply += `Vermogen in 2035: ${e(r.withScenario.netWorth2035Eur)} met het huis, ${e(r.baseline.netWorth2035Eur)} zonder.\n${goalLines(r)}\n\n`;
    reply += `Belangrijkste aannames: ${r.keyAssumptions.slice(0, 2).join('; ')}. Voor de echte stap: praat met een KBC-adviseur.`;
    return { reply: reply + OFFLINE_NOTE, mode: 'offline', scenario: card, toolsUsed: tools };
  }

  // A question about one of the goals by name
  const goalHit = snapshot.goals.find((g) => g.name.toLowerCase().split(' ').some((w) => w.length > 5 && q.includes(w)));
  if (goalHit && !/wat als/.test(q)) {
    tools.push('get_financial_snapshot');
    const status = goalHit.expectedDate
      ? ` Aan je huidige ritme haal je het rond ${formatDateNL(goalHit.expectedDate)}, ${goalHit.monthsDelta && goalHit.monthsDelta > 0 ? `${goalHit.monthsDelta} maanden later dan gepland` : goalHit.monthsDelta && goalHit.monthsDelta < 0 ? `${-goalHit.monthsDelta} maanden vroeger dan gepland` : 'precies op schema'} (gepland: ${formatDateNL(goalHit.targetDate)}).`
      : ` Aan je huidige ritme haal je het niet vóór je pensioen; gepland was ${formatDateNL(goalHit.targetDate)}.`;
    const reply =
      `Hier ${me}. Voor '${goalHit.name}' heb je ${formatEUR(goalHit.currentCents, { decimals: 0 })} van de ${formatEUR(goalHit.targetCents, { decimals: 0 })} bij elkaar.` +
      status +
      `\n\nAanname: rendement beleggingen ${Math.round(A.investmentReturn * 100)} % per jaar (geen garantie) en inflatie ${Math.round(A.inflation * 100)} %.`;
    return { reply: reply + OFFLINE_NOTE, mode: 'offline', toolsUsed: tools };
  }

  // What-if: child
  if (/\b(kind|kindje|baby|kinderwens)\b/.test(q)) {
    const year = yearIn(q) ?? Number(snapshot.today.slice(0, 4)) + 1;
    const { r, card } = simResult(snapshot, { child: { year } });
    tools.push('simulate_scenario');
    const reply =
      `Hier ${me}. Een kindje in ${year} kost netto zo'n ${formatEUR(A.childCostMonthlyCents - A.groeipakketMonthlyCents, { decimals: 0 })} per maand (na Groeipakket). Je overschot zakt van ${e(r.baseline.monthlySurplusEur)} naar ${e(r.withScenario.monthlySurplusEur)} per maand.\n\n` +
      `In 2035: ${e(r.withScenario.netWorth2035Eur)} in plaats van ${e(r.baseline.netWorth2035Eur)}.\n${goalLines(r)}\n\nAanname: ${r.keyAssumptions[0]}.`;
    return { reply: reply + OFFLINE_NOTE, mode: 'offline', scenario: card, toolsUsed: tools };
  }

  // What-if: car
  if (/\bauto\b|wagen/.test(q) && !/waarom/.test(q)) {
    const year = yearIn(q) ?? Number(snapshot.today.slice(0, 4)) + 1;
    const priceRaw = firstNumber(q.replace(/\b20[2-6]\d\b/, ''));
    const price = priceRaw && priceRaw >= 1000 ? priceRaw : 12000;
    const { r, card } = simResult(snapshot, { car: { priceEuros: price, year } });
    tools.push('simulate_scenario');
    const reply =
      `Hier ${me}. Een auto van ${e(price)} in ${year} plus ${formatEUR(A.carMonthlyCostCents, { decimals: 0 })} per maand aan kosten: je vermogen in 2035 wordt ${e(r.withScenario.netWorth2035Eur)} in plaats van ${e(r.baseline.netWorth2035Eur)}.\n${goalLines(r)}\n\nAanname: ${r.keyAssumptions[0]}.`;
    return { reply: reply + OFFLINE_NOTE, mode: 'offline', scenario: card, toolsUsed: tools };
  }

  // What-if: extra saving / spending less
  if (/extra|meer spa|minder|opzij|bespaar/.test(q)) {
    const n = firstNumber(q) ?? 100;
    const amount = /minder|bespaar/.test(q) || n > 0 ? Math.abs(n) : n;
    const { r, card } = simResult(snapshot, { extraMonthlySavingEuros: amount });
    tools.push('simulate_scenario');
    const reply =
      `Hier ${me}. ${e(amount)} per maand extra opzij lijkt klein, maar in 2035 maakt het ${e(r.difference.netWorth2035Eur)} verschil: ${e(r.withScenario.netWorth2035Eur)} in plaats van ${e(r.baseline.netWorth2035Eur)}.\n${goalLines(r)}\n\nAanname: ${r.keyAssumptions[0]}.`;
    return { reply: reply + OFFLINE_NOTE, mode: 'offline', scenario: card, toolsUsed: tools };
  }

  // Retirement
  if (/pensioen|stoppen met werken|\b63\b|\b67\b/.test(q)) {
    tools.push('get_financial_snapshot');
    const goal = snapshot.goals.find((g) => g.name.toLowerCase().includes('pensioen'));
    let reply = `Hier ${me}. Volgens je huidige koers heb je op ${formatDateNL(snapshot.baseline.retirementDate)} een vermogen van ${formatEUR(snapshot.baseline.netWorthRetirementCents, { decimals: 0 })} (woning inbegrepen).`;
    if (goal) {
      reply += goal.expectedDate
        ? ` Je pensioendoel van ${formatEUR(goal.targetCents, { decimals: 0 })} haal je rond ${formatDateNL(goal.expectedDate)}${goal.monthsDelta && goal.monthsDelta > 0 ? `, ${goal.monthsDelta} maanden later dan gepland` : goal.monthsDelta && goal.monthsDelta < 0 ? `, ${-goal.monthsDelta} maanden vroeger dan gepland` : ', precies op schema'}.`
        : ` Je pensioendoel van ${formatEUR(goal.targetCents, { decimals: 0 })} haal je aan dit ritme niet vóór je pensioen.`;
    }
    reply += `\n\nAannames: rendement beleggingen ${Math.round(A.investmentReturn * 100)} % per jaar (geen garantie) en pensioen ${Math.round(A.pensionReplacement * 100)} % van je laatste nettoloon. Voor je echte pensioenplanning: een KBC-adviseur kan dat fijner uitwerken.`;
    return { reply: reply + OFFLINE_NOTE, mode: 'offline', toolsUsed: tools };
  }

  // Alerts / why
  const alertHit =
    snapshot.alerts.find((a) => a.merchant && q.includes(a.merchant.toLowerCase())) ??
    snapshot.alerts.find((a) => a.category && q.includes(CATEGORY_LABELS[a.category].toLowerCase())) ??
    snapshot.alerts.find((a) => alertContext && alertContext.includes(a.title)) ??
    (/waarom|waarschuw|signaal|alert|probleem/.test(q) ? snapshot.alerts[0] : undefined);
  if (alertHit) {
    tools.push('get_alerts');
    const reply =
      `Hier ${me}. Over "${alertHit.title}":\n\n${alertHit.message}\n\nDe cijfers erachter:\n${alertHit.why.slice(0, 6).map((l) => `• ${l}`).join('\n')}` +
      (alertHit.impact ? `\n\n${alertHit.impact}` : '') +
      `\n\nGeen verwijt, ${name}: ik zeg het alleen omdat ik weet waar het naartoe kan gaan.`;
    return { reply: reply + OFFLINE_NOTE, mode: 'offline', toolsUsed: tools };
  }

  // Cashflow
  if (/rond|kom ik|saldo|deze maand|genoeg/.test(q)) {
    tools.push('get_financial_snapshot');
    const c = snapshot.cashflow;
    const reply =
      `Hier ${me}. Op je zichtrekening staat nu ${formatEUR(snapshot.balances.zichtCents, { decimals: 0 })}. Tot ${c.nextIncomeDate ? `je volgende inkomen op ${formatDateNL(c.nextIncomeDate)}` : 'over vijf weken'} zakt dat naar ongeveer ${formatEUR(c.minBalanceCents, { decimals: 0 })} (laagste punt rond ${formatDateNL(c.minDate)}).` +
      (c.minBalanceCents < 0 ? ` Dat is onder nul, dus even iets van je spaarrekening overzetten is verstandig.` : c.minBalanceCents < c.bufferCents ? ` Krap, maar het lukt als je de komende dagen rustig aan doet.` : ` Dat is comfortabel boven je buffer van ${formatEUR(c.bufferCents, { decimals: 0 })}.`);
    return { reply: reply + OFFLINE_NOTE, mode: 'offline', toolsUsed: tools };
  }

  // Default: overview
  tools.push('get_financial_snapshot');
  const g = snapshot.goals[0];
  const reply =
    `Hier ${me}. Even de stand van zaken: je houdt nu ${formatEUR(snapshot.baseline.monthlySurplusCents, { decimals: 0 })} per maand over, je hebt ${formatEUR(snapshot.balances.liquidCents, { decimals: 0 })} spaargeld` +
    (snapshot.balances.investmentsCents > 0 ? ` en ${formatEUR(snapshot.balances.investmentsCents, { decimals: 0 })} beleggingen` : '') +
    `. Op deze koers zit je in 2035 aan ${formatEUR(snapshot.baseline.netWorth2035Cents, { decimals: 0 })} vermogen.` +
    (g ? ` Je doel '${g.name}' (${formatEUR(g.targetCents, { decimals: 0 })}) ${g.expectedDate ? `haal je rond ${formatDateNL(g.expectedDate)}` : 'is nog niet in zicht'}.` : '') +
    `\n\nJe kan me bijvoorbeeld vragen: ${snapshot.suggestedQuestions.slice(0, 2).map((s) => `"${s}"`).join(' of ')}.`;
  return { reply: reply + OFFLINE_NOTE, mode: 'offline', toolsUsed: tools };
}

export type { Category };
