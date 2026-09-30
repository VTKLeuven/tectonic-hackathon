import { analyze, bookLiveEvent, buildPersona, PERSONA_IDS, t, todayISO } from '../src';

const today = process.argv[2] ?? todayISO();
const lang = 'nl';
for (const id of PERSONA_IDS) {
  const data = buildPersona(id, today);
  for (const withLive of [false, true]) {
    const txs = withLive ? [...data.history, ...data.live.map((e) => bookLiveEvent(id, e, today))] : data.history;
    const a = analyze({ transactions: txs, today, profile: { firstName: data.persona.firstName, age: data.persona.age }, openingBalance: data.openingBalance });
    console.log(`\n=== ${id} ${withLive ? '(+live)' : ''} — ${a.transactions.length} tx, balance ok`);
    console.log('signals:', a.signals.map((s) => `${s.id}@${s.date}(${s.confidence.toFixed(2)})`).join(', '));
    console.log('streams:', a.recurring.filter((s) => s.active).map((s) => `${s.name}/${s.category} ${s.lastAmount}${s.priceChange ? ` Δ${s.priceChange.from}->${s.priceChange.to}` : ''}${s.trialConverted ? ' trial' : ''}`).join(', '));
    for (const i of a.insights) {
      console.log(`  ${i.score.total.toFixed(2)} [v${i.score.value.toFixed(2)} c${i.score.confidence.toFixed(2)} t${i.score.timeliness.toFixed(2)} a${i.score.affinity.toFixed(2)}] ${i.type}: ${t(i.title, lang)} — ${t(i.summary, lang)}`);
    }
    console.log('  featured:', a.featured?.type ?? '-');
    for (const s of a.suppressed) console.log(`  x ${s.type}: ${t(s.reason, lang)}`);
    console.log('  energy:', JSON.stringify(a.energy.annual), 'co2', a.energy.co2Kg, a.energy.heatingSource);
  }
}
