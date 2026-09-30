/**
 * Deterministic synthetic transaction history (about 18 months, ending on the anchor date).
 * Seeded per persona so every run produces the same data. Amounts are integer cents.
 */
import { addDays, addMonths, clampDay, daysInMonth, diffDays, monthKey, monthsBetween, parseISO } from './dates';
import { euros } from './money';
import { PRNG } from './prng';
import type { Category, ISODate, Persona, PersonaId, RecurringItem, SubscriptionKind, Transaction } from './types';

export const HISTORY_DAYS = 548; // ~18 months

interface MerchantWeight {
  name: string;
  weight: number;
}

interface CategoryProfile {
  category: Category;
  /** Typical monthly total in euros. */
  monthly: number;
  /** Number of payments per month. */
  perMonth: number;
  merchants: MerchantWeight[];
  /** Relative standard deviation of a single payment (default 0.35). */
  sd?: number;
}

interface OneOff {
  daysAgo: number;
  merchant: string;
  category: Category;
  amount: number;
  description?: string;
  recurring?: boolean;
  subscriptionKind?: SubscriptionKind;
}

interface RecurringOverride {
  /** Item only exists from this many months ago (0 = this month). */
  startMonthsAgo?: number;
  /** Amount (euros, positive number for outflow) as a function of months ago. */
  amount?: (monthsAgo: number) => number;
}

interface Profile {
  categories: CategoryProfile[];
  /** Multiplier on a category's spend for a given month (0 = current month). */
  multiplier?: (category: Category, monthsAgo: number) => number;
  oneOffs: OneOff[];
  recurringOverrides?: Record<string, RecurringOverride>;
}

const GROCERY = [
  { name: 'Colruyt', weight: 5 },
  { name: 'Delhaize', weight: 4 },
  { name: 'Lidl', weight: 3 },
  { name: 'Aldi', weight: 2 },
  { name: 'Carrefour Express', weight: 1 },
];
const DELIVERY = [
  { name: 'Deliveroo', weight: 5 },
  { name: 'Uber Eats', weight: 3 },
  { name: 'Takeaway.com', weight: 2 },
];
const PHARMACY = [
  { name: 'Apotheek Multipharma', weight: 3 },
  { name: 'Apotheek Lloyds', weight: 1 },
];
const FUEL = [
  { name: 'TotalEnergies', weight: 3 },
  { name: 'Q8', weight: 2 },
  { name: 'Shell', weight: 1 },
];

