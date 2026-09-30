import { ASSUMPTIONS as A, roundTo } from '../assumptions';
import { addDays, daysBetween } from '../dates';
import { euroL, formatDateL, formatNumber, l } from '../format';
import type { Insight, Scenario } from '../types';
import type { Detector, DetectorContext } from './context';
import { line, list, pct, perYear, pricePer, tonnes, txEvidence, unit, years } from './copy';

/**
 * The energy detectors. This is where the demo goes deep: each one starts
 * from a moment the customer just lived through (a move, an oil delivery, a
 * garage bill) and answers the one question that moment raises.
 */

/** Yearly electricity use, estimated from the monthly advance. */
function electricityUse(ctx: DetectorContext) {
  const stream = ctx.streams.find((s) => s.category === 'electricity' && s.active && s.cadence === 'monthly');
  if (!stream) return { kwh: 3_500, stream: undefined, estimated: true };
  const annual = stream.lastAmount * 12;
  const kwh = Math.max(1_500, (annual - A.electricity.fixedPerYear) / A.electricity.pricePerKwh);
  return { kwh: roundTo(kwh, 100), stream, estimated: false };
}

function solarNumbers(kwh: number, selfConsumption: number) {
  const kwp = Math.min(A.solar.maxKwp, Math.max(A.solar.minKwp, roundTo(kwh / A.solar.yieldPerKwp, 0.5)));
  const production = kwp * A.solar.yieldPerKwp;
  const selfUsed = production * selfConsumption;
  const injected = production - selfUsed;
  const saving = selfUsed * A.electricity.pricePerKwh + injected * A.electricity.injectionPerKwh;
  const cost = kwp * A.solar.costPerKwp;
  return { kwp, production, selfUsed, injected, saving, cost, co2: production * A.electricity.co2PerKwh };
}

