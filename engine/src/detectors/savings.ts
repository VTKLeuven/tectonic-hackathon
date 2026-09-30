import { ASSUMPTIONS as A, roundTo } from '../assumptions';
import { daysBetween, monthIndex } from '../dates';
import { euroL, l } from '../format';
import type { Detector } from './context';
import { line, pct, perYear, txEvidence } from './copy';

/**
 * Money that could work harder. These show that the engine is general: the
 * same signals-to-moments pipeline works well beyond energy.
 */

export const pensionSaving: Detector = (ctx) => {
  if (ctx.signal('pension_saving')) {
    return { type: 'pension_saving', reason: l('Spaart al voor pensioen.', 'Already saves for retirement.') };
  }
  const salary = ctx.signal('salary');
  if (!salary || ctx.profile.age < 18 || ctx.profile.age >= 65) return null;

  const benefit = A.pension.maxDeposit * A.pension.taxRate;
  const year = ctx.today.slice(0, 4);
  const tx = ctx.tx(salary.evidence[0]);

  return {
    id: `pension_saving:${year}`,
    type: 'pension_saving',
    domain: 'savings',
    title: l(`Nog ${euroL(benefit).nl} belastingvoordeel dit jaar`, `${euroL(benefit).en} tax benefit left this year`),
    summary: l(
      `Je spaart nog niet voor je pensioen. Wie vóór 31 december tot ${euroL(A.pension.maxDeposit).nl} stort, krijgt ${Math.round(A.pension.taxRate * 100)}% terug via de belastingen.`,
      `You are not saving for retirement yet. Deposit up to ${euroL(A.pension.maxDeposit).en} before 31 December and get ${Math.round(A.pension.taxRate * 100)}% back through your taxes.`,
    ),
    teaser: l(`Pensioensparen levert je ${euroL(benefit).nl} belastingvoordeel op.`, `Pension saving gets you ${euroL(benefit).en} back in tax.`),
    annualValue: benefit,
    confidence: 0.85,
    // The calendar is the trigger: the deadline makes autumn the moment.
    triggeredAt: `${year}-09-01`,
    trigger: l('Het jaar loopt op zijn einde; stortingen tellen tot 31 december.', 'The year is ending; deposits count until 31 December.'),
    evidence: tx ? [txEvidence(tx, `Loon, ${tx.date.slice(8, 10)}/${tx.date.slice(5, 7)}`, `Salary, ${tx.date.slice(8, 10)}/${tx.date.slice(5, 7)}`)] : [],
    reasons: [
      l('Je hebt een vast inkomen.', 'You have a regular income.'),
      l('We zien het voorbije jaar geen stortingen voor pensioensparen.', 'We see no pension savings deposits in the past year.'),
      l(`Je bent ${ctx.profile.age}: elk jaar dat je start telt.`, `You are ${ctx.profile.age}: every year you start counts.`),
    ],
    breakdown: [
      line('Maximale storting', 'Maximum deposit', euroL(A.pension.maxDeposit)),
      line('Belastingvermindering', 'Tax reduction', pct(A.pension.taxRate)),
      line('Voordeel', 'Benefit', perYear(benefit), true),
    ],
    assumptions: [line('Regeling', 'Scheme', l('Fiscaal pensioensparen, indicatief bedrag', 'Tax-deductible pension saving, indicative amount'))],
    actions: [{ kind: 'product', label: l('Start met pensioensparen', 'Start pension saving'), target: 'pension' }],
  };
};

export const idleCash: Detector = (ctx) => {
  const window = ctx.balances.filter((b) => daysBetween(b.date, ctx.today) <= 90);
  if (window.length < 60) return null;
  const minBalance = Math.min(...window.map((b) => b.balance));
  const outflow = ctx.transactions
    .filter((tx) => tx.amount < 0 && daysBetween(tx.date, ctx.today) <= 90 && tx.category !== 'savings')
    .reduce((s, tx) => s - tx.amount, 0);
  const monthlyOut = outflow / 3;
  const buffer = roundTo(monthlyOut * A.savings.bufferMonths, 500);
  const idle = roundTo(minBalance - buffer, 500);
  if (idle < 3_000) return null;
  const value = roundTo(idle * A.savings.savingsRate, 5);

  return {
    id: 'idle_cash',
    type: 'idle_cash',
    domain: 'savings',
    title: l(`${euroL(idle).nl} staat stil op je zichtrekening`, `${euroL(idle).en} sits idle on your current account`),
    summary: l(
      `Je saldo zakte de voorbije drie maanden nooit onder ${euroL(minBalance).nl}. Hou ${euroL(buffer).nl} achter de hand en zet de rest op je spaarrekening: dat levert zo'n ${euroL(value).nl} per jaar op.`,
      `Your balance never dropped below ${euroL(minBalance).en} in the past three months. Keep ${euroL(buffer).en} at hand and move the rest to savings: that earns about ${euroL(value).en} a year.`,
    ),
    teaser: l(`${euroL(idle).nl} kan voor je werken in plaats van stil te staan.`, `${euroL(idle).en} could work for you instead of sitting still.`),
    annualValue: value,
    confidence: 0.9,
    triggeredAt: window[0].date,
    trigger: l('Je saldo is al drie maanden hoger dan je uitgaven vragen.', 'Your balance has exceeded what you spend for three months.'),
    evidence: [],
    reasons: [
      l(`Laagste saldo in 90 dagen: ${euroL(minBalance).nl}.`, `Lowest balance in 90 days: ${euroL(minBalance).en}.`),
      l(`Je geeft gemiddeld ${euroL(monthlyOut).nl} per maand uit.`, `You spend ${euroL(monthlyOut).en} a month on average.`),
    ],
    breakdown: [
      line('Laagste saldo', 'Lowest balance', euroL(minBalance)),
      line(`Buffer (${A.savings.bufferMonths} maanden)`, `Buffer (${A.savings.bufferMonths} months)`, euroL(buffer)),
      line('Kan sparen', 'Can be saved', euroL(idle)),
      line('Rente', 'Interest', perYear(value), true),
    ],
    assumptions: [line('Spaarrente', 'Savings rate', pct(A.savings.savingsRate))],
    actions: [{ kind: 'product', label: l('Zet over naar je spaarrekening', 'Move to your savings account'), target: 'savings' }],
  };
};

export const SAVINGS_DETECTORS = [pensionSaving, idleCash];

/** Autumn is the moment for pension saving; the deadline is 31 December. */
export function pensionSeason(today: string): number {
  const m = monthIndex(today);
  if (m >= 9 && m <= 10) return 1;
  if (m === 11) return 0.85;
  if (m === 8) return 0.75;
  return 0.3;
}