const PROFILES: Record<PersonaId, Profile> = {
  lotte: {
    categories: [
      { category: 'boodschappen', monthly: 285, perMonth: 11, merchants: GROCERY },
      { category: 'maaltijdbezorging', monthly: 58, perMonth: 3, merchants: DELIVERY, sd: 0.25 },
      {
        category: 'restaurants',
        monthly: 115,
        perMonth: 4,
        merchants: [
          { name: 'Café Labath', weight: 2 },
          { name: 'Otomat Gent', weight: 2 },
          { name: 'Le Pain Quotidien', weight: 1 },
          { name: 'Frituur Jozef', weight: 2 },
          { name: 'Bar Bask', weight: 1 },
        ],
      },
      {
        category: 'vervoer',
        monthly: 78,
        perMonth: 5,
        merchants: [
          { name: 'NMBS', weight: 3 },
          { name: 'De Lijn', weight: 3 },
          { name: 'Dott', weight: 1 },
        ],
      },
      {
        category: 'shopping',
        monthly: 140,
        perMonth: 3,
        merchants: [
          { name: 'Zalando', weight: 3 },
          { name: 'H&M', weight: 2 },
          { name: 'Bol.com', weight: 2 },
          { name: 'Coolblue', weight: 1 },
          { name: 'IKEA', weight: 1 },
        ],
        sd: 0.5,
      },
      {
        category: 'vrije_tijd',
        monthly: 85,
        perMonth: 3,
        merchants: [
          { name: 'Kinepolis', weight: 2 },
          { name: 'Vooruit Gent', weight: 1 },
          { name: 'Standaard Boekhandel', weight: 1 },
          { name: 'Bol.com', weight: 1 },
        ],
      },
      { category: 'gezondheid', monthly: 28, perMonth: 1, merchants: PHARMACY },
      {
        category: 'overig',
        monthly: 35,
        perMonth: 1,
        merchants: [
          { name: 'Bpost', weight: 1 },
          { name: 'Kruidvat', weight: 2 },
          { name: 'Action', weight: 2 },
        ],
      },
    ],
    multiplier: (cat, monthsAgo) => {
      // Story: food delivery climbs sharply in the last two months.
      if (cat === 'maaltijdbezorging') {
        if (monthsAgo === 0) return 4.0;
        if (monthsAgo === 1) return 3.0;
      }
      return 1;
    },
    oneOffs: [
      { daysAgo: 1, merchant: 'Deliveroo', category: 'maaltijdbezorging', amount: 27.4 },
      { daysAgo: 2, merchant: 'Uber Eats', category: 'maaltijdbezorging', amount: 31.9 },
      { daysAgo: 4, merchant: 'Deliveroo', category: 'maaltijdbezorging', amount: 22.6 },
      { daysAgo: 95, merchant: 'Ryanair', category: 'reizen', amount: 138.5, description: 'Vlucht Barcelona' },
      { daysAgo: 92, merchant: 'Booking.com', category: 'reizen', amount: 412, description: 'Hotel Barcelona' },
      { daysAgo: 300, merchant: 'Sunweb', category: 'reizen', amount: 689, description: 'Skivakantie' },
      { daysAgo: 210, merchant: 'Fietsen De Geus', category: 'vervoer', amount: 185, description: 'Fietsherstelling' },
      { daysAgo: 40, merchant: 'Bol.com', category: 'shopping', amount: 64.9, description: 'Verjaardagscadeau' },
    ],
    recurringOverrides: {
      // Story: Streamz added two months ago (new subscription, third video service).
      streamz: { startMonthsAgo: 1 },
    },
  },
  'sam-noor': {
    categories: [
      { category: 'boodschappen', monthly: 680, perMonth: 14, merchants: GROCERY },
      { category: 'maaltijdbezorging', monthly: 45, perMonth: 2, merchants: DELIVERY },
      {
        category: 'restaurants',
        monthly: 140,
        perMonth: 3,
        merchants: [
          { name: 'Pizza Hut Mechelen', weight: 2 },
          { name: 'Brasserie De Vesten', weight: 1 },
          { name: 'Frituur Het Pleintje', weight: 3 },
          { name: 'Quick', weight: 1 },
        ],
      },
      { category: 'auto', monthly: 165, perMonth: 3, merchants: FUEL, sd: 0.2 },
      {
        category: 'vervoer',
        monthly: 42,
        perMonth: 2,
        merchants: [
          { name: 'NMBS', weight: 2 },
          { name: 'De Lijn', weight: 1 },
        ],
      },
      {
        category: 'shopping',
        monthly: 185,
        perMonth: 4,
        merchants: [
          { name: 'Zeeman', weight: 2 },
          { name: 'Dreamland', weight: 2 },
          { name: 'Bol.com', weight: 3 },
          { name: 'Zalando', weight: 1 },
          { name: 'JBC', weight: 2 },
        ],
        sd: 0.5,
      },
      {
        category: 'vrije_tijd',
        monthly: 115,
        perMonth: 3,
        merchants: [
          { name: 'Kinepolis', weight: 1 },
          { name: 'Technopolis', weight: 1 },
          { name: 'Zwembad De Nekker', weight: 2 },
          { name: 'Planckendael', weight: 1 },
        ],
      },
      { category: 'gezondheid', monthly: 48, perMonth: 2, merchants: PHARMACY },
      {
        category: 'overig',
        monthly: 55,
        perMonth: 2,
        merchants: [
          { name: 'Kruidvat', weight: 2 },
          { name: 'Action', weight: 2 },
          { name: 'Bpost', weight: 1 },
        ],
      },
    ],
    oneOffs: [
      { daysAgo: 130, merchant: 'Garage Peeters', category: 'auto', amount: 742, description: 'Onderhoud + banden' },
      { daysAgo: 70, merchant: 'Sunweb', category: 'reizen', amount: 1_890, description: 'Zomervakantie Italië' },
      { daysAgo: 330, merchant: 'Center Parcs', category: 'reizen', amount: 620, description: 'Weekend Erperheide' },
      { daysAgo: 20, merchant: 'Dreamland', category: 'shopping', amount: 89.95, description: 'Verjaardag Lou' },
    ],
    recurringOverrides: {
      // Story: the energy bill jumped from € 195 to € 312 two months ago.
      luminus: { amount: (monthsAgo) => (monthsAgo <= 1 ? 312 : 195) },
    },
  },
  marc: {
    categories: [
      { category: 'boodschappen', monthly: 430, perMonth: 10, merchants: GROCERY },
      {
        category: 'restaurants',
        monthly: 190,
        perMonth: 4,
        merchants: [
          { name: 'Brasserie Het Hemelrijk', weight: 2 },
          { name: 'Restaurant Cuchara', weight: 1 },
          { name: 'Frituur Oud Hasselt', weight: 2 },
          { name: 'Café Bar Basiel', weight: 2 },
        ],
      },
      { category: 'auto', monthly: 140, perMonth: 3, merchants: FUEL, sd: 0.2 },
      {
        category: 'reizen',
        monthly: 150,
        perMonth: 1,
        merchants: [
          { name: 'Ryanair', weight: 3 },
          { name: 'Brussels Airlines', weight: 2 },
          { name: 'Booking.com', weight: 3 },
          { name: 'NMBS International', weight: 1 },
        ],
        sd: 0.45,
      },
      {
        category: 'shopping',
        monthly: 120,
        perMonth: 2,
        merchants: [
          { name: 'Coolblue', weight: 2 },
          { name: 'Bol.com', weight: 2 },
          { name: 'Brico', weight: 3 },
          { name: 'Decathlon', weight: 1 },
        ],
        sd: 0.5,
      },
      {
        category: 'vrije_tijd',
        monthly: 75,
        perMonth: 2,
        merchants: [
          { name: 'Golfclub Limburg', weight: 1 },
          { name: 'Kinepolis', weight: 1 },
          { name: 'Standaard Boekhandel', weight: 1 },
        ],
      },
      { category: 'gezondheid', monthly: 58, perMonth: 2, merchants: PHARMACY },
      {
        category: 'overig',
        monthly: 45,
        perMonth: 1,
        merchants: [
          { name: 'Bpost', weight: 1 },
          { name: 'Kruidvat', weight: 1 },
        ],
      },
    ],
    multiplier: (cat, monthsAgo) => {
      // Story: heavy travel spending this year (roughly the last 9 months).
      if (cat === 'reizen') return monthsAgo <= 8 ? 3.2 : 1;
      return 1;
    },
    oneOffs: [
      { daysAgo: 2, merchant: 'TUI', category: 'reizen', amount: 1_850, description: 'Rondreis Portugal' },
      { daysAgo: 12, merchant: 'Booking.com', category: 'reizen', amount: 265, description: 'Hotel Lissabon' },
      { daysAgo: 60, merchant: 'Ryanair', category: 'reizen', amount: 178.4, description: 'Vlucht Porto' },
      { daysAgo: 150, merchant: 'Garage Vanhove', category: 'auto', amount: 1_120, description: 'Grote onderhoudsbeurt' },
      { daysAgo: 400, merchant: 'Sunweb', category: 'reizen', amount: 940, description: 'Wintersport' },
    ],
  },
  emma: {
    categories: [
      {
        category: 'boodschappen',
        monthly: 170,
        perMonth: 9,
        merchants: [
          { name: 'Aldi', weight: 3 },
          { name: 'Lidl', weight: 3 },
          { name: 'Delhaize', weight: 2 },
        ],
      },
      { category: 'maaltijdbezorging', monthly: 32, perMonth: 2, merchants: [{ name: 'Takeaway.com', weight: 2 }, { name: 'Uber Eats', weight: 1 }] },
      {
        category: 'restaurants',
        monthly: 52,
        perMonth: 5,
        merchants: [
          { name: 'Alma studentenrestaurant', weight: 4 },
          { name: 'Fakbar Letteren', weight: 2 },
          { name: 'Frituur Bij Nico', weight: 1 },
        ],
        sd: 0.3,
      },
      {
        category: 'vervoer',
        monthly: 26,
        perMonth: 2,
        merchants: [
          { name: 'De Lijn', weight: 2 },
          { name: 'NMBS', weight: 2 },
        ],
      },
      {
        category: 'shopping',
        monthly: 62,
        perMonth: 2,
        merchants: [
          { name: 'Zalando', weight: 3 },
          { name: 'H&M', weight: 2 },
          { name: 'Bershka', weight: 2 },
          { name: 'Primark', weight: 1 },
        ],
        sd: 0.45,
      },
      {
        category: 'vrije_tijd',
        monthly: 84,
        perMonth: 4,
        merchants: [
          { name: 'Café De Vesten', weight: 3 },
          { name: 'Kinepolis', weight: 1 },
          { name: 'STUK', weight: 1 },
          { name: 'Het Depot', weight: 1 },
        ],
      },
      { category: 'gezondheid', monthly: 12, perMonth: 1, merchants: PHARMACY },
      { category: 'overig', monthly: 22, perMonth: 1, merchants: [{ name: 'Kruidvat', weight: 1 }, { name: 'Action', weight: 1 }] },
    ],
    multiplier: (cat, monthsAgo) => (cat === 'shopping' && monthsAgo === 0 ? 2.2 : 1),
    oneOffs: [
      { daysAgo: 1, merchant: 'Zalando', category: 'shopping', amount: 129.95 },
      { daysAgo: 3, merchant: 'Bershka', category: 'shopping', amount: 38.99 },
      { daysAgo: 5, merchant: 'H&M', category: 'shopping', amount: 45.5 },
      { daysAgo: 6, merchant: 'Zalando', category: 'shopping', amount: 89.9 },
      { daysAgo: 45, merchant: 'Acco', category: 'overig', amount: 148, description: 'Cursussen' },
      { daysAgo: 250, merchant: 'De Lijn', category: 'vervoer', amount: 54, description: 'Buzzy Pazz jaarabonnement' },
      { daysAgo: 380, merchant: 'Coolblue', category: 'shopping', amount: 219, description: 'Koptelefoon' },
    ],
  },
};