export const solar: Detector = (ctx) => {
  const owner = ctx.signal('homeowner');
  const moved = ctx.signal('moved');
  if (ctx.signal('has_solar')) {
    return { type: 'solar', reason: l('Er komt al teruglevering van zonnepanelen binnen.', 'Solar injection refunds are already coming in.') };
  }
  if (!owner) {
    return { type: 'solar', reason: l('Geen eigen woning gevonden: over het dak beslist de verhuurder.', 'No owned home found: the landlord decides about the roof.') };
  }

  const purchase = ctx.signal('home_purchase');
  if (purchase && !moved && daysBetween(purchase.date, ctx.today) < 120) {
    return { type: 'solar', reason: l('Net een woning gekocht: Kate wacht tot je er woont.', 'Just bought a home: Kate waits until you live there.') };
  }

  const use = electricityUse(ctx);
  const base = solarNumbers(use.kwh, A.solar.selfConsumption);
  const oil = ctx.signal('heating_oil');
  const trigger = moved?.date ?? use.stream?.firstDate ?? owner.date;
  const supplier = use.stream ? l(use.stream.name, use.stream.name) : l('je leverancier', 'your supplier');

  const scenarios: Scenario[] = [
    {
      id: 'base',
      label: l('Enkel zonnepanelen', 'Solar panels only'),
      annualSaving: roundTo(base.saving, 10),
      upfrontCost: roundTo(base.cost, 100),
      co2SavedKg: Math.round(base.co2),
    },
  ];
  const battery = solarNumbers(use.kwh, A.solar.selfConsumptionWithBattery);
  scenarios.push({
    id: 'battery',
    label: l('Met thuisbatterij', 'With a home battery'),
    annualSaving: roundTo(battery.saving, 10),
    upfrontCost: roundTo(battery.cost + A.solar.batteryCost, 100),
    co2SavedKg: Math.round(battery.co2),
    note: l(
      `Je verbruikt ${Math.round(A.solar.selfConsumptionWithBattery * 100)}% van je eigen stroom in plaats van ${Math.round(A.solar.selfConsumption * 100)}%.`,
      `You use ${Math.round(A.solar.selfConsumptionWithBattery * 100)}% of your own power instead of ${Math.round(A.solar.selfConsumption * 100)}%.`,
    ),
  });
  if (oil) {
    const hp = solarNumbers(use.kwh, A.solar.selfConsumptionWithHeatPump);
    scenarios.push({
      id: 'heat_pump',
      label: l('Samen met een warmtepomp', 'Together with a heat pump'),
      annualSaving: roundTo(hp.saving, 10),
      upfrontCost: roundTo(hp.cost, 100),
      co2SavedKg: Math.round(hp.co2),
      note: l('Een warmtepomp gebruikt je zonnestroom overdag, dus minder gaat naar het net.', 'A heat pump uses your solar power during the day, so less goes to the grid.'),
    });
  }

  const saving = roundTo(base.saving, 10);
  const conf = (moved?.confidence ?? 0.7) * owner.confidence * (use.estimated ? 0.8 : 1);
  const evidence = [
    ...(moved ? moved.evidence.slice(0, 2) : []),
    ...(use.stream ? use.stream.transactionIds.slice(-1) : []),
  ]
    .map((id) => ctx.tx(id))
    .filter((tx) => tx !== undefined)
    .map((tx) => txEvidence(tx));

  return {
    id: `solar:${trigger}`,
    type: 'solar',
    domain: 'energy',
    title: moved ? l('Zonnepanelen op je nieuwe dak?', 'Solar panels on your new roof?') : l('Zonnepanelen op je dak?', 'Solar panels on your roof?'),
    summary: l(
      `Op basis van je voorschot bij ${supplier.nl} verbruik je zo'n ${unit(use.kwh, 'kWh').nl} per jaar. Een installatie van ${unit(base.kwp, 'kWp', 'kWp', 1).nl} bespaart je ongeveer ${euroL(saving).nl} per jaar.`,
      `Based on your ${supplier.en} advance you use about ${unit(use.kwh, 'kWh').en} a year. A ${unit(base.kwp, 'kWp', 'kWp', 1).en} installation saves you about ${euroL(saving).en} a year.`,
    ),
    teaser: l(`Je nieuwe dak kan je zo'n ${euroL(saving).nl} per jaar opleveren.`, `Your new roof could earn you about ${euroL(saving).en} a year.`),
    annualValue: saving,
    upfrontCost: roundTo(base.cost, 100),
    paybackYears: base.cost / base.saving,
    co2SavedKg: Math.round(base.co2),
    confidence: conf,
    triggeredAt: trigger,
    trigger: moved
      ? l(`Je verhuisde rond ${formatDateL(moved.date).nl}. De dozen zijn uitgepakt; nu is er tijd om vooruit te kijken.`, `You moved around ${formatDateL(moved.date).en}. The boxes are unpacked; now there is time to look ahead.`)
      : l('Je energievoorschot is hoog genoeg om zonnepanelen snel terug te verdienen.', 'Your energy advance is high enough for panels to pay back quickly.'),
    evidence,
    reasons: [
      ...(moved ? [l('Je betaalde een verhuisfirma en een notarisakte: je woont sinds kort in een eigen woning.', 'You paid a mover and a notary deed: you recently moved into a home you own.')] : []),
      ...(use.stream
        ? [l(`Je betaalt ${euroL(use.stream.lastAmount).nl} per maand voorschot aan ${use.stream.name}.`, `You pay a ${euroL(use.stream.lastAmount).en} monthly advance to ${use.stream.name}.`)]
        : []),
      l('Er komt geen teruglevering van zonnepanelen op je rekening binnen.', 'No solar injection refunds arrive on your account.'),
    ],
    breakdown: [
      line('Geschat verbruik', 'Estimated use', unit(use.kwh, 'kWh per jaar', 'kWh a year')),
      line('Voorgestelde installatie', 'Suggested installation', unit(base.kwp, 'kWp', 'kWp', 1)),
      line('Productie', 'Production', unit(base.production, 'kWh per jaar', 'kWh a year')),
      line(
        `Zelf verbruikt (${Math.round(A.solar.selfConsumption * 100)}%)`,
        `Used yourself (${Math.round(A.solar.selfConsumption * 100)}%)`,
        euroL(base.selfUsed * A.electricity.pricePerKwh),
      ),
      line('Teruggeleverd aan het net', 'Injected into the grid', euroL(base.injected * A.electricity.injectionPerKwh)),
      line('Besparing', 'Saving', perYear(saving), true),
      line('Investering', 'Investment', euroL(roundTo(base.cost, 100))),
      line('Terugverdiend na', 'Pays back in', years(base.cost / base.saving)),
    ],
    assumptions: [
      line('Stroomprijs', 'Electricity price', pricePer(A.electricity.pricePerKwh, 'kWh')),
      line('Vaste kosten op je factuur', 'Fixed part of your bill', perYear(A.electricity.fixedPerYear)),
      line('Terugleververgoeding', 'Injection tariff', pricePer(A.electricity.injectionPerKwh, 'kWh')),
      line('Opbrengst', 'Yield', unit(A.solar.yieldPerKwp, 'kWh per kWp')),
      line('Prijs', 'Price', pricePer(A.solar.costPerKwp, 'kWp')),
    ],
    scenarios,
    actions: [
      { kind: 'simulate', label: l('Simuleer je installatie', 'Simulate your installation'), target: 'scenarios' },
      { kind: 'product', label: l('Bereken je energielening', 'Calculate your energy loan'), target: 'energy_loan' },
    ],
  };
};

