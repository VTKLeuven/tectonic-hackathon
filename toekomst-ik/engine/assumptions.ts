/**
 * All modelling assumptions in one place, with Dutch labels for the "Aannames" screen.
 * Values are deliberately simplified for a proof of concept and labelled as such.
 */

export interface Assumption<T = number> {
  key: string;
  label: string;
  value: T;
  /** How the value is displayed, e.g. "2 % per jaar". */
  display: string;
  note: string;
  group: 'economie' | 'wonen' | 'werk_gezin' | 'regels';
}

function pct(v: number, suffix = 'per jaar'): string {
  return `${(v * 100).toFixed(v * 100 % 1 === 0 ? 0 : 1).replace('.', ',')} % ${suffix}`.trim();
}
function eur(cents: number, suffix = ''): string {
  const s = Math.round(cents / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `€ ${s}${suffix ? ' ' + suffix : ''}`;
}

export const assumptions = {
  inflation: {
    key: 'inflation',
    label: 'Inflatie',
    value: 0.02,
    display: pct(0.02),
    note: 'Vereenvoudigd: vaste 2 % per jaar (ECB-doelstelling). Toegepast op alle uitgaven behalve je hypotheek.',
    group: 'economie',
  },
  wageIndexation: {
    key: 'wageIndexation',
    label: 'Loonindexering',
    value: 0.02,
    display: pct(0.02),
    note: 'Vereenvoudigd: je nettoloon volgt de inflatie. Geen promoties of loonsprongen.',
    group: 'economie',
  },
  savingsRate: {
    key: 'savingsRate',
    label: 'Rente spaarrekening',
    value: 0.02,
    display: pct(0.02),
    note: 'Basisrente plus getrouwheidspremie, vereenvoudigd tot één vast percentage. Roerende voorheffing buiten beschouwing.',
    group: 'economie',
  },
  investmentReturn: {
    key: 'investmentReturn',
    label: 'Rendement beleggingen',
    value: 0.05,
    display: pct(0.05),
    note: 'Illustratief gemiddelde voor een gespreide portefeuille, vóór kosten en taksen. Geen garantie: rendementen schommelen.',
    group: 'economie',
  },
  mortgageRate: {
    key: 'mortgageRate',
    label: 'Hypotheekrente (nieuw krediet)',
    value: 0.035,
    display: pct(0.035),
    note: 'Vaste rentevoet voor een nieuw woonkrediet in de simulatie.',
    group: 'wonen',
  },
  mortgageTermYears: {
    key: 'mortgageTermYears',
    label: 'Looptijd woonkrediet',
    value: 25,
    display: '25 jaar',
    note: 'Annuïteitenlening: elke maand hetzelfde bedrag.',
    group: 'wonen',
  },
  registrationDuty: {
    key: 'registrationDuty',
    label: 'Registratierechten (Vlaanderen)',
    value: 0.02,
    display: pct(0.02, 'van de aankoopprijs'),
    note: 'Verlaagd tarief voor de enige eigen gezinswoning in Vlaanderen. Voor een tweede woning of Brussel/Wallonië gelden andere tarieven.',
    group: 'wonen',
  },
  notaryPct: {
    key: 'notaryPct',
    label: 'Notaris- en kredietkosten',
    value: 0.015,
    display: `${pct(0.015, 'van de aankoopprijs')} + € 2.500 vast`,
    note: 'Vereenvoudigde schatting van ereloon, aktekosten en hypotheekinschrijving.',
    group: 'wonen',
  },
  notaryFixedCents: {
    key: 'notaryFixedCents',
    label: 'Vaste notariskosten',
    value: 250000,
    display: eur(250000),
    note: 'Onderdeel van de notaris- en kredietkosten hierboven.',
    group: 'wonen',
  },
  maxLoanToValue: {
    key: 'maxLoanToValue',
    label: 'Maximale quotiteit',
    value: 0.9,
    display: pct(0.9, 'van de aankoopprijs'),
    note: 'Je leent maximaal 90 % van de prijs; de rest plus de kosten breng je zelf in (NBB-richtlijn, vereenvoudigd).',
    group: 'wonen',
  },
  maxPaymentToIncome: {
    key: 'maxPaymentToIncome',
    label: 'Betaalbaarheidsregel',
    value: 0.35,
    display: pct(0.35, 'van het netto-inkomen'),
    note: 'De maandelijkse afbetaling mag niet meer dan 35 % van je netto-inkomen zijn. Vereenvoudigde bankregel.',
    group: 'regels',
  },
  homeValueGrowth: {
    key: 'homeValueGrowth',
    label: 'Waardestijging woning',
    value: 0.02,
    display: pct(0.02),
    note: 'Vereenvoudigd: volgt de inflatie.',
    group: 'wonen',
  },
  netFactor45: {
    key: 'netFactor45',
    label: 'Netto-effect 4/5 werken',
    value: 0.87,
    display: '87 % van het voltijdse nettoloon',
    note: 'Je verliest 20 % bruto maar minder netto door de progressieve belasting. Vereenvoudigd; werkelijk effect hangt af van je loon en eventueel tijdskrediet.',
    group: 'werk_gezin',
  },
  netFactorHalftijds: {
    key: 'netFactorHalftijds',
    label: 'Netto-effect halftijds werken',
    value: 0.56,
    display: '56 % van het voltijdse nettoloon',
    note: 'Vereenvoudigd, zelfde logica als 4/5.',
    group: 'werk_gezin',
  },
  childCostMonthlyCents: {
    key: 'childCostMonthlyCents',
    label: 'Kost van een kind',
    value: 60000,
    display: `${eur(60000, 'per maand')} (bruto)`,
    note: 'Gemiddelde extra kost (opvang, kleding, voeding) in de eerste jaren, vereenvoudigd tot één bedrag.',
    group: 'werk_gezin',
  },
  groeipakketMonthlyCents: {
    key: 'groeipakketMonthlyCents',
    label: 'Groeipakket',
    value: 18000,
    display: eur(18000, 'per maand per kind'),
    note: 'Basisbedrag Vlaams Groeipakket, afgerond. Toeslagen niet meegerekend.',
    group: 'werk_gezin',
  },
  carMonthlyCostCents: {
    key: 'carMonthlyCostCents',
    label: 'Kost van een auto',
    value: 28000,
    display: eur(28000, 'per maand'),
    note: 'Verzekering, brandstof, onderhoud en taksen samen. De aankoop zelf wordt apart als eenmalige uitgave geteld en niet als bezit.',
    group: 'werk_gezin',
  },
  legalRetirementAge: {
    key: 'legalRetirementAge',
    label: 'Wettelijke pensioenleeftijd',
    value: 67,
    display: '67 jaar',
    note: 'Vanaf 2030. De simulatie loopt tot de pensioenleeftijd van elk profiel.',
    group: 'regels',
  },
  pensionReplacement: {
    key: 'pensionReplacement',
    label: 'Pensioen na je loopbaan',
    value: 0.6,
    display: '60 % van je laatste nettoloon',
    note: 'Vereenvoudigd wettelijk pensioen. Aanvullend pensioen (groepsverzekering, pensioensparen) niet meegerekend.',
    group: 'werk_gezin',
  },
  safetyBufferMinCents: {
    key: 'safetyBufferMinCents',
    label: 'Minimale veiligheidsbuffer',
    value: 50000,
    display: eur(50000),
    note: 'De Waakhond waarschuwt als je zichtrekening vóór je volgende inkomen onder dit bedrag (of onder je vaste kosten) dreigt te komen.',
    group: 'regels',
  },
  baselineMonths: {
    key: 'baselineMonths',
    label: 'Referentieperiode',
    value: 6,
    display: '6 volledige maanden',
    note: 'Je "normaal" is de mediaan van je eigen laatste zes volledige maanden, niet een generieke drempel.',
    group: 'regels',
  },
  overspendThreshold: {
    key: 'overspendThreshold',
    label: 'Drempel "meer dan normaal"',
    value: 0.3,
    display: '30 % boven je mediaan',
    note: 'Pas vanaf 30 % boven je eigen normaal, minstens 4 % van je inkomen erboven én buiten je gewone maandelijkse schommeling, krijg je een signaal.',
    group: 'regels',
  },
  unusualSigma: {
    key: 'unusualSigma',
    label: 'Drempel "ongewone uitgave"',
    value: 3,
    display: '3 standaardafwijkingen',
    note: 'Een betaling die meer dan 3 standaardafwijkingen boven je gemiddelde voor die handelaar of categorie ligt, en minstens € 150.',
    group: 'regels',
  },
  maxActiveAlerts: {
    key: 'maxActiveAlerts',
    label: 'Maximum actieve signalen',
    value: 3,
    display: '3 tegelijk',
    note: 'De bank kiest de drie meest relevante signalen. De rest blijft beschikbaar onder "meer".',
    group: 'regels',
  },
  snoozeDays: {
    key: 'snoozeDays',
    label: 'Snooze-periode',
    value: 3,
    display: '3 dagen',
    note: 'Een gesnoozed signaal komt pas na drie dagen terug, en enkel als het nog geldt.',
    group: 'regels',
  },
  quietHours: {
    key: 'quietHours',
    label: 'Stille uren',
    value: 21,
    display: '21:00 – 08:00',
    note: 'Geen pushmeldingen tussen 21:00 en 08:00, en maximaal één per dag.',
    group: 'regels',
  },
} as const satisfies Record<string, Assumption>;

export type AssumptionKey = keyof typeof assumptions;

/** Plain numeric view for use in formulas: A.inflation === 0.02 */
export const A = Object.fromEntries(
  Object.entries(assumptions).map(([k, v]) => [k, v.value]),
) as { [K in AssumptionKey]: (typeof assumptions)[K]['value'] };

export const ASSUMPTION_LIST: Assumption[] = Object.values(assumptions);

export const ASSUMPTION_GROUP_LABELS: Record<Assumption['group'], string> = {
  economie: 'Economie',
  wonen: 'Wonen',
  werk_gezin: 'Werk & gezin',
  regels: 'Regels van de Waakhond',
};

export const ASSUMPTIONS_VERSION = '2026-09-poc-1';