function txId(prefix: string, n: number): string {
  return `${prefix}-${n.toString(36)}`;
}

/** Generate the persona's history ending on `anchor` (inclusive). Deterministic. */
export function generateTransactions(persona: Persona, anchor: ISODate): Transaction[] {
  const rng = new PRNG(`toekomst-ik:${persona.id}`);
  const profile = PROFILES[persona.id];
  const start = addDays(anchor, -HISTORY_DAYS);
  const out: Transaction[] = [];
  let n = 0;

  // 1. Recurring items, month by month.
  const anchorMonth = monthKey(anchor);
  for (let m = 0; m <= 19; m++) {
    const monthDate = addMonths(`${anchorMonth}-01`, -m);
    const { y, m: mm } = parseISO(monthDate);
    for (const item of persona.recurring) {
      const ov = profile.recurringOverrides?.[item.id];
      if (ov?.startMonthsAgo !== undefined && m > ov.startMonthsAgo) continue;
      const date = clampDay(y, mm, item.dayOfMonth);
      if (date > anchor || date < start) continue;
      let amountCents = item.amountCents;
      if (ov?.amount) amountCents = -euros(ov.amount(m));
      // Salary and fixed bills have tiny variation to look real (except subscriptions).
      if (item.category === 'energie') amountCents = Math.round(amountCents * (1 + rng.gauss(0, 0.025)));
      out.push({
        id: txId(`${persona.id}-r-${item.id}`, n++),
        date,
        amountCents,
        merchant: item.merchant,
        category: item.category,
        accountId: item.accountId,
        description: item.description,
        recurring: true,
        subscriptionKind: item.subscriptionKind,
      });
      if (item.category === 'sparen') {
        out.push({
          id: txId(`${persona.id}-s-${item.id}`, n++),
          date,
          amountCents: -amountCents,
          merchant: item.merchant,
          category: 'sparen',
          accountId: item.id === 'invest' ? 'beleggen' : 'spaar',
          description: 'Ontvangen overschrijving',
          recurring: true,
        });
      }
    }
  }

  // 2. Variable spending, day by day.
  const totalDays = diffDays(anchor, start);
  for (let d = 0; d <= totalDays; d++) {
    const date = addDays(start, d);
    const monthsAgo = monthsBetween(monthKey(date) + '-01', anchorMonth + '-01');
    const { y, m: mm } = parseISO(date);
    const dim = daysInMonth(y, mm);
    for (const cp of profile.categories) {
      const mult = profile.multiplier?.(cp.category, monthsAgo) ?? 1;
      const p = (cp.perMonth * mult) / dim;
      // allow up to 2 payments on one day when p > 1
      const draws = p > 1 ? 2 : 1;
      for (let k = 0; k < draws; k++) {
        if (!rng.chance(Math.min(0.95, p / draws))) continue;
        const avg = (cp.monthly * mult) / (cp.perMonth * mult);
        const sd = (cp.sd ?? 0.35) * avg;
        const amount = Math.max(1.5, rng.gauss(avg, sd));
        out.push({
          id: txId(`${persona.id}-v`, n++),
          date,
          amountCents: -euros(amount),
          merchant: rng.weighted(cp.merchants).name,
          category: cp.category,
          accountId: 'zicht',
        });
      }
    }
  }

  // 3. Story one-offs.
  for (const o of profile.oneOffs) {
    out.push({
      id: txId(`${persona.id}-o`, n++),
      date: addDays(anchor, -o.daysAgo),
      amountCents: -euros(o.amount),
      merchant: o.merchant,
      category: o.category,
      accountId: 'zicht',
      description: o.description,
      recurring: o.recurring,
      subscriptionKind: o.subscriptionKind,
    });
  }

  out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id < b.id ? -1 : 1));
  return out;
}

