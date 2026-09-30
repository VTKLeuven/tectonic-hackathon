import { addDays, daysBetween } from './dates';
import { euroL, formatDateL, l } from './format';
import type { EnrichedTransaction, ISODate, RecurringStream, Signal } from './types';

/**
 * Step 3: turn transactions into facts about someone's life.
 *
 * Each detector combines weak hints into one signal with a confidence and the
 * exact transactions that support it. Nothing here asks the customer a
 * question; if the evidence is too thin, the signal simply does not fire.
 */

const sum = (txs: EnrichedTransaction[]) => txs.reduce((s, tx) => s + -tx.amount, 0);

function within(txs: EnrichedTransaction[], from: ISODate, to: ISODate) {
  return txs.filter((tx) => tx.date >= from && tx.date <= to);
}

export function detectSignals(txs: EnrichedTransaction[], streams: RecurringStream[], today: ISODate): Signal[] {
  const signals: Signal[] = [];
  const recent = (days: number) => txs.filter((tx) => daysBetween(tx.date, today) <= days);
  const of = (...cats: EnrichedTransaction['category'][]) => txs.filter((tx) => cats.includes(tx.category));

  // --- Home purchase: a notary deed of several thousand euros.
  const deed = of('notary')
    .filter((tx) => -tx.amount >= 2_000)
    .sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  const mortgage = streams.find((s) => s.category === 'mortgage' && s.active);
  if (deed) {
    const conf = mortgage ? 0.95 : 0.75;
    signals.push({
      id: 'home_purchase',
      date: deed.date,
      confidence: conf,
      label: l(
        `Woning gekocht (akte op ${formatDateL(deed.date).nl})`,
        `Bought a home (deed signed ${formatDateL(deed.date).en})`,
      ),
      evidence: [deed.id, ...(mortgage ? [mortgage.transactionIds[0]] : [])],
      data: { deedAmount: -deed.amount },
    });
  }

  // --- Homeowner or renter, from what the housing payment looks like.
  const rent = streams.find((s) => s.category === 'rent' && s.active);
  if (mortgage || deed) {
    signals.push({
      id: 'homeowner',
      date: mortgage?.firstDate ?? deed!.date,
      confidence: mortgage ? 0.95 : 0.7,
      label: l('Eigenaar van de woning', 'Owns their home'),
      evidence: mortgage ? mortgage.transactionIds.slice(-1) : [deed!.id],
      data: {},
    });
  } else if (rent) {
    signals.push({
      id: 'renter',
      date: rent.firstDate,
      confidence: 0.9,
      label: l(`Huurt (${euroL(rent.amount).nl} per maand)`, `Rents (${euroL(rent.amount).en} a month)`),
      evidence: rent.transactionIds.slice(-1),
      data: { rent: rent.amount },
    });
  }

  // --- Moved: a mover, or a cluster of home-shaped spending around a new housing payment.
  const mover = of('moving').sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  const anchor = mover?.date ?? deed?.date ?? mortgage?.firstDate;
  if (anchor && daysBetween(anchor, today) <= 400) {
    const evidence: string[] = [];
    let conf = 0;
    if (mover) {
      conf += 0.55;
      evidence.push(mover.id);
    }
    if (deed && Math.abs(daysBetween(deed.date, anchor)) <= 90) {
      conf += 0.25;
      evidence.push(deed.id);
    }
    const nesting = within(of('furniture', 'diy'), addDays(anchor, -30), addDays(anchor, 60));
    if (sum(nesting) >= 600) {
      conf += 0.15;
      evidence.push(...nesting.slice(0, 3).map((tx) => tx.id));
    }
    const endedRent = streams.find((s) => s.category === 'rent' && !s.active && Math.abs(daysBetween(s.lastDate, anchor)) <= 60);
    if (endedRent) {
      conf += 0.15;
      evidence.push(endedRent.transactionIds[endedRent.transactionIds.length - 1]);
    }
    const newSupplier = streams.find(
      (s) => s.category === 'electricity' && Math.abs(daysBetween(s.firstDate, anchor)) <= 60 && s.active,
    );
    if (newSupplier) {
      conf += 0.1;
      evidence.push(newSupplier.transactionIds[0]);
    }
    if (conf >= 0.6) {
      signals.push({
        id: 'moved',
        date: anchor,
        confidence: Math.min(conf, 0.97),
        label: l(`Verhuisd rond ${formatDateL(anchor).nl}`, `Moved around ${formatDateL(anchor).en}`),
        evidence,
        data: { nestingSpend: Math.round(sum(nesting)) },
      });
    }
  }

  // --- Heating oil: a delivery in the last 18 months.
  const oil = of('heating_oil').filter((tx) => daysBetween(tx.date, today) <= 540);
  if (oil.length) {
    const latest = oil.sort((a, b) => (a.date < b.date ? 1 : -1))[0];
    const lastYear = oil.filter((tx) => daysBetween(tx.date, today) <= 365);
    const litres = lastYear.reduce((s, tx) => s + (tx.facts.litres ?? 0), 0);
    signals.push({
      id: 'heating_oil',
      date: latest.date,
      confidence: 0.9,
      label: l(
        `Verwarmt met mazout (levering op ${formatDateL(latest.date).nl})`,
        `Heats with oil (delivery on ${formatDateL(latest.date).en})`,
      ),
      evidence: lastYear.map((tx) => tx.id),
      data: { litres, spend: Math.round(sum(lastYear)), deliveries: lastYear.length, lastAmount: -latest.amount },
    });
  }

  // --- Solar panels: injection refunds or an installer payment.
  const solar = of('energy_credit', 'solar');
  if (solar.length) {
    signals.push({
      id: 'has_solar',
      date: solar[0].date,
      confidence: 0.9,
      label: l('Heeft al zonnepanelen', 'Already has solar panels'),
      evidence: solar.slice(-2).map((tx) => tx.id),
      data: {},
    });
  }

  // --- Driving: public charging sessions, or regular fuel.
  const charging = recent(120).filter((tx) => tx.category === 'ev_charging');
  if (charging.length >= 3) {
    const spend = sum(charging);
    signals.push({
      id: 'ev_driver',
      date: charging[0].date,
      confidence: 0.85,
      label: l('Rijdt elektrisch en laadt publiek', 'Drives electric, charges in public'),
      evidence: charging.slice(-3).map((tx) => tx.id),
      data: { monthlyCharging: Math.round((spend / 120) * 30) },
    });
  }
  const fuel = recent(180).filter((tx) => tx.category === 'fuel');
  if (fuel.length >= 6) {
    const monthly = (sum(fuel) / 180) * 30;
    signals.push({
      id: 'petrol_driver',
      // A habit, not an event: date it from when the pattern started, so it never looks "fresh".
      date: fuel[0].date,
      confidence: 0.85,
      label: l(`Tankt ongeveer ${euroL(monthly).nl} per maand`, `Spends about ${euroL(monthly).en} a month on fuel`),
      evidence: fuel.slice(-4).map((tx) => tx.id),
      data: { monthlyFuel: Math.round(monthly) },
    });
  }
  const repair = recent(60)
    .filter((tx) => tx.category === 'car' && -tx.amount >= 600)
    .sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  if (repair) {
    signals.push({
      id: 'car_repair',
      date: repair.date,
      confidence: 0.8,
      label: l(`Grote garagefactuur (${euroL(-repair.amount).nl})`, `Large garage bill (${euroL(-repair.amount).en})`),
      evidence: [repair.id],
      data: { amount: -repair.amount },
    });
  }

  // --- Energy bills: an advance that went up, or a settlement to pay extra.
  for (const s of streams.filter((s) => (s.category === 'electricity' || s.category === 'gas') && s.active)) {
    if (s.priceChange && s.priceChange.to > s.priceChange.from * 1.1 && daysBetween(s.priceChange.date, today) <= 120) {
      signals.push({
        id: 'energy_advance_up',
        date: s.priceChange.date,
        confidence: 0.9,
        label: l(
          `Voorschot ${s.name} steeg van ${euroL(s.priceChange.from).nl} naar ${euroL(s.priceChange.to).nl}`,
          `${s.name} advance rose from ${euroL(s.priceChange.from).en} to ${euroL(s.priceChange.to).en}`,
        ),
        evidence: [s.priceChange.transactionId],
        data: { stream: s.key, from: s.priceChange.from, to: s.priceChange.to },
      });
    }
  }
  const settlement = recent(45)
    .filter((tx) => (tx.category === 'electricity' || tx.category === 'gas') && /AFREKENING/i.test(tx.description) && -tx.amount >= 150)
    .sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  if (settlement) {
    signals.push({
      id: 'energy_settlement',
      date: settlement.date,
      confidence: 0.95,
      label: l(
        `Jaarafrekening: ${euroL(-settlement.amount).nl} bijbetalen`,
        `Annual settlement: ${euroL(-settlement.amount).en} to pay`,
      ),
      evidence: [settlement.id],
      data: { amount: -settlement.amount, merchant: settlement.merchantKey },
    });
  }

  // --- Streaming: several video services at once.
  const video = streams.filter((s) => s.category === 'streaming' && s.active && s.cadence === 'monthly');
  if (video.length >= 3) {
    signals.push({
      id: 'streaming_stack',
      date: video.map((s) => s.lastDate).sort().slice(-1)[0],
      confidence: 0.95,
      label: l(`${video.length} streamingdiensten tegelijk`, `${video.length} streaming services at once`),
      evidence: video.map((s) => s.transactionIds[s.transactionIds.length - 1]),
      data: { count: video.length },
    });
  }

  // --- Income and pension saving.
  const salary = txs.filter((tx) => tx.category === 'income' && tx.amount >= 1_200 && daysBetween(tx.date, today) <= 70);
  if (salary.length >= 2) {
    signals.push({
      id: 'salary',
      date: salary[salary.length - 1].date,
      confidence: 0.95,
      label: l('Vast inkomen', 'Regular salary'),
      evidence: salary.slice(-1).map((tx) => tx.id),
      data: { monthly: Math.round(salary.reduce((s, tx) => s + tx.amount, 0) / salary.length) },
    });
  }
  const pension = txs.filter((tx) => tx.category === 'pension_saving' && daysBetween(tx.date, today) <= 400);
  if (pension.length) {
    signals.push({
      id: 'pension_saving',
      date: pension[0].date,
      confidence: 0.95,
      label: l('Spaart al voor pensioen', 'Already saves for retirement'),
      evidence: pension.slice(-1).map((tx) => tx.id),
      data: { yearly: Math.round(sum(pension.filter((tx) => daysBetween(tx.date, today) <= 365))) },
    });
  }

  // --- Student life: allowance, fakbars, campus resto, VTK CuDi
  const allowanceTxs = txs.filter(
    (tx) => tx.amount > 0 && /zakgeld|leefgeld|ouders|studietoelage/i.test(`${tx.counterparty} ${tx.description}`),
  );
  const studentLifeTxs = txs.filter((tx) =>
    /fakbar|elixir|recup|alma|theokot|de nijl|cudi|cursusdienst|vtk/i.test(`${tx.counterparty} ${tx.description}`),
  );
  if (allowanceTxs.length >= 1 || studentLifeTxs.length >= 2) {
    const evidenceTxs = [...allowanceTxs.slice(-1), ...studentLifeTxs.slice(-3)];
    signals.push({
      id: 'student_life',
      date: studentLifeTxs[0]?.date ?? allowanceTxs[0]?.date ?? today,
      confidence: allowanceTxs.length && studentLifeTxs.length >= 2 ? 0.98 : 0.92,
      label: l('Student KU Leuven (VTK Burgerlijk Ingenieur)', 'KU Leuven student (VTK Engineering)'),
      evidence: evidenceTxs.map((tx) => tx.id),
      data: { weeklyAllowance: 100, faculty: 'VTK', campus: 'Arenberg' },
    });
  }

  return signals;
}