export const heatPump: Detector = (ctx) => {
  const oil = ctx.signal('heating_oil');
  if (!oil) return null;
  if (ctx.signal('renter')) {
    return { type: 'heat_pump', reason: l('Je huurt: over de verwarming beslist de eigenaar.', 'You rent: the owner decides about heating.') };
  }

  const lastAmount = Number(oil.data.lastAmount);
  const deliveries = Number(oil.data.deliveries);
  const knownLitres = Number(oil.data.litres);
  const spend = Number(oil.data.spend);
  const litres = knownLitres > 0 ? knownLitres : spend / A.heatingOil.pricePerLitre;
  const pricePerLitre = knownLitres > 0 ? spend / knownLitres : A.heatingOil.pricePerLitre;

  const oilCost = litres * pricePerLitre;
  const heat = litres * A.heatingOil.kwhPerLitre * A.heatingOil.boilerEfficiency;
  const hpKwh = heat / A.heatPump.scop;
  const hpCost = hpKwh * A.electricity.pricePerKwh;
  const saving = oilCost + A.heatingOil.maintenancePerYear - hpCost - A.heatPump.maintenancePerYear;
  const co2 = litres * A.heatingOil.co2PerLitre - hpKwh * A.electricity.co2PerKwh;
  const rounded = roundTo(saving, 10);

  const withSolar = saving + hpKwh * A.heatPump.solarCoverage * (A.electricity.pricePerKwh - A.electricity.injectionPerKwh);
  const scenarios: Scenario[] = [
    { id: 'base', label: l('Lucht-waterwarmtepomp', 'Air-to-water heat pump'), annualSaving: rounded, upfrontCost: A.heatPump.cost, co2SavedKg: Math.round(co2) },
  ];
  if (!ctx.signal('has_solar')) {
    scenarios.push({
      id: 'solar',
      label: l('Met zonnepanelen erbij', 'Add solar panels'),
      annualSaving: roundTo(withSolar, 10),
      upfrontCost: A.heatPump.cost,
      co2SavedKg: Math.round(co2 + hpKwh * A.heatPump.solarCoverage * A.electricity.co2PerKwh),
      note: l(
        `Zo'n ${Math.round(A.heatPump.solarCoverage * 100)}% van de stroom voor je warmtepomp komt dan van je eigen dak. Exclusief de kost van de panelen.`,
        `About ${Math.round(A.heatPump.solarCoverage * 100)}% of the heat pump's power then comes from your own roof. Excluding the cost of the panels.`,
      ),
    });
  }

  const delivery = ctx.tx(oil.evidence[0]);
  const litresL = unit(Math.round(litres), 'liter', 'litres');

  return {
    id: `heat_pump:${oil.date}`,
    type: 'heat_pump',
    domain: 'energy',
    title: l('Net mazout laten leveren?', 'Just had heating oil delivered?'),
    summary: l(
      `Je betaalde ${euroL(lastAmount).nl} voor je laatste levering. Met een warmtepomp kost dezelfde warmte je ongeveer ${euroL(hpCost).nl} per jaar aan stroom, en stoot je ${tonnes(co2).nl} minder CO₂ uit.`,
      `You paid ${euroL(lastAmount).en} for your last delivery. With a heat pump the same heat costs about ${euroL(hpCost).en} a year in electricity, and you emit ${tonnes(co2).en} less CO₂.`,
    ),
    teaser: l(`Een warmtepomp kan je zo'n ${euroL(rounded).nl} per jaar besparen.`, `A heat pump could save you about ${euroL(rounded).en} a year.`),
    annualValue: rounded,
    upfrontCost: A.heatPump.cost,
    paybackYears: A.heatPump.cost / saving,
    co2SavedKg: Math.round(co2),
    confidence: oil.confidence * (deliveries > 1 ? 1 : 0.85),
    triggeredAt: oil.date,
    trigger: l(
      `Je liet op ${formatDateL(oil.date).nl} mazout leveren. Zo'n factuur is het moment om te vergelijken.`,
      `You had oil delivered on ${formatDateL(oil.date).en}. A bill like that is the moment to compare.`,
    ),
    evidence: delivery ? [txEvidence(delivery)] : [],
    reasons: [
      l(`Je betaalde ${euroL(lastAmount).nl} aan ${delivery?.merchantName ?? 'een mazoutleverancier'}.`, `You paid ${euroL(lastAmount).en} to ${delivery?.merchantName ?? 'a heating oil supplier'}.`),
      deliveries > 1
        ? l(`Dat is je ${deliveries}e levering in twaalf maanden: samen ${litresL.nl}.`, `That is delivery number ${deliveries} in twelve months: ${litresL.en} in total.`)
        : l(`We rekenen met één levering per jaar (${litresL.nl}).`, `We assume one delivery a year (${litresL.en}).`),
      ...(ctx.signal('home_purchase') ? [l('Je kocht de woning recent, dus de verwarming is nu jouw keuze.', 'You recently bought the home, so the heating is now your call.')] : []),
      l('Premies en een energielening verlagen de instapkost.', 'Grants and an energy loan lower the upfront cost.'),
    ],
    breakdown: [
      line('Mazout per jaar', 'Oil per year', litresL),
      line('Kost mazout', 'Oil cost', euroL(oilCost)),
      line('Onderhoud ketel en tank', 'Boiler and tank upkeep', euroL(A.heatingOil.maintenancePerYear)),
      line('Warmtevraag', 'Heat demand', unit(roundTo(heat, 100), 'kWh')),
      {
        label: l(`Stroom voor warmtepomp (SCOP ${formatNumber(A.heatPump.scop, 'nl', 1)})`, `Power for heat pump (SCOP ${formatNumber(A.heatPump.scop, 'en', 1)})`),
        value: unit(roundTo(hpKwh, 10), 'kWh'),
      },
      line('Kost stroom', 'Electricity cost', euroL(hpCost)),
      line('Onderhoud warmtepomp', 'Heat pump upkeep', euroL(A.heatPump.maintenancePerYear)),
      line('Besparing', 'Saving', perYear(rounded), true),
      line('Minder CO₂', 'Less CO₂', tonnes(co2)),
    ],
    assumptions: [
      line('Mazoutprijs', 'Oil price', pricePer(pricePerLitre, 'liter')),
      line('Rendement ketel', 'Boiler efficiency', pct(A.heatingOil.boilerEfficiency)),
      line('Stroomprijs', 'Electricity price', pricePer(A.electricity.pricePerKwh, 'kWh')),
      line('Installatie, voor premies', 'Installation, before grants', euroL(A.heatPump.cost)),
    ],
    scenarios,
    actions: [
      { kind: 'simulate', label: l('Vergelijk scenario\'s', 'Compare scenarios'), target: 'scenarios' },
      { kind: 'product', label: l('Bereken je energielening', 'Calculate your energy loan'), target: 'energy_loan' },
    ],
  };
};