/**
 * Transactions that become due when the clock moves from `from` (exclusive) to `to` (inclusive).
 * Used by the demo "jump a day / a week" so salaries, rent and subscriptions keep flowing.
 */
export function dueRecurringTransactions(persona: Persona, from: ISODate, to: ISODate, seq: number): Transaction[] {
  const out: Transaction[] = [];
  let n = seq;
  const startMonth = monthKey(from);
  const months = monthsBetween(startMonth + '-01', monthKey(to) + '-01');
  for (let i = 0; i <= months; i++) {
    const md = addMonths(startMonth + '-01', i);
    const { y, m } = parseISO(md);
    for (const item of persona.recurring) {
      const date = clampDay(y, m, item.dayOfMonth);
      if (date <= from || date > to) continue;
      // The energy story: keep the raised amount flowing for Sam & Noor.
      const ov = PROFILES[persona.id].recurringOverrides?.[item.id];
      const amountCents = ov?.amount ? -euros(ov.amount(0)) : item.amountCents;
      out.push({
        id: txId(`${persona.id}-due-${item.id}`, n++),
        date,
        amountCents,
        merchant: item.merchant,
        category: item.category,
        accountId: item.accountId,
        description: item.description,
        recurring: true,
        subscriptionKind: item.subscriptionKind,
      });
      if (item.category === 'sparen') {
        out.push({
          id: txId(`${persona.id}-dues-${item.id}`, n++),
          date,
          amountCents: -amountCents,
          merchant: item.merchant,
          category: 'sparen',
          accountId: item.id === 'invest' ? 'beleggen' : 'spaar',
          description: 'Ontvangen overschrijving',
          recurring: true,
        });
      }
    }
  }
  return out;
}

