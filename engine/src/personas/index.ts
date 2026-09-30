import { l } from '../format';
import type { ISODate, L10n, Transaction } from '../types';
import { Ledger, MONTH_TAG } from './ledger';

/**
 * Three customers for the demo. Their data is synthetic, but it is shaped the
 * way a real current account looks: salary, fixed costs, groceries and the
 * few moments in a year that actually change something.
 */

export type PersonaId = 'sarah' | 'tom' | 'janssens' | 'jasper';

export interface Persona {
  id: PersonaId;
  name: string;
  firstName: string;
  initials: string;
  age: number;
  city: string;
  household: L10n;
  /** One line for the persona picker. */
  tagline: L10n;
  /** A few sentences for the demo website. */
  story: L10n;
  accountName: string;
  iban: string;
  savingsIban: string;
  savingsBalance: number;
  /** Current-account balance "today", before any live event. */
  balance: number;
}

/** A transaction the presenter can make happen during the demo. */
export interface LiveEvent {
  id: string;
  label: L10n;
  /** What the audience should notice. */
  hint: L10n;
  transaction: Omit<Transaction, 'id' | 'date'>;
}

export interface PersonaData {
  persona: Persona;
  history: Transaction[];
  openingBalance: number;
  live: LiveEvent[];
}

export const PERSONAS: Record<PersonaId, Persona> = {
  sarah: {
    id: 'sarah',
    name: 'Sarah Peeters',
    firstName: 'Sarah',
    initials: 'SP',
    age: 34,
    city: 'Mechelen',
    household: l('Alleenstaand, net verhuisd', 'Single, just moved'),
    tagline: l('Kocht een oudere woning in Mechelen', 'Bought an older house in Mechelen'),
    story: l(
      'Sarah huurde een appartement in Antwerpen en kocht deze zomer een rijhuis uit de jaren 60 in Mechelen. Ze betaalde een notaris en een verhuisfirma, kocht meubels en koos een nieuwe energieleverancier. Ze heeft KBC nooit iets verteld over haar verhuis.',
      'Sarah rented a flat in Antwerp and bought a 1960s terraced house in Mechelen this summer. She paid a notary and a mover, bought furniture and picked a new energy supplier. She never told KBC anything about her move.',
    ),
    accountName: 'KBC-Plus Rekening',
    iban: 'BE21 7350 4412 8837',
    savingsIban: 'BE87 7350 4412 9041',
    savingsBalance: 18_420.16,
    balance: 2_847.33,
  },
  tom: {
    id: 'tom',
    name: 'Tom Claes',
    firstName: 'Tom',
    initials: 'TC',
    age: 27,
    city: 'Gent',
    household: l('Huurt een studio', 'Rents a studio'),
    tagline: l('Jonge starter met veel abonnementen', 'Young professional with many subscriptions'),
    story: l(
      'Tom werkt twee jaar als data-analist en huurt een studio in Gent. Hij pendelt met een oudere benzinewagen, stapelde streamingdiensten op en laat zijn geld op zijn zichtrekening staan.',
      'Tom has worked as a data analyst for two years and rents a studio in Ghent. He commutes in an older petrol car, has stacked up streaming services and leaves his money on his current account.',
    ),
    accountName: 'KBC-Plus Rekening',
    iban: 'BE44 7340 2291 6610',
    savingsIban: 'BE12 7340 2291 6751',
    savingsBalance: 3_210.0,
    balance: 14_212.8,
  },
  janssens: {
    id: 'janssens',
    name: 'Els Janssens',
    firstName: 'Els',
    initials: 'EJ',
    age: 41,
    city: 'Hasselt',
    household: l('Gezin met twee kinderen', 'Family with two children'),
    tagline: l('Gezin met zonnepanelen en een nieuwe EV', 'Family with solar panels and a new EV'),
    story: l(
      'Els en Koen wonen met hun twee kinderen in een woning met zonnepanelen. Sinds de lente rijden ze elektrisch, maar ze laden aan publieke laadpalen. Ze sparen al voor hun pensioen.',
      'Els and Koen live with their two children in a house with solar panels. They switched to an electric car in spring, but charge at public chargers. They already save for retirement.',
    ),
    accountName: 'KBC-Plus Rekening',
    iban: 'BE63 7310 8820 1145',
    savingsIban: 'BE09 7310 8820 1276',
    savingsBalance: 24_830.4,
    balance: 4_120.55,
  },
  jasper: {
    id: 'jasper',
    name: 'Jasper Vandenberghe',
    firstName: 'Jasper',
    initials: 'JV',
    age: 20,
    city: 'Leuven',
    household: l('Student op kot in Leuven', 'Student in dorm in Leuven'),
    tagline: l('Student met € 100 leefgeld per week', 'Student with €100 weekly allowance'),
    story: l(
      'Jasper studeert burgerlijk ingenieur in Leuven en krijgt elke week € 100 leefgeld van zijn ouders. Na een wilde nacht op de Oude Markt en een nachtelijke durum bij Snack De Nijl (€ 8,50) gaf hij in één nacht € 67 uit (67% van zijn weekbudget). Kate wekt hem met een vriendelijke wake-up call en toont hem hoe \'t ElixIr en andere fakbars zijn studentenbudget redden.',
      'Jasper studies engineering in Leuven and receives €100 weekly allowance from his parents. Following a wild night on the Oude Markt and a late-night durum at Snack De Nijl (€8.50), he spent €67 in a single night (67% of his weekly budget). Kate wakes him with a gentle wake-up call and shows how \'t ElixIr and other fakbars protect his student budget.',
    ),
    accountName: 'KBC-Jongerenrekening',
    iban: 'BE82 7330 1928 4421',
    savingsIban: 'BE55 7330 1928 4490',
    savingsBalance: 140.0,
    balance: 28.5,
  },
};