export const renovation: Detector = (ctx) => {
  const purchase = ctx.signal('home_purchase');
  const oil = ctx.signal('heating_oil');
  if (!purchase || !oil || daysBetween(purchase.date, ctx.today) > 5 * 365) return null;
  const deadline = addDays(purchase.date, 5 * 365);
  const deed = ctx.tx(purchase.evidence[0]);

  return {
    id: `renovation:${purchase.date}`,
    type: 'renovation',
    domain: 'energy',
    title: l('Ken je het EPC-label van je woning?', 'Do you know your home\'s EPC label?'),
    summary: l(
      `Wie sinds 2023 in Vlaanderen een woning met EPC-label E of F koopt, moet ze binnen vijf jaar renoveren tot minstens label D. Een woning op mazout heeft vaak zo'n label.`,
      `Since 2023, anyone in Flanders who buys a home with EPC label E or F must renovate it to at least label D within five years. Homes heated with oil often have such a label.`,
    ),
    teaser: l('Een renovatieplan nu vermijdt haast later.', 'A renovation plan now avoids a rush later.'),
    confidence: 0.55,
    triggeredAt: oil.date,
    trigger: l('Je kocht een woning en ze blijkt op mazout te verwarmen.', 'You bought a home and it turns out to heat with oil.'),
    evidence: [deed, ctx.tx(oil.evidence[0])].filter((tx) => tx !== undefined).map((tx) => txEvidence(tx)),
    reasons: [
      l(`Je notarisakte dateert van ${formatDateL(purchase.date, true).nl}.`, `Your notary deed is dated ${formatDateL(purchase.date, true).en}.`),
      l('Je verwarmt met mazout, wat vaak op een oudere woning wijst.', 'You heat with oil, which often points to an older home.'),
      l('We kennen je EPC-label niet, dus dit is een vraag en geen conclusie.', 'We do not know your EPC label, so this is a question, not a conclusion.'),
    ],
    breakdown: [
      line('Aankoop', 'Purchase', formatDateL(purchase.date, true)),
      line('Renovatie klaar tegen', 'Renovation due by', formatDateL(deadline, true), true),
      line('Nog', 'Time left', years(daysBetween(ctx.today, deadline) / 365)),
    ],
    assumptions: [line('Regel', 'Rule', l('Vlaamse renovatieverplichting', 'Flemish renovation obligation'))],
    actions: [
      { kind: 'learn', label: l('Wat houdt de renovatieplicht in?', 'What does the obligation mean?'), target: 'renovation_info' },
      { kind: 'product', label: l('Bereken je energielening', 'Calculate your energy loan'), target: 'energy_loan' },
    ],
  };
};

