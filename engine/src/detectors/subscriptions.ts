import { ASSUMPTIONS as A, roundTo } from '../assumptions';
import { daysBetween } from '../dates';
import { euroL, formatDateL, formatMoney, l } from '../format';
import type { Insight, RecurringStream, Suppressed } from '../types';
import type { Detector } from './context';
import { line, list, perYear, txEvidence } from './copy';

/**
 * Fixed costs that crept up. None of this needs a list of the customer's
 * subscriptions: the recurring-payment detector already found them.
 */

const SUBSCRIPTION_CATEGORIES = ['streaming', 'music', 'cloud', 'gym', 'telecom'];
/** A price rise below this (EUR per year) is not worth an interruption. */
const MIN_PRICE_RISE = 24;
const perMonth = (v: number) => ({ nl: `${formatMoney(v, 'nl')} per maand`, en: `${formatMoney(v, 'en')} a month` });

function videoStreams(streams: RecurringStream[]) {
  return streams.filter((s) => s.category === 'streaming' && s.active && s.cadence === 'monthly');
}

export const streamingRotation: Detector = (ctx) => {
  if (!ctx.signal('streaming_stack')) return null;
  const video = videoStreams(ctx.streams).sort((a, b) => b.lastAmount - a.lastAmount);
  const rotatable = video.filter((s) => (A.streaming.rotatable as readonly string[]).includes(s.key));
  if (rotatable.length < 3) return null;

  const monthly = rotatable.reduce((sum, s) => sum + s.lastAmount, 0);
  const keep = rotatable[0];
  const saving = roundTo((monthly - keep.lastAmount) * 12, 10);
  const names = rotatable.map((s) => s.name);

  // If one of them just got more expensive, that is the moment and the hook.
  const bump = rotatable
    .filter((s) => s.priceChange && s.priceChange.to > s.priceChange.from && daysBetween(s.priceChange.date, ctx.today) <= 60)
    .sort((a, b) => (a.priceChange!.date < b.priceChange!.date ? 1 : -1))[0];
  // Without a price rise, the moment is when the stack formed: the day the latest service joined.
  const formed = rotatable.map((s) => s.firstDate).sort().slice(-1)[0];
  const triggeredAt = bump?.priceChange?.date ?? formed;

  return {
    id: `streaming_rotation:${names.length}`,
    type: 'streaming_rotation',
    domain: 'subscriptions',
    title: bump
      ? l(`${bump.name} werd duurder. Kijk je alles nog?`, `${bump.name} got pricier. Still watching everything?`)
      : l(`${names.length} streamingdiensten tegelijk`, `${names.length} streaming services at once`),
    summary: l(
      `Je betaalt voor ${list(names).nl}: samen ${euroL(monthly * 12).nl} per jaar. Wie er één tegelijk houdt en per maand wisselt, mist niets en betaalt tot ${euroL(saving).nl} minder.`,
      `You pay for ${list(names).en}: ${euroL(monthly * 12).en} a year together. Keeping one at a time and switching monthly, you miss nothing and pay up to ${euroL(saving).en} less.`,
    ),
    teaser: l(`Heb je ${names.length} streamingdiensten tegelijk nodig? Tot ${euroL(saving).nl} per jaar minder.`, `Need ${names.length} streaming services at once? Up to ${euroL(saving).en} a year less.`),
    annualValue: saving,
    confidence: 0.9,
    triggeredAt,
    trigger: bump
      ? l(
          `${bump.name} ging op ${formatDateL(bump.priceChange!.date).nl} van ${formatMoney(bump.priceChange!.from, 'nl')} naar ${formatMoney(bump.priceChange!.to, 'nl')}.`,
          `${bump.name} went from ${formatMoney(bump.priceChange!.from, 'en')} to ${formatMoney(bump.priceChange!.to, 'en')} on ${formatDateL(bump.priceChange!.date).en}.`,
        )
      : l('Je betaalt al maanden voor meerdere diensten tegelijk.', 'You have been paying for several services at once for months.'),
    evidence: rotatable
      .map((s) => ctx.tx(s.transactionIds[s.transactionIds.length - 1]))
      .filter((tx) => tx !== undefined)
      .map((tx) => txEvidence(tx)),
    reasons: [
      l(`We zien elke maand betalingen aan ${list(names).nl}.`, `We see monthly payments to ${list(names).en}.`),
      ...(bump ? [l(`${bump.name} verhoogde net zijn prijs.`, `${bump.name} just raised its price.`)] : []),
      l('Opzeggen kan maandelijks; je account en kijkgeschiedenis blijven bewaard.', 'You can cancel monthly; your account and history are kept.'),
    ],
    breakdown: [
      ...rotatable.map((s) => ({ label: l(s.name, s.name), value: perMonth(s.lastAmount) })),
      line('Samen', 'Together', perYear(monthly * 12)),
      line(`Enkel ${keep.name} tegelijk`, `Only ${keep.name} at a time`, perYear(keep.lastAmount * 12)),
      line('Tot', 'Up to', perYear(saving), true),
    ],
    assumptions: [
      line('Strategie', 'Strategy', l('Eén dienst per maand, afwisselend', 'One service a month, rotating')),
    ],
    actions: [{ kind: 'manage', label: l('Bekijk je abonnementen', 'See your subscriptions'), target: 'subscriptions' }],
  };
};