const GROCERIES = ['COLRUYT', 'DELHAIZE', 'ALDI', 'LIDL', 'CARREFOUR MARKET'];
const EATING = ['BRASSERIE DE KEYSER', 'CAFE LOCUS', 'FRITUUR ROYAL', 'BAKKERIJ VAN GOETHEM', 'PANOS', 'EXKI'];

function daily(led: Ledger, city: string, scale = 1) {
  led.scatter(1.8 * scale, 18, 115, GROCERIES.map((g) => `${g} ${city}`), (m) => `BETALING MET KBC-DEBETKAART ${m}`);
  led.scatter(0.9, 8, 62, EATING.map((e) => `${e} ${city}`), (m) => `BETALING MET KBC-DEBETKAART ${m}`);
  led.scatter(0.25, 15, 90, ['BOL.COM', 'ZALANDO', 'MEDIAMARKT'], (m) => `BETALING MET KBC-DEBETKAART ${m}`);
  led.scatter(0.12, 6, 38, [`APOTHEEK ${city}`], (m) => `BETALING MET KBC-DEBETKAART ${m}`);
}

function salary(led: Ledger, employer: string, amount: number, day = 25) {
  led.monthlyOnDay(day, amount, employer, (d) => `LOON ${MONTH_TAG(d)}`, 'transfer');
}

function finalise(led: Ledger, persona: Persona, live: LiveEvent[]): PersonaData {
  const history = led.sorted();
  const sum = history.reduce((s, tx) => s + tx.amount, 0);
  return {
    persona,
    history,
    openingBalance: Math.round((persona.balance - sum) * 100) / 100,
    live,
  };
}