export const evSwitch: Detector = (ctx) => {
  if (ctx.signal('ev_driver')) {
    return { type: 'ev_switch', reason: l('Rijdt al elektrisch.', 'Already drives electric.') };
  }
  const petrol = ctx.signal('petrol_driver');
  if (!petrol) return null;
  const repair = ctx.signal('car_repair');
  const homeCharging = !!ctx.signal('homeowner');

  const fuelYear = Number(petrol.data.monthlyFuel) * 12;
  const litres = fuelYear / A.mobility.petrolPerLitre;
  const km = (litres / A.mobility.litresPer100km) * 100;
  const kwh = (km / 100) * A.mobility.evKwhPer100km;
  const price = homeCharging ? A.electricity.pricePerKwh : A.mobility.publicChargingPerKwh;
  const evCost = kwh * price;
  const saving = roundTo(fuelYear - evCost + A.mobility.evMaintenanceSaving, 10);
  const co2 = litres * A.mobility.co2PerLitrePetrol - kwh * A.electricity.co2PerKwh;
  const repairTx = repair ? ctx.tx(repair.evidence[0]) : undefined;

  return {
    id: `ev_switch:${repair?.date ?? 'fuel'}`,
    type: 'ev_switch',
    domain: 'energy',
    title: repair ? l('Die garagefactuur deed pijn', 'That garage bill hurt') : l('Wat kost je auto je echt?', 'What does your car really cost?'),
    summary: l(
      `Je tankt zo'n ${euroL(fuelYear / 12).nl} per maand, goed voor ongeveer ${unit(roundTo(km, 500), 'km').nl} per jaar. Elektrisch kost dezelfde afstand je ${euroL(evCost).nl} aan stroom${homeCharging ? '' : ', ook zonder laadpaal thuis'}.`,
      `You spend about ${euroL(fuelYear / 12).en} a month on fuel, roughly ${unit(roundTo(km, 500), 'km').en} a year. Driving electric, the same distance costs ${euroL(evCost).en} in power${homeCharging ? '' : ', even without a home charger'}.`,
    ),
    teaser: l(`Elektrisch rijden kan je zo'n ${euroL(saving).nl} per jaar besparen.`, `Driving electric could save you about ${euroL(saving).en} a year.`),
    annualValue: saving,
    co2SavedKg: Math.round(co2),
    confidence: petrol.confidence * 0.85,
    triggeredAt: repair?.date ?? petrol.date,
    trigger: repair
      ? l(`Je betaalde ${euroL(Number(repair.data.amount)).nl} aan de garage. Wie herstelt, twijfelt vaak over vervangen.`, `You paid ${euroL(Number(repair.data.amount)).en} at the garage. People who repair often wonder about replacing.`)
      : l('Je brandstofkosten liggen al maanden hoog.', 'Your fuel costs have been high for months.'),
    evidence: [
      ...(repairTx ? [txEvidence(repairTx)] : []),
      ...petrol.evidence.slice(-2).map((id) => ctx.tx(id)).filter((tx) => tx !== undefined).map((tx) => txEvidence(tx)),
    ],
    reasons: [
      l(`Je tankte de voorbije zes maanden gemiddeld ${euroL(fuelYear / 12).nl} per maand.`, `Over the past six months you spent an average of ${euroL(fuelYear / 12).en} a month on fuel.`),
      ...(repair ? [l('Je had net een grote herstelling aan je wagen.', 'Your car just needed a large repair.')] : []),
      homeCharging
        ? l('Je hebt een eigen woning, dus thuis laden kan.', 'You own your home, so charging at home is possible.')
        : l('Je huurt, dus we rekenen met publiek laden.', 'You rent, so we assume public charging.'),
    ],
    breakdown: [
      line('Brandstof per jaar', 'Fuel per year', euroL(fuelYear)),
      line('Geschatte afstand', 'Estimated distance', unit(roundTo(km, 500), 'km')),
      line('Stroom voor dezelfde afstand', 'Power for the same distance', unit(roundTo(kwh, 10), 'kWh')),
      line('Kost stroom', 'Electricity cost', euroL(evCost)),
      line('Minder onderhoud', 'Lower servicing', euroL(A.mobility.evMaintenanceSaving)),
      line('Besparing', 'Saving', perYear(saving), true),
      line('Minder CO₂', 'Less CO₂', tonnes(co2)),
    ],
    assumptions: [
      line('Benzineprijs', 'Petrol price', pricePer(A.mobility.petrolPerLitre, 'liter')),
      line('Verbruik benzine', 'Petrol consumption', unit(A.mobility.litresPer100km, 'l/100 km', 'l/100 km', 1)),
      line('Verbruik elektrisch', 'EV consumption', unit(A.mobility.evKwhPer100km, 'kWh/100 km')),
      line('Laadprijs', 'Charging price', pricePer(price, 'kWh')),
    ],
    actions: [
      { kind: 'product', label: l('Simuleer een autolening', 'Simulate a car loan'), target: 'car_loan' },
      { kind: 'learn', label: l('Vergelijk elektrische modellen', 'Compare electric models'), target: 'ev_info' },
    ],
  };
};

