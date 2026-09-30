import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildProjectionInput, compareProjections, project, lotte, samNoor, marc, A } from '../index';
import { stateFor } from './helpers';

const today = '2026-09-30';

test('projection runs to at least 2035 and to retirement, monotone dates, sane numbers', () => {
  const state = stateFor(lotte, today);
  const input = buildProjectionInput(state);
  const r = project(input);
  assert.ok(r.points.length > 12);
  assert.equal(r.points[0].date, '2026-09-01');
  for (let i = 1; i < r.points.length; i++) assert.ok(r.points[i].date > r.points[i - 1].date);
  assert.equal(r.at2035.date, '2035-12-01');
  assert.equal(r.retirementDate, '2065-07-01');
  assert.ok(r.atRetirement.date >= r.retirementDate);
  // Lotte saves: net worth in 2035 should exceed today's and stay positive
  assert.ok(r.at2035.netWorthCents > r.points[0].netWorthCents);
  assert.ok(r.monthlySurplusCents > 0);
  assert.ok(Number.isFinite(r.atRetirement.netWorthCents));
});

test('the projection is deterministic', () => {
  const state = stateFor(marc, today);
  const input = buildProjectionInput(state);
  assert.deepEqual(project(input).at2035, project(input).at2035);
});

test('working 4/5 lowers the surplus and net worth in 2035', () => {
  const input = buildProjectionInput(stateFor(samNoor, today));
  const base = project(input);
  const scen = project(input, { workRegime: '4/5' });
  const cmp = compareProjections(base, scen);
  assert.ok(cmp.monthlySurplusDeltaCents < 0);
  assert.ok(cmp.netWorth2035DeltaCents < 0);
  assert.ok(Math.abs(scen.monthlyIncomeCents / base.monthlyIncomeCents - A.netFactor45) < 0.01);
});

test('extra saving raises liquid savings and pulls the home goal forward', () => {
  const input = buildProjectionInput(stateFor(lotte, today));
  const base = project(input);
  const scen = project(input, { extraMonthlySavingCents: 20000 });
  const cmp = compareProjections(base, scen);
  assert.ok(cmp.liquid2035DeltaCents > 20000 * 100);
  const huis = cmp.goals.find((g) => g.goalId === 'huis');
  assert.ok(huis && huis.monthsDelta !== null && huis.monthsDelta < 0, JSON.stringify(huis));
});

test('buying a home converts liquid savings into a house and a mortgage, with affordability check', () => {
  const input = buildProjectionInput(stateFor(lotte, today));
  const scen = project(input, { homePurchase: { priceCents: 28_000_000, year: 2029 } });
  assert.ok(scen.feasibility, 'feasibility computed');
  assert.ok(scen.feasibility!.loanCents! > 0);
  const after = scen.points.find((p) => p.date === '2029-07-01')!;
  assert.ok(after.debtCents > 0 && after.homeValueCents >= 28_000_000);
  assert.ok(after.liquidCents < scen.points.find((p) => p.date === '2029-05-01')!.liquidCents);
  // A € 900.000 villa is not affordable for Lotte: the rule fires
  const villa = project(input, { homePurchase: { priceCents: 90_000_000, year: 2029 } });
  assert.equal(villa.feasibility!.ok, false);
  assert.ok(villa.feasibility!.reasons.length >= 1);
});

test('mortgage keeps amortising and ends for Marc', () => {
  const input = buildProjectionInput(stateFor(marc, today));
  const r = project(input);
  const p2030 = r.points.find((p) => p.date === '2030-01-01')!;
  assert.equal(p2030.debtCents, 0);
});