function sarah(anchor: ISODate): PersonaData {
  const led = new Ledger('sarah', anchor);
  salary(led, 'ACME LOGISTICS NV', 3_184.5);
  led.monthlyOnDay(27, -200, 'SARAH PEETERS', 'NAAR SPAARREKENING', 'transfer');
  led.monthlyOnDay(5, -80, 'KBC PENSION FUND', 'PENSIOENSPAREN MAANDELIJKSE STORTING', 'direct_debit');

  // Before the move: renting in Antwerp, electricity at Engie.
  led.monthlyOnDay(1, -950, 'IMMO DE MEIR BV', 'HUUR APPARTEMENT KORTE GASTHUISSTRAAT 12 ANTWERPEN', 'transfer', { to: -98 });
  led.every(30.4, -78, 'ENGIE ELECTRABEL', 'VOORSCHOT ELEKTRICITEIT KLANT 5012334455', 'direct_debit', { from: -390, to: -88 });
  led.at(-52, -46.2, 'ENGIE ELECTRABEL', 'SLOTFACTUUR ELEKTRICITEIT KORTE GASTHUISSTRAAT 12', 'direct_debit');

  // The purchase and the move.
  led.at(-97, 9_000, 'SARAH PEETERS', 'EIGEN REKENING SPAARREKENING OVERDRACHT', 'transfer');
  led.at(-96, -9_840, 'NOTARISKANTOOR VAN DEN BROECK', 'AKTE AANKOOP WONING BOOMSESTEENWEG 214 MECHELEN KOSTEN EN REGISTRATIERECHTEN', 'transfer');
  led.at(-95, -412, 'KBC VERZEKERINGEN', 'BRANDVERZEKERING WONING POLIS 45.123.456', 'direct_debit');
  led.every(30.4, -1_184.32, 'KBC BANK NV', 'AFLOSSING WOONKREDIET 726-1234567-89', 'direct_debit', { from: -65 });
  led.every(30.4, -142, 'LUMINUS', 'VOORSCHOT ELEKTRICITEIT EAN 541448820056781234', 'direct_debit', { from: -90 });
  led.at(-82, -890, 'DE VOS VERHUIZINGEN BV', (d) => `VERHUIS ${d.slice(8, 10)}/${d.slice(5, 7)} ANTWERPEN MECHELEN FACTUUR 2026-0412`, 'transfer');
  led.at(-80, -1_249, 'IKEA WILRIJK', 'BETALING MET KBC-DEBETKAART IKEA WILRIJK', 'card');
  led.at(-77, -186.4, 'HUBO MECHELEN', 'BETALING MET KBC-DEBETKAART HUBO MECHELEN', 'card');
  led.at(-71, -342.75, 'BRICO PLANIT MECHELEN', 'BETALING MET KBC-DEBETKAART BRICO PLANIT', 'card');
  led.at(-58, -389, 'IKEA MECHELEN', 'BETALING MET KBC-DEBETKAART IKEA MECHELEN', 'card');
  led.at(-40, -61.8, 'DE WATERGROEP', 'VOORSCHOT WATER BOOMSESTEENWEG 214', 'direct_debit');

  // Subscriptions. Netflix just got more expensive.
  led.every(30.4, (_i, d) => (d >= led.date(-20) ? -15.99 : -13.99), 'NETFLIX.COM', 'NETFLIX.COM AMSTERDAM', 'card', { from: -385 });
  led.every(30.4, -10.99, 'DISNEY PLUS', 'DISNEY PLUS BETALING', 'card', { from: -380 });
  led.every(30.4, -13.95, 'STREAMZ BV', 'STREAMZ ABONNEMENT', 'card', { from: -300 });
  led.every(30.4, -12.99, 'SPOTIFY', 'SPOTIFY P2F3A8E1C4', 'card', { from: -392 });
  led.every(30.4, -79.5, 'TELENET BV', 'DOMICILIERING TELENET KLANT 7781223', 'direct_debit', { from: -388 });

  // Daily life, and a petrol car.
  led.scatter(0.55, 52, 74, ['Q8 MECHELEN', 'SHELL ANTWERPEN', 'TOTALENERGIES STATION BOOM'], (m) => `BETALING MET KBC-DEBETKAART ${m}`);
  daily(led, 'MECHELEN');
  led.scatter(0.2, 4, 25, ['NMBS'], () => 'NMBS TICKET MECHELEN');

  return finalise(led, PERSONAS.sarah, [
    {
      id: 'oil_delivery',
      label: l('Mazoutlevering, 1.500 liter', 'Heating oil delivery, 1,500 litres'),
      hint: l(
        'De eerste winter in het nieuwe huis. Kate reageert op de factuur, niet op een vraag.',
        'The first winter in the new house. Kate reacts to the bill, not to a question.',
      ),
      transaction: {
        amount: -1_575,
        counterparty: 'GABRIELS BRANDSTOFFEN NV',
        description: 'MAZOUT LEVERING 1500 L BOOMSESTEENWEG 214 FACTUUR 26/08812',
        channel: 'transfer',
      },
    },
  ]);
}

