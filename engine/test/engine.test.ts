import { describe, expect, it } from 'vitest';

import {
  analyze,
  applyFeedback,
  bookLiveEvent,
  buildPersona,
  categorise,
  EMPTY_FEEDBACK,
  formatMoney,
  PERSONA_IDS,
  type PersonaId,
} from '../src';

const TODAY = '2026-09-30';

function run(id: PersonaId, opts: { live?: boolean; today?: string; feedback?: typeof EMPTY_FEEDBACK } = {}) {
  const today = opts.today ?? TODAY;
  const data = buildPersona(id, today);
  const transactions = opts.live ? [...data.history, ...data.live.map((e) => bookLiveEvent(id, e, today))] : data.history;
  return analyze({
    transactions,
    today,
    profile: { firstName: data.persona.firstName, age: data.persona.age },
    openingBalance: data.openingBalance,
    feedback: opts.feedback,
  });
}

describe('enrichment', () => {
  it('recognises merchants from the raw statement line', () => {
    const tx = { id: 'x', date: TODAY, channel: 'transfer' as const };
    expect(categorise({ ...tx, amount: -1575, counterparty: 'GABRIELS BRANDSTOFFEN NV', description: 'MAZOUT LEVERING 1500 L' })).toMatchObject({
      category: 'heating_oil',
      facts: { litres: 1500 },
    });
    expect(categorise({ ...tx, amount: -140, counterparty: 'ENGIE ELECTRABEL', description: 'VOORSCHOT AARDGAS' }).category).toBe('gas');
    expect(categorise({ ...tx, amount: 42, counterparty: 'ENGIE ELECTRABEL', description: 'INJECTIEVERGOEDING' }).category).toBe('energy_credit');
    expect(categorise({ ...tx, amount: -20, counterparty: 'SHELL RECHARGE', description: 'LAADSESSIE' }).category).toBe('ev_charging');
    expect(categorise({ ...tx, amount: -60, counterparty: 'SHELL GENT', description: 'BETALING' }).category).toBe('fuel');
  });

  it('finds recurring payments, price changes and converted trials', () => {
    const tom = run('tom');
    const spotify = tom.recurring.find((s) => s.key === 'spotify');
    expect(spotify?.priceChange).toMatchObject({ from: 11.99, to: 12.99 });
    const disney = tom.recurring.find((s) => s.key === 'disney');
    expect(disney?.trialConverted?.trialAmount).toBe(1.99);
  });

  it('keeps a one-off settlement out of the monthly advance', () => {
    const els = run('janssens', { live: true });
    const gas = els.recurring.find((s) => s.category === 'gas');
    expect(gas?.lastAmount).toBe(140);
    expect(gas?.priceChange).toBeUndefined();
  });
});

describe('life events', () => {
  it('detects Sarah\'s move and home purchase without being told', () => {
    const a = run('sarah');
    const moved = a.signals.find((s) => s.id === 'moved');
    expect(moved?.confidence).toBeGreaterThan(0.9);
    expect(a.signals.some((s) => s.id === 'homeowner')).toBe(true);
  });

  it('detects Jasper\'s student life signal at KU Leuven (VTK)', () => {
    const a = run('jasper');
    const student = a.signals.find((s) => s.id === 'student_life');
    expect(student).toBeDefined();
    expect(student!.confidence).toBeGreaterThanOrEqual(0.95);
    expect(student!.label.nl).toContain('VTK');
    expect(student!.data.weeklyAllowance).toBe(100);

    // Non-students do not get student_life signal
    for (const id of ['sarah', 'tom', 'janssens'] as const) {
      expect(run(id).signals.some((s) => s.id === 'student_life')).toBe(false);
    }
  });
});

