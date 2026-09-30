import { l } from '../format';
import type { ISODate, L10n, Transaction } from '../types';
import { Ledger, MONTH_TAG } from './ledger';

/**
 * Three customers for the demo. Their data is synthetic, but it is shaped the
 * way a real current account looks: salary, fixed costs, groceries and the
 * few moments in a year that actually change something.
 */

export type PersonaId = 'sarah' | 'tom' | 'janssens';

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

const BUILDERS: Record<PersonaId, (anchor: ISODate) => PersonaData> = { sarah, tom, janssens };

export function buildPersona(id: PersonaId, anchor: ISODate): PersonaData {
  return BUILDERS[id](anchor);
}

export const PERSONA_IDS: PersonaId[] = ['sarah', 'tom', 'janssens'];

/** Turn a live event into a booked transaction on `date`. */
export function bookLiveEvent(persona: PersonaId, event: LiveEvent, date: ISODate): Transaction {
  return { ...event.transaction, id: `${persona}-live-${event.id}-${date}`, date };
}