function tom(anchor: ISODate): PersonaData {
  const led = new Ledger('tom', anchor);
  salary(led, 'BRIGHT ANALYTICS BV', 2_780, 28);
  led.monthlyOnDay(1, -780, 'DE SMET JAN', 'HUUR STUDIO SINT-PIETERSNIEUWSTRAAT 88 GENT', 'transfer');

  // Electricity advance that jumped recently.
  led.every(30.4, (_i, d) => (d >= led.date(-45) ? -128 : -95), 'ENGIE ELECTRABEL', 'VOORSCHOT ELEKTRICITEIT KLANT 6120998877', 'direct_debit', { from: -375 });

  // The subscription stack.
  led.every(30.4, -15.99, 'NETFLIX.COM', 'NETFLIX.COM AMSTERDAM', 'card', { from: -392 });
  led.every(30.4, -13.95, 'STREAMZ BV', 'STREAMZ ABONNEMENT', 'card', { from: -330 });
  led.every(30.4, -9.99, 'HBO MAX', 'HBO MAX BELGIUM', 'card', { from: -210 });
  led.every(30.4, (i) => (i === 0 ? -1.99 : -10.99), 'DISNEY PLUS', 'DISNEY PLUS BETALING', 'card', { from: -70 });
  led.every(30.4, (_i, d) => (d >= led.date(-26) ? -12.99 : -11.99), 'SPOTIFY', 'SPOTIFY P1A77F02', 'card', { from: -380 });
  led.every(30.4, -2.99, 'APPLE.COM/BILL', 'APPLE.COM/BILL ICLOUD 50GB', 'card', { from: -390 });
  led.every(28, -29.99, 'BASIC-FIT BELGIUM', 'BASIC-FIT LIDMAATSCHAP', 'direct_debit', { from: -390 });
  led.every(30.4, -35, 'ORANGE BELGIUM', 'ORANGE BELGIUM GSM ABONNEMENT', 'direct_debit', { from: -385 });

  // Commuting by car, eating out.
  led.scatter(0.85, 44, 64, ['SHELL GENT', 'DATS 24 MERELBEKE', 'ESSO DRONGEN'], (m) => `BETALING MET KBC-DEBETKAART ${m}`);
  daily(led, 'GENT', 0.8);
  led.scatter(0.8, 14, 34, ['DELIVEROO', 'TAKEAWAY.COM'], (m) => `${m} BESTELLING`);

  return finalise(led, PERSONAS.tom, [
    {
      id: 'garage_bill',
      label: l('Garagefactuur, € 1.340', 'Garage bill, € 1,340'),
      hint: l(
        'Een dure herstelling is het moment waarop mensen over hun volgende auto nadenken.',
        'An expensive repair is the moment people start thinking about their next car.',
      ),
      transaction: {
        amount: -1_340,
        counterparty: 'GARAGE VERHAEGEN BV',
        description: 'ONDERHOUD EN DISTRIBUTIERIEM FACTUUR 8812',
        channel: 'transfer',
      },
    },
  ]);
}