/** Demo-panel presets. */
export interface PresetTransaction {
  id: string;
  label: string;
  merchant: string;
  category: Category;
  amountCents: number;
  recurring?: boolean;
  subscriptionKind?: SubscriptionKind;
  description?: string;
}

export const PRESET_TRANSACTIONS: PresetTransaction[] = [
  { id: 'ubereats', label: 'Uber Eats € 42', merchant: 'Uber Eats', category: 'maaltijdbezorging', amountCents: -4200 },
  { id: 'zalando', label: 'Zalando € 189', merchant: 'Zalando', category: 'shopping', amountCents: -18900 },
  {
    id: 'disney',
    label: 'Nieuw abonnement Disney+ € 11,99',
    merchant: 'Disney+',
    category: 'abonnementen',
    amountCents: -1199,
    recurring: true,
    subscriptionKind: 'video',
  },
  { id: 'ryanair', label: 'Ryanair € 420', merchant: 'Ryanair', category: 'reizen', amountCents: -42000, description: 'Vlucht' },
  { id: 'colruyt', label: 'Colruyt € 63,40', merchant: 'Colruyt', category: 'boodschappen', amountCents: -6340 },
  { id: 'garage', label: 'Garage € 890 (autoherstelling)', merchant: 'Garage Peeters', category: 'auto', amountCents: -89000, description: 'Herstelling' },
];

/** The amount a recurring item currently charges (story overrides applied). */
export function currentRecurringAmount(persona: Persona, item: RecurringItem): number {
  const ov = PROFILES[persona.id].recurringOverrides?.[item.id];
  return ov?.amount ? -euros(ov.amount(0)) : item.amountCents;
}