export const priceIncrease: Detector = (ctx) => {
  const results: (Insight | Suppressed)[] = [];
  const rotation = streamingRotation(ctx);
  const rotated = rotation && !Array.isArray(rotation) && 'id' in rotation ? videoStreams(ctx.streams).map((s) => s.key) : [];

  for (const s of ctx.streams) {
    if (!SUBSCRIPTION_CATEGORIES.includes(s.category) || !s.active || !s.priceChange) continue;
    const { from, to, date, transactionId } = s.priceChange;
    if (to <= from || daysBetween(date, ctx.today) > 60) continue;
    if (rotated.includes(s.key)) {
      results.push({
        type: 'price_increase',
        reason: l(`Prijsstijging ${s.name} zit al in de streamingtip.`, `${s.name} price rise is folded into the streaming tip.`),
      });
      continue;
    }
    const perYearCount = s.cadence === 'monthly' ? 12 : s.cadence === 'quarterly' ? 4 : s.cadence === 'weekly' ? 52 : 1;
    const extra = roundTo((to - from) * perYearCount, 1);
    if (extra < MIN_PRICE_RISE) {
      results.push({
        type: 'price_increase',
        reason: l(
          `${s.name} werd ${euroL(extra).nl} per jaar duurder: te weinig om je voor te storen.`,
          `${s.name} got ${euroL(extra).en} a year pricier: too little to interrupt you for.`,
        ),
      });
      continue;
    }
    const tx = ctx.tx(transactionId);
    results.push({
      id: `price_increase:${s.key}:${date}`,
      type: 'price_increase',
      domain: 'subscriptions',
      title: l(`${s.name} is duurder geworden`, `${s.name} got more expensive`),
      summary: l(
        `Van ${formatMoney(from, 'nl')} naar ${formatMoney(to, 'nl')}: dat is ${euroL(extra).nl} extra per jaar. Check of een goedkopere formule volstaat.`,
        `From ${formatMoney(from, 'en')} to ${formatMoney(to, 'en')}: that is ${euroL(extra).en} extra a year. Check whether a cheaper plan will do.`,
      ),
      teaser: l(`${s.name} kost je voortaan ${euroL(extra).nl} per jaar meer.`, `${s.name} now costs you ${euroL(extra).en} more a year.`),
      annualValue: extra,
      confidence: 0.95,
      triggeredAt: date,
      trigger: l(`De eerste betaling aan het nieuwe tarief was op ${formatDateL(date).nl}.`, `The first charge at the new rate was on ${formatDateL(date).en}.`),
      evidence: tx ? [txEvidence(tx)] : [],
      reasons: [
        l(`Je betaalde ${s.count - 1} keer ${formatMoney(from, 'nl')} en nu ${formatMoney(to, 'nl')}.`, `You paid ${formatMoney(from, 'en')} before and ${formatMoney(to, 'en')} now.`),
        l('Prijsverhogingen gebeuren stil; je krijgt er zelden een factuur van.', 'Price rises happen quietly; you rarely get a bill for them.'),
      ],
      breakdown: [
        line('Oud tarief', 'Old price', perMonth(from)),
        line('Nieuw tarief', 'New price', perMonth(to)),
        line('Extra', 'Extra', perYear(extra), true),
      ],
      assumptions: [],
      actions: [{ kind: 'manage', label: l('Bekijk je abonnementen', 'See your subscriptions'), target: 'subscriptions' }],
    });
  }
  return results;
};

export const trialConverted: Detector = (ctx) => {
  const results: Insight[] = [];
  for (const s of ctx.streams) {
    if (!s.trialConverted || !s.active || daysBetween(s.trialConverted.date, ctx.today) > 45) continue;
    const tx = ctx.tx(s.trialConverted.transactionId);
    results.push({
      id: `trial_converted:${s.key}`,
      type: 'trial_converted',
      domain: 'subscriptions',
      title: l(`Je proefperiode bij ${s.name} is voorbij`, `Your ${s.name} trial has ended`),
      summary: l(
        `Sinds ${formatDateL(s.trialConverted.date).nl} betaal je ${formatMoney(s.lastAmount, 'nl')} per maand, ${euroL(s.annualCost).nl} per jaar. Bewust gekozen? Dan hoef je niets te doen.`,
        `Since ${formatDateL(s.trialConverted.date).en} you pay ${formatMoney(s.lastAmount, 'en')} a month, ${euroL(s.annualCost).en} a year. Meant to keep it? Then there is nothing to do.`,
      ),
      teaser: l(`${s.name} is van proef naar betalend gegaan.`, `${s.name} went from trial to paid.`),
      annualValue: s.annualCost,
      confidence: 0.8,
      triggeredAt: s.trialConverted.date,
      trigger: l(`Na een eerste betaling van ${formatMoney(s.trialConverted.trialAmount, 'nl')} volgde het volle tarief.`, `After a first charge of ${formatMoney(s.trialConverted.trialAmount, 'en')} the full price followed.`),
      evidence: tx ? [txEvidence(tx)] : [],
      reasons: [
        l(`Je eerste betaling aan ${s.name} was ${formatMoney(s.trialConverted.trialAmount, 'nl')}.`, `Your first payment to ${s.name} was ${formatMoney(s.trialConverted.trialAmount, 'en')}.`),
        l('Daarna volgde elke maand het volle tarief.', 'The full price followed every month after.'),
      ],
      breakdown: [line('Kost', 'Cost', perYear(s.annualCost), true)],
      assumptions: [],
      actions: [{ kind: 'manage', label: l('Bekijk je abonnementen', 'See your subscriptions'), target: 'subscriptions' }],
    });
  }
  return results;
};

export const SUBSCRIPTION_DETECTORS = [streamingRotation, priceIncrease, trialConverted];