export const homeCharging: Detector = (ctx) => {
  const ev = ctx.signal('ev_driver');
  if (!ev) return null;
  if (!ctx.signal('homeowner')) {
    return { type: 'home_charging', reason: l('Je huurt: een laadpaal hangt af van je verhuurder.', 'You rent: a charger depends on your landlord.') };
  }
  const hasSolar = !!ctx.signal('has_solar');
  const annual = Number(ev.data.monthlyCharging) * 12;
  const kwh = annual / A.mobility.publicChargingObserved;
  // With panels, part of the charging runs on power that would otherwise be injected for 4 cents.
  const solarShare = hasSolar ? 0.35 : 0;
  const homeCost = kwh * (1 - solarShare) * A.electricity.pricePerKwh + kwh * solarShare * A.electricity.injectionPerKwh;
  const saving = roundTo(annual - homeCost, 10);

  return {
    id: 'home_charging',
    type: 'home_charging',
    domain: 'energy',
    title: hasSolar ? l('Laad je wagen met je eigen zonnestroom', 'Charge your car with your own solar power') : l('Thuis laden is de helft goedkoper', 'Charging at home costs half'),
    summary: l(
      `Je betaalde de voorbije maanden zo'n ${euroL(annual / 12).nl} per maand aan publieke laadpalen. Thuis laden${hasSolar ? ' met je zonnepanelen' : ''} kost voor dezelfde stroom ongeveer ${euroL(homeCost).nl} per jaar.`,
      `You spent about ${euroL(annual / 12).en} a month at public chargers lately. Charging at home${hasSolar ? ' with your panels' : ''} costs about ${euroL(homeCost).en} a year for the same power.`,
    ),
    teaser: l(`Een laadpaal thuis bespaart je zo'n ${euroL(saving).nl} per jaar.`, `A home charger saves you about ${euroL(saving).en} a year.`),
    annualValue: saving,
    upfrontCost: A.mobility.homeChargerCost,
    paybackYears: A.mobility.homeChargerCost / saving,
    confidence: ev.confidence,
    triggeredAt: ev.date,
    trigger: l('Je laadt sinds enkele maanden aan publieke laadpalen.', 'You have been charging at public chargers for a few months.'),
    evidence: ev.evidence.map((id) => ctx.tx(id)).filter((tx) => tx !== undefined).map((tx) => txEvidence(tx)),
    reasons: [
      l(`Je betaalt geregeld aan ${list([...new Set(ev.evidence.map((id) => ctx.tx(id)?.merchantName ?? ''))].filter(Boolean)).nl}.`, `You regularly pay ${list([...new Set(ev.evidence.map((id) => ctx.tx(id)?.merchantName ?? ''))].filter(Boolean)).en}.`),
      l('Je hebt een eigen woning, dus een laadpaal kan.', 'You own your home, so a charger is possible.'),
      ...(hasSolar ? [l('Je zonnepanelen leveren overdag stroom terug voor amper 4 cent.', 'Your panels inject daytime power for barely 4 cents.')] : []),
    ],
    breakdown: [
      line('Publiek laden per jaar', 'Public charging per year', euroL(annual)),
      line('Stroom', 'Energy', unit(roundTo(kwh, 10), 'kWh')),
      line('Thuis laden', 'Charging at home', euroL(homeCost)),
      line('Besparing', 'Saving', perYear(saving), true),
      line('Laadpaal', 'Charger', euroL(A.mobility.homeChargerCost)),
      line('Terugverdiend na', 'Pays back in', years(A.mobility.homeChargerCost / saving)),
    ],
    assumptions: [
      line('Publieke laadprijs', 'Public charging price', pricePer(A.mobility.publicChargingObserved, 'kWh')),
      line('Stroomprijs thuis', 'Home electricity price', pricePer(A.electricity.pricePerKwh, 'kWh')),
      ...(hasSolar ? [line('Deel op zonnestroom', 'Share on solar power', pct(solarShare))] : []),
    ],
    actions: [{ kind: 'product', label: l('Financier je laadpaal', 'Finance your charger'), target: 'energy_loan' }],
  };
};

