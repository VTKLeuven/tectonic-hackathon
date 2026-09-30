import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateAlerts, lotte, samNoor, marc, emma, resolveAlert, snoozeAlert, selectAlerts, planNotification, detectSubscriptions, generateTransactions, runNightly, buildSnapshot, offlineReply, runTool, PRESET_TRANSACTIONS, type Alert } from '../index';
import { stateFor, TEST_DATES } from './helpers';

const types = (alerts: Alert[]) => new Set(alerts.map((a) => a.type));

test('synthetic data is deterministic and stores integer cents', () => {
  const a = generateTransactions(lotte, '2026-09-30');
  const b = generateTransactions(lotte, '2026-09-30');
  assert.deepEqual(a, b);
  assert.ok(a.length > 500);
  for (const t of a) {
    assert.ok(Number.isInteger(t.amountCents), `${t.merchant} ${t.amountCents}`);
    assert.ok(t.date <= '2026-09-30');
  }
});

for (const today of TEST_DATES) {
  test(`Lotte (${today}): delivery overspend and goal drift or overlapping subscriptions`, () => {
    const ev = evaluateAlerts(stateFor(lotte, today));
    const t = types(ev.candidates);
    assert.ok(t.has('category_overspend'), `overspend missing: ${[...t]}`);
    const overspend = ev.candidates.find((a) => a.type === 'category_overspend' && a.category === 'maaltijdbezorging');
    assert.ok(overspend, 'delivery overspend');
    assert.ok(overspend!.impact && overspend!.impact.netWorth2035DeltaCents < 0);
    assert.ok(t.has('subscription_overlap'), 'three streaming services');
    assert.ok(t.has('goal_drift'), 'home goal drifts');
    assert.ok(ev.active.length <= 3 && ev.active.length >= 1);
  });

  test(`Sam & Noor (${today}): energy bill jump`, () => {
    const ev = evaluateAlerts(stateFor(samNoor, today));
    const inc = ev.candidates.find((a) => a.type === 'subscription_increase' && a.merchant === 'Luminus');
    assert.ok(inc, 'Luminus increase');
    assert.ok(inc!.amountCents! > 5000);
  });

  test(`Marc (${today}): unusual travel transaction and travel overspend`, () => {
    const ev = evaluateAlerts(stateFor(marc, today));
    const t = types(ev.candidates);
    assert.ok(ev.candidates.some((a) => a.type === 'unusual_transaction' && a.merchant === 'TUI'), 'TUI unusual');
    assert.ok(ev.candidates.some((a) => a.type === 'category_overspend' && a.category === 'reizen'), 'travel overspend');
    assert.ok(t.has('budget'));
  });

  test(`Emma (${today}): shopping overspend and buffer warning`, () => {
    const ev = evaluateAlerts(stateFor(emma, today));
    assert.ok(ev.candidates.some((a) => a.type === 'category_overspend' && a.category === 'shopping'), 'shopping overspend');
    const buffer = ev.candidates.find((a) => a.type === 'buffer');
    assert.ok(buffer, 'buffer alert');
    assert.ok(buffer!.severity === 'dringend' || buffer!.severity === 'waarschuwing');
  });
}

test('every alert has Dutch copy, a why-view with numbers and actions', () => {
  for (const p of [lotte, samNoor, marc, emma]) {
    const ev = evaluateAlerts(stateFor(p, '2026-09-30'));
    for (const a of ev.candidates) {
      assert.ok(a.title.length > 3 && a.message.length > 10);
      assert.ok(a.why.lines.length >= 2 && a.why.rule.length > 10, a.id);
      assert.ok(a.actions.length >= 2);
      assert.ok(a.chatPrompt.length > 5);
    }
  }
});

test('attention rules: resolve, snooze and max active', () => {
  const state = stateFor(marc, '2026-09-30');
  const ev = evaluateAlerts(state);
  const first = ev.active[0];
  let memory = resolveAlert(state.alertMemory, first.id, state.today);
  let sel = selectAlerts(ev.candidates, memory, state.today);
  assert.ok(!sel.active.some((a) => a.id === first.id));
  assert.ok(sel.suppressed.some((a) => a.id === first.id));
  const second = sel.active[0];
  memory = snoozeAlert(memory, second.id, state.today);
  sel = selectAlerts(ev.candidates, memory, state.today);
  assert.ok(!sel.active.some((a) => a.id === second.id));
  // snooze expires
  sel = selectAlerts(ev.candidates, memory, '2026-10-05');
  assert.ok(sel.active.some((a) => a.id === second.id));
  assert.ok(sel.active.length <= 3);
});