function janssens(anchor: ISODate): PersonaData {
  const led = new Ledger('janssens', anchor);
  salary(led, 'JESSA ZIEKENHUIS VZW', 2_950, 26);
  salary(led, 'LIMBURGSE BOUWGROEP NV', 3_420, 28);
  led.monthlyOnDay(8, 342.6, 'FONS GROEIPAKKET', 'GROEIPAKKET 2 KINDEREN', 'transfer');
  led.monthlyOnDay(3, -980, 'KBC BANK NV', 'AFLOSSING WOONKREDIET 731-5566778-12', 'direct_debit');
  led.monthlyOnDay(5, -87.5, 'KBC PENSION FUND', 'PENSIOENSPAREN MAANDELIJKSE STORTING', 'direct_debit');
  led.monthlyOnDay(5, -87.5, 'KBC PENSION FUND', 'PENSIOENSPAREN KOEN MAANDELIJKSE STORTING', 'direct_debit');
  led.monthlyOnDay(10, -310, 'KINDEROPVANG DE BOLLEBOOS', 'KINDEROPVANG MAANDFACTUUR', 'direct_debit');
  led.monthlyOnDay(28, -400, 'ELS JANSSENS', 'NAAR SPAARREKENING', 'transfer');

  // Energy: gas heating, electricity, solar refunds every quarter.
  led.every(30.4, -85, 'ENGIE ELECTRABEL', 'VOORSCHOT ELEKTRICITEIT KLANT 7788001122', 'direct_debit', { from: -392 });
  led.every(30.4, -140, 'ENGIE ELECTRABEL', 'VOORSCHOT AARDGAS KLANT 7788001122', 'direct_debit', { from: -390 });
  led.every(91, (i) => 38 + i * 6, 'ENGIE ELECTRABEL', 'INJECTIEVERGOEDING ZONNEPANELEN', 'transfer', { from: -360 });

  // Petrol until spring, then an EV charged in public.
  led.scatter(0.6, 55, 80, ['TOTALENERGIES STATION HASSELT', 'Q8 GENK'], (m) => `BETALING MET KBC-DEBETKAART ${m}`, { to: -152 });
  led.scatter(1.3, 11, 34, ['ALLEGO', 'SHELL RECHARGE'], (m) => `${m} LAADSESSIE`, { from: -145 });

  led.every(30.4, -15.99, 'NETFLIX.COM', 'NETFLIX.COM AMSTERDAM', 'card', { from: -380 });
  led.every(30.4, -10.99, 'DISNEY PLUS', 'DISNEY PLUS BETALING', 'card', { from: -378 });
  led.every(30.4, -96, 'PROXIMUS', 'PROXIMUS FLEX DOMICILIERING', 'direct_debit', { from: -389 });
  daily(led, 'HASSELT', 1.8);
  led.scatter(0.2, 20, 60, ['SCHOOL SINT-JOZEF'], () => 'SCHOOL SINT-JOZEF SCHOOLREKENING');

  return finalise(led, PERSONAS.janssens, [
    {
      id: 'energy_settlement',
      label: l('Jaarafrekening Engie, € 486', 'Engie annual bill, € 486'),
      hint: l(
        'Bijbetalen voelt als verlies. Precies dan helpt een vergelijking het meest.',
        'Paying extra feels like a loss. That is exactly when a comparison helps most.',
      ),
      transaction: {
        amount: -486.2,
        counterparty: 'ENGIE ELECTRABEL',
        description: 'JAARAFREKENING ELEKTRICITEIT EN AARDGAS KLANT 7788001122',
        channel: 'direct_debit',
      },
    },
  ]);
}