export const energyContract: Detector = (ctx) => {
  const up = ctx.signal('energy_advance_up');
  const settlement = ctx.signal('energy_settlement');
  if (!up && !settlement) return null;
  const streams = ctx.streams.filter((s) => (s.category === 'electricity' || s.category === 'gas') && s.active && s.cadence === 'monthly');
  const annual = streams.reduce((s, x) => s + x.lastAmount * 12, 0) + (settlement ? Number(settlement.data.amount) : 0);
  const saving = roundTo(annual * A.energyContract.switchSaving, 10);
  const trigger = settlement ?? up!;
  const txs = trigger.evidence.map((id) => ctx.tx(id)).filter((tx) => tx !== undefined);
  const names = [...new Set(streams.map((s) => s.name))];

  return {
    id: `energy_contract:${trigger.date}`,
    type: 'energy_contract',
    domain: 'energy',
    title: settlement ? l('Je jaarafrekening is binnen', 'Your annual energy bill is in') : l('Je energievoorschot steeg', 'Your energy advance went up'),
    summary: l(
      `Je betaalt ${euroL(annual).nl} per jaar aan ${list(names).nl}. Vergelijk je contract in de V-test van de VREG: gelijkaardige gezinnen besparen zo tot ${euroL(saving).nl} per jaar.`,
      `You pay ${euroL(annual).en} a year to ${list(names).en}. Compare your contract in the VREG V-test: similar households save up to ${euroL(saving).en} a year.`,
    ),
    teaser: l(`Een ander energiecontract kan je tot ${euroL(saving).nl} per jaar besparen.`, `Another energy contract could save you up to ${euroL(saving).en} a year.`),
    annualValue: saving,
    confidence: 0.75,
    triggeredAt: trigger.date,
    trigger: trigger.label,
    evidence: txs.map((tx) => txEvidence(tx)),
    reasons: [
      trigger.label,
      l('Energieprijzen verschillen sterk tussen leveranciers en contracten.', 'Energy prices differ a lot between suppliers and contracts.'),
      l('Veranderen is gratis en je stroom valt nooit uit.', 'Switching is free and your power never goes out.'),
    ],
    breakdown: [
      line('Je energiekosten', 'Your energy costs', perYear(annual)),
      line('Typisch verschil met goedkoopste contract', 'Typical gap to cheapest contract', pct(A.energyContract.switchSaving)),
      line('Mogelijke besparing', 'Possible saving', perYear(saving), true),
    ],
    assumptions: [line('Bron', 'Source', l('Gemiddelde besparing bij overstap (VREG)', 'Average switching saving (VREG)'))],
    actions: [{ kind: 'learn', label: l('Open de V-test', 'Open the V-test'), target: 'vtest' }],
  };
};

export const ENERGY_DETECTORS = [solar, heatPump, renovation, evSwitch, homeCharging, energyContract];

export type { Insight };