test('notifications: one per day, quiet hours delay until 08:00', () => {
  const state = stateFor(emma, '2026-09-30');
  const ev = evaluateAlerts(state);
  const day = new Date(2026, 8, 30, 14, 0, 0);
  const plan = planNotification(ev.active, state.alertMemory, day, '2026-09-30');
  assert.ok(plan && plan.deliverAt === null);
  const night = new Date(2026, 8, 30, 22, 30, 0);
  const late = planNotification(ev.active, state.alertMemory, night, '2026-09-30');
  assert.ok(late && late.deliverAt && late.deliverAt.getHours() === 8 && late.deliverAt.getDate() === 1);
  const already = planNotification(ev.active, { ...state.alertMemory, lastNotificationDate: '2026-09-30' }, day, '2026-09-30');
  assert.equal(already, null);
});

test('adding a preset transaction triggers the matching alert', () => {
  const base = stateFor(samNoor, '2026-09-30');
  const before = evaluateAlerts(base);
  assert.ok(!before.candidates.some((a) => a.type === 'unusual_transaction' && a.merchant === 'Zalando'));
  const preset = PRESET_TRANSACTIONS.find((p) => p.id === 'zalando')!;
  const withTx = { ...base, transactions: [...base.transactions, { id: 'demo-1', date: base.today, amountCents: preset.amountCents, merchant: preset.merchant, category: preset.category, accountId: 'zicht' as const }] };
  const after = evaluateAlerts(withTx);
  assert.ok(after.candidates.some((a) => a.type === 'unusual_transaction' && a.merchant === 'Zalando'));
  const disney = PRESET_TRANSACTIONS.find((p) => p.id === 'disney')!;
  const withSub = { ...base, transactions: [...base.transactions, { id: 'demo-2', date: base.today, amountCents: disney.amountCents, merchant: 'HBO Max', category: disney.category, accountId: 'zicht' as const, recurring: true, subscriptionKind: 'video' as const }] };
  const subs = detectSubscriptions(withSub);
  assert.ok(subs.some((s) => s.merchant === 'HBO Max' && s.isNew));
  assert.ok(evaluateAlerts(withSub).candidates.some((a) => a.type === 'subscription_new' && a.merchant === 'HBO Max'));
});

test('nightly run produces messages quickly', () => {
  const r = runNightly(stateFor(samNoor, '2026-09-30'));
  assert.ok(r.messages.length >= 2);
  assert.ok(r.durationMs < 2000);
});

test('snapshot is minimal (no transactions) and tools answer from it', () => {
  const snap = buildSnapshot(stateFor(lotte, '2026-09-30'));
  const json = JSON.stringify(snap);
  assert.ok(!json.includes('"transactions"'));
  assert.ok(json.length < 60_000, `snapshot is ${json.length} bytes`);
  const sim = runTool('simulate_scenario', { workRegime: '4/5' }, snap);
  assert.ok(sim.scenarioCard && sim.scenarioCard.baseline.length >= 5);
  const details = runTool('get_spending_details', { merchant: 'Deliveroo' }, snap).result as { merchant: string };
  assert.equal(details.merchant, 'Deliveroo');
  assert.ok((runTool('nope', {}, snap).result as { error: string }).error);
});

test('offline fallback answers the common questions with numbers from the engine', () => {
  const snap = buildSnapshot(stateFor(lotte, '2026-09-30'));
  const a = offlineReply(snap, [{ role: 'user', content: 'Wat als ik 4/5 ga werken?' }]);
  assert.equal(a.mode, 'offline');
  assert.ok(a.scenario && a.reply.includes('€'));
  const b = offlineReply(snap, [{ role: 'user', content: 'Kan ik in 2029 een huis kopen?' }]);
  assert.ok(b.scenario && b.reply.includes('2029'));
  const c = offlineReply(snap, [{ role: 'user', content: 'Waarom waarschuw je me over Deliveroo?' }]);
  assert.ok(c.reply.toLowerCase().includes('maaltijdbezorging'));
  const d = offlineReply(snap, [{ role: 'user', content: 'Hallo?' }]);
  assert.ok(d.reply.length > 40);
});
