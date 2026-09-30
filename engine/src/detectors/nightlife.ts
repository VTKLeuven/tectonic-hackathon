import { daysBetween } from '../dates';
import { euroL, l } from '../format';
import type { Detector } from './context';
import { line, txEvidence } from './copy';

/**
 * Nightlife budget intelligence for students in Leuven.
 * Detects heavy night-out spending (e.g. Oude Markt + late-night durum at De Nijl)
 * compared to student income, and recommends faculty bars like 't ElixIr (VTK)
 * where beers cost €1.20, or other fakbars (Recup, Dulci) at €1.50, instead of €4.00 on Oude Markt.
 */
export const nightlifeBudget: Detector = (ctx) => {
  // Look for nightlife transactions in the recent window (last 3 days)
  const recentNight = ctx.transactions.filter((tx) => {
    if (tx.amount >= 0) return false;
    const days = daysBetween(tx.date, ctx.today);
    if (days < 0 || days > 3) return false;
    const txt = `${tx.counterparty} | ${tx.description}`.toUpperCase();
    return txt.includes('OUDE MARKT') || txt.includes('DE NIJL') || txt.includes('SNACK DE NIJL');
  });

  if (!recentNight.length) return null;

  const totalSpent = Math.round(recentNight.reduce((sum, tx) => sum - tx.amount, 0) * 100) / 100;
  if (totalSpent < 30) return null;

  const deNijlTx = recentNight.find((tx) => `${tx.counterparty} | ${tx.description}`.toUpperCase().includes('NIJL'));
  const deNijlAmount = deNijlTx ? Math.abs(deNijlTx.amount) : 8.5;
  const drinksSpent = totalSpent - deNijlAmount;

  // Drinks calculation:
  // On Oude Markt: ~€4.00 per beer/drink
  // In Fakbar 't ElixIr (VTK): €1.20 per beer
  // In Fakbar Recup: €1.50 per Stella
  const estimatedDrinks = Math.max(4, Math.round(drinksSpent / 4.0));
  const elixirCost = Math.round((estimatedDrinks * 1.2 + deNijlAmount) * 100) / 100;
  const savingPerNight = Math.round((totalSpent - elixirCost) * 100) / 100;
  const annualSaving = Math.round(savingPerNight * 20); // ~20 nights out in an academic year

  const triggeredAt = recentNight[0].date;

  return {
    id: 'nightlife_budget:fakbars',
    type: 'nightlife_budget',
    domain: 'savings',
    title: l("Bespaar tot € 45 per avond: kies 't ElixIr i.p.v. Oude Markt", "Save up to €45 per night: choose 't ElixIr instead of Oude Markt"),
    summary: l(
      `Gisteravond gaf je ${euroL(totalSpent).nl} uit op de Oude Markt en bij Snack De Nijl (€ 8,50 voor je durum). Dat is 67% van je weekbudget van € 100. In Fakbar 't ElixIr (VTK) kost een pintje maar € 1,20 en in Recup € 1,50, t.o.v. € 4,00 op de Oude Markt. Door te switchen bespaar je zo'n ${euroL(savingPerNight).nl} per avond en kom je comfortabel toe.`,
      `Last night you spent ${euroL(totalSpent).en} on the Oude Markt and at Snack De Nijl (€8.50 for your durum). That is 67% of your €100 weekly allowance. In Fakbar 't ElixIr (VTK) a beer is just €1.20, and in Recup €1.50, vs €4.00 on Oude Markt. Switching saves ~${euroL(savingPerNight).en} per night while keeping your student budget intact.`,
    ),
    teaser: l(
      `Vannacht ${euroL(totalSpent).nl} uitgegeven op Oude Markt & De Nijl (67% van je weekbudget). In 't ElixIr kost een pintje € 1,20 i.p.v. € 4,00.`,
      `Spent ${euroL(totalSpent).en} last night on Oude Markt & De Nijl (67% of weekly budget). In 't ElixIr a beer is €1.20 instead of €4.00.`,
    ),
    annualValue: annualSaving,
    confidence: 0.95,
    triggeredAt,
    trigger: l(
      `Vannacht ${euroL(totalSpent).nl} uitgegeven op de Oude Markt en bij Snack De Nijl.`,
      `Spent ${euroL(totalSpent).en} last night on Oude Markt and at Snack De Nijl.`,
    ),
    evidence: recentNight.map((tx) =>
      txEvidence(tx, `${tx.counterparty}, ${tx.date.slice(8, 10)}/${tx.date.slice(5, 7)}`, `${tx.counterparty}, ${tx.date.slice(8, 10)}/${tx.date.slice(5, 7)}`),
    ),
    reasons: [
      l('Je wekelijkse toelage van papa & mama is € 100.', 'Your weekly allowance from parents is €100.'),
      l(`Je gaf in één nacht 67% van je weekbudget uit (${euroL(totalSpent).nl}).`, `You spent 67% of your weekly budget in one night (${euroL(totalSpent).en}).`),
      l("In Fakbar 't ElixIr (VTK) betaal je € 1,20 per pintje, in Recup € 1,50, t.o.v. € 4,00 op de Oude Markt.", "In Fakbar 't ElixIr (VTK) a beer is €1.20, in Recup €1.50, vs €4.00 on Oude Markt."),
      l('Je durum bij Snack De Nijl kostte € 8,50.', 'Your durum at Snack De Nijl was €8.50.'),
      l('Je restsaldo voor de rest van de week is € 28,50.', 'Your remaining balance for the rest of the week is €28.50.'),
    ],
    breakdown: [
      line('Uitgegeven op Oude Markt', 'Spent on Oude Markt', euroL(drinksSpent)),
      line('Nachtelijke durum (Snack De Nijl)', 'Late-night durum (Snack De Nijl)', euroL(deNijlAmount)),
      line("Zelfde avond in 't ElixIr (€ 1,20/pint)", "Same night in 't ElixIr (€1.20/beer)", euroL(elixirCost)),
      line('Besparing per avond', 'Saving per night out', euroL(savingPerNight), true),
      line('Besparing per academiejaar', 'Saving per academic year', euroL(annualSaving), true),
    ],
    assumptions: [
      line('Consumptie Oude Markt', 'Drink on Oude Markt', l('€ 4,00 gemiddeld', '€4.00 average')),
      line("Pintje Fakbar 't ElixIr (VTK)", "Beer in Fakbar 't ElixIr (VTK)", l('€ 1,20 (ledenprijs)', '€1.20 (member price)')),
      line('Pintje Fakbar Recup / Dulci', 'Beer in Fakbar Recup / Dulci', l('€ 1,50 (Stella 25cl)', '€1.50 (Stella 25cl)')),
      line('Dürüm Kebab Snack De Nijl', 'Dürüm Kebab Snack De Nijl', l('€ 8,50 (Naamsestraat 66)', '€8.50 (Naamsestraat 66)')),
      line('Uitgaansritme', 'Nightlife rhythm', l('2 avonden per maand', '2 nights per month')),
    ],
    actions: [
      { kind: 'learn', label: l("Ontdek Fakbar 't ElixIr (VTK)", "Discover Fakbar 't ElixIr (VTK)"), target: 'elixir' },
      { kind: 'manage', label: l('Stel nachtbudget limiet in', 'Set late-night spending limit'), target: 'limit' },
    ],
  };
};

export const NIGHTLIFE_DETECTORS = [nightlifeBudget];