describe('insights', () => {
  it('suggests solar panels after a move, and features it', () => {
    const a = run('sarah');
    expect(a.featured?.type).toBe('solar');
    expect(a.featured?.annualValue).toBeGreaterThan(300);
  });

  it('reacts to an oil delivery with a heat pump tip that takes the home screen', () => {
    const before = run('sarah');
    expect(before.insights.some((i) => i.type === 'heat_pump')).toBe(false);
    const after = run('sarah', { live: true });
    const hp = after.insights.find((i) => i.type === 'heat_pump');
    expect(hp).toBeDefined();
    expect(hp!.co2SavedKg).toBeGreaterThan(2000);
    expect(after.featured?.type).toBe('heat_pump');
  });

  it('folds a streaming price rise into the rotation tip instead of nagging twice', () => {
    const a = run('sarah');
    expect(a.insights.some((i) => i.type === 'streaming_rotation')).toBe(true);
    expect(a.insights.some((i) => i.type === 'price_increase')).toBe(false);
    expect(a.suppressed.some((s) => s.type === 'price_increase')).toBe(true);
  });

  it('never suggests what the customer already has', () => {
    const a = run('janssens');
    const types = a.insights.map((i) => i.type);
    expect(types).not.toContain('solar');
    expect(types).not.toContain('ev_switch');
    expect(types).not.toContain('pension_saving');
    expect(types).toContain('home_charging');
  });

  it('stays silent about a price rise too small to matter', () => {
    const a = run('tom');
    expect(a.insights.some((i) => i.type === 'price_increase')).toBe(false);
    expect(a.suppressed.find((s) => s.type === 'price_increase')?.reason.en).toMatch(/too little/);
  });

  it('does not suggest roof or heating changes to a renter', () => {
    const a = run('tom');
    expect(a.insights.some((i) => i.type === 'solar' || i.type === 'heat_pump')).toBe(false);
  });

  it('makes a garage bill the moment for the EV tip', () => {
    const before = run('tom').insights.find((i) => i.type === 'ev_switch')!;
    const after = run('tom', { live: true }).insights.find((i) => i.type === 'ev_switch')!;
    expect(after.score.timeliness).toBeGreaterThan(before.score.timeliness);
  });

  it('detects Jasper nightlife spending and features the fakbar saving tip', () => {
    const a = run('jasper');
    expect(a.featured?.type).toBe('nightlife_budget');
    expect(a.featured?.title.nl).toContain("'t ElixIr");
    expect(a.featured?.evidence.some((e) => e.label.nl.includes('DE NIJL'))).toBe(true);
    expect(a.featured?.evidence.some((e) => e.label.nl.includes('CAFE BELGE'))).toBe(true);
    expect(a.featured?.reasons.some((r) => r.nl.includes('€ 28,50') && r.nl.includes('€ 140'))).toBe(true);
  });

  it('provisions specialized Swarm agents for Jasper student persona', () => {
    const a = run('jasper');
    expect(a.agents).toBeDefined();
    expect(a.agents!.length).toBe(3);
    const agentIds = a.agents!.map((ag) => ag.id);
    expect(agentIds).toContain('cashflow_sentinel');
    expect(agentIds).toContain('nightlife_radar');
    expect(agentIds).toContain('campus_concierge');
    const concierge = a.agents!.find((ag) => ag.id === 'campus_concierge');
    expect(concierge?.verdict.nl).toContain('Alma 3');
    expect(concierge?.verdict.nl).toContain('CuDi');
  });

  it('is deterministic', () => {
    for (const id of PERSONA_IDS) {
      expect(JSON.stringify(run(id).insights)).toBe(JSON.stringify(run(id).insights));
    }
  });

  it('keeps working on other dates', () => {
    for (const today of ['2026-11-12', '2027-03-01', '2027-07-15']) {
      expect(run('sarah', { today }).featured?.type).toBe('solar');
      expect(run('sarah', { today, live: true }).featured?.type).toBe('heat_pump');
    }
  });
});

describe('feedback', () => {
  it('"not for me" hides the tip and mutes its type', () => {
    const a = run('sarah');
    const solar = a.insights.find((i) => i.type === 'solar')!;
    const fb = applyFeedback(EMPTY_FEEDBACK, solar, 'dismiss', TODAY);
    const b = run('sarah', { feedback: fb });
    expect(b.insights.some((i) => i.type === 'solar')).toBe(false);
    expect(b.featured?.type).not.toBe('solar');
  });

  it('"later" keeps the tip in the inbox but off the home screen', () => {
    const a = run('sarah');
    const fb = applyFeedback(EMPTY_FEEDBACK, a.featured!, 'snooze', TODAY);
    const b = run('sarah', { feedback: fb });
    expect(b.insights.find((i) => i.id === a.featured!.id)?.status).toBe('snoozed');
    expect(b.featured?.id).not.toBe(a.featured!.id);
  });

  it('learns from useful taps', () => {
    const a = run('tom');
    const tip = a.insights.find((i) => i.type === 'energy_contract')!;
    const fb = applyFeedback(EMPTY_FEEDBACK, { id: 'other', type: 'energy_contract' }, 'useful', TODAY);
    const b = run('tom', { feedback: fb });
    expect(b.insights.find((i) => i.id === tip.id)!.score.affinity).toBeGreaterThan(tip.score.affinity);
  });
});

describe('formatting', () => {
  it('uses Belgian number formatting', () => {
    expect(formatMoney(-1575, 'nl')).toBe('- € 1.575,00');
    expect(formatMoney(1234.5, 'en', { signed: true })).toBe('+ € 1,234.50');
  });
});