function jasper(anchor: ISODate): PersonaData {
  const led = new Ledger('jasper', anchor);

  // Weekly allowance from parents: €100 every week
  led.every(7, 100, 'PAPA & MAMA VANDENBERGHE', 'ZAKGELD LEUVEN WEKELIJKSE BIJDRAGE', 'transfer', { from: -392, to: -2 });

  // Kot & student subscriptions
  led.every(30.4, -5.99, 'SPOTIFY', 'SPOTIFY STUDENT SUBSCRIPTION', 'card', { from: -380 });

  // Regular student life in Leuven
  led.scatter(0.25, 4.2, 6.2, ['ALMA 2 LEUVEN', 'ALMA 1 TIENSESTRAAT'], (m) => `BETALING MET KBC-DEBETKAART ${m}`);
  led.scatter(0.2, 5, 14, ['SPAR LEUVEN TIENSESTRAAT', 'ALDI LEUVEN'], (m) => `BETALING MET KBC-DEBETKAART ${m}`);
  led.scatter(0.08, 17, 17, ['DE LIJN'], () => 'DE LIJN 10-RITTENKAART LEUVEN');

  // Occasional student job / tutoring in the past
  led.at(-65, 85, 'KU LEUVEN MONITORING', 'STUDENTENJOB BEWAKING EXAMENS', 'transfer');

  // Historic fakbar nights (the budget-friendly student nights!)
  led.at(-8, -3.6, "FAKBAR 'T ELIXIR LEUVEN", "BETALING MET KBC-DEBETKAART FAKBAR 'T ELIXIR 3 PINTJES A €1.20", 'card');
  led.at(-16, -4.5, 'FAKBAR RECUP LEUVEN', 'BETALING MET KBC-DEBETKAART FAKBAR RECUP 3 STELLA A €1.50', 'card');
  led.at(-24, -6.0, "FAKBAR 'T ELIXIR LEUVEN", "BETALING MET KBC-DEBETKAART FAKBAR 'T ELIXIR 5 PINTJES A €1.20", 'card');

  // LAST NIGHT (-1 day): The big night out on Oude Markt & De Nijl totaling EXACTLY €67.00!
  led.at(-1, -24.0, 'CAFE BELGE OUDE MARKT', 'BETALING MET KBC-DEBETKAART CAFE BELGE OUDE MARKT 6 STELLA', 'card');
  led.at(-1, -20.0, 'DE VRIJHEID OUDE MARKT', 'BETALING MET KBC-DEBETKAART DE VRIJHEID OUDE MARKT 5 STELLA', 'card');
  led.at(-1, -14.5, 'BAR OUDE MARKT 28', 'BETALING MET KBC-DEBETKAART BAR OUDE MARKT 28 LEUVEN', 'card');
  led.at(-1, -8.5, 'SNACK DE NIJL LEUVEN', 'BETALING MET KBC-DEBETKAART SNACK DE NIJL NAAMSESTRAAT DURUM KEBAB', 'card');

  return finalise(led, PERSONAS.jasper, [
    {
      id: 'fakbar_night',
      label: l("Volgende avond: Fakbar 't ElixIr (€ 3,60)", "Next night: Fakbar 't ElixIr (€3.60)"),
      hint: l(
        "In 't ElixIr (de VTK-fakbar) betaal je maar € 1,20 per pintje i.p.v. € 4,00 op de Oude Markt.",
        "In 't ElixIr (the VTK fakbar) a beer is just €1.20 instead of €4.00 on the Oude Markt.",
      ),
      transaction: {
        amount: -3.6,
        counterparty: "FAKBAR 'T ELIXIR LEUVEN",
        description: "BETALING MET KBC-DEBETKAART FAKBAR 'T ELIXIR 3 PINTJES",
        channel: 'card',
      },
    },
  ]);
}

const BUILDERS: Record<PersonaId, (anchor: ISODate) => PersonaData> = { sarah, tom, janssens, jasper };

export function buildPersona(id: PersonaId, anchor: ISODate): PersonaData {
  return BUILDERS[id](anchor);
}

export const PERSONA_IDS: PersonaId[] = ['sarah', 'tom', 'janssens', 'jasper'];

/** Turn a live event into a booked transaction on `date`. */
export function bookLiveEvent(persona: PersonaId, event: LiveEvent, date: ISODate): Transaction {
  return { ...event.transaction, id: `${persona}-live-${event.id}-${date}`, date };
}
