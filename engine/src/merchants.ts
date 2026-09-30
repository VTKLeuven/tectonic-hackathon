import { l } from './format';
import type { Category, CategoryId, EnrichedTransaction, Transaction } from './types';

/**
 * Step 1 of the pipeline: recognise who got paid.
 *
 * A bank already knows the counterparty and the communication of every
 * transaction. That is enough to recognise most of what matters without
 * asking the customer anything. In production this table is a maintained
 * merchant database (plus card MCC codes); here it is a readable list.
 */

export const CATEGORIES: Record<CategoryId, Category> = {
  income: { id: 'income', label: l('Inkomen', 'Income'), icon: 'wallet', group: 'income' },
  rent: { id: 'rent', label: l('Huur', 'Rent'), icon: 'key-round', group: 'housing' },
  mortgage: { id: 'mortgage', label: l('Woonkrediet', 'Mortgage'), icon: 'house', group: 'housing' },
  groceries: { id: 'groceries', label: l('Boodschappen', 'Groceries'), icon: 'shopping-basket', group: 'daily' },
  electricity: { id: 'electricity', label: l('Elektriciteit', 'Electricity'), icon: 'zap', group: 'energy' },
  gas: { id: 'gas', label: l('Aardgas', 'Natural gas'), icon: 'flame', group: 'energy' },
  energy_credit: { id: 'energy_credit', label: l('Energie terugbetaling', 'Energy refund'), icon: 'sun', group: 'energy' },
  heating_oil: { id: 'heating_oil', label: l('Mazout', 'Heating oil'), icon: 'droplet', group: 'energy' },
  water: { id: 'water', label: l('Water', 'Water'), icon: 'droplets', group: 'housing' },
  fuel: { id: 'fuel', label: l('Brandstof', 'Fuel'), icon: 'fuel', group: 'mobility' },
  ev_charging: { id: 'ev_charging', label: l('Laden', 'EV charging'), icon: 'plug-zap', group: 'mobility' },
  car: { id: 'car', label: l('Auto', 'Car'), icon: 'car', group: 'mobility' },
  public_transport: { id: 'public_transport', label: l('Openbaar vervoer', 'Public transport'), icon: 'train-front', group: 'mobility' },
  streaming: { id: 'streaming', label: l('Streaming', 'Streaming'), icon: 'tv', group: 'subscriptions' },
  music: { id: 'music', label: l('Muziek', 'Music'), icon: 'music', group: 'subscriptions' },
  cloud: { id: 'cloud', label: l('Cloudopslag', 'Cloud storage'), icon: 'cloud', group: 'subscriptions' },
  telecom: { id: 'telecom', label: l('Internet en gsm', 'Internet and mobile'), icon: 'wifi', group: 'subscriptions' },
  gym: { id: 'gym', label: l('Sport', 'Fitness'), icon: 'dumbbell', group: 'subscriptions' },
  insurance: { id: 'insurance', label: l('Verzekeringen', 'Insurance'), icon: 'shield', group: 'finance' },
  furniture: { id: 'furniture', label: l('Meubels', 'Furniture'), icon: 'sofa', group: 'housing' },
  diy: { id: 'diy', label: l('Doe-het-zelf', 'DIY'), icon: 'hammer', group: 'housing' },
  moving: { id: 'moving', label: l('Verhuis', 'Moving'), icon: 'truck', group: 'housing' },
  notary: { id: 'notary', label: l('Notaris', 'Notary'), icon: 'stamp', group: 'housing' },
  taxes: { id: 'taxes', label: l('Belastingen', 'Taxes'), icon: 'landmark', group: 'finance' },
  restaurants: { id: 'restaurants', label: l('Restaurant en café', 'Eating out'), icon: 'utensils', group: 'daily' },
  shopping: { id: 'shopping', label: l('Winkelen', 'Shopping'), icon: 'shopping-bag', group: 'daily' },
  health: { id: 'health', label: l('Gezondheid', 'Health'), icon: 'heart-pulse', group: 'daily' },
  childcare: { id: 'childcare', label: l('Kinderen', 'Children'), icon: 'baby', group: 'daily' },
  pension_saving: { id: 'pension_saving', label: l('Pensioensparen', 'Pension savings'), icon: 'piggy-bank', group: 'finance' },
  savings: { id: 'savings', label: l('Sparen', 'Savings'), icon: 'piggy-bank', group: 'finance' },
  solar: { id: 'solar', label: l('Zonne-energie', 'Solar'), icon: 'sun', group: 'energy' },
  other: { id: 'other', label: l('Overige', 'Other'), icon: 'circle-dashed', group: 'other' },
};

interface MerchantRule {
  key: string;
  name: string;
  /** Tested against `COUNTERPARTY | DESCRIPTION`, upper case. */
  match: RegExp;
  category: CategoryId | ((text: string, tx: Transaction) => CategoryId);
}

/** Energy suppliers bill electricity and gas separately; the communication says which. */
function energyLine(text: string, tx: Transaction): CategoryId {
  if (tx.amount > 0) return 'energy_credit';
  if (/\bGAS\b|AARDGAS/.test(text)) return 'gas';
  return 'electricity';
}

const RULES: MerchantRule[] = [
  // Subscriptions
  { key: 'netflix', name: 'Netflix', match: /NETFLIX/, category: 'streaming' },
  { key: 'disney', name: 'Disney+', match: /DISNEY/, category: 'streaming' },
  { key: 'streamz', name: 'Streamz', match: /STREAMZ/, category: 'streaming' },
  { key: 'hbo', name: 'HBO Max', match: /HBO|\bMAX\.COM/, category: 'streaming' },
  { key: 'prime', name: 'Prime Video', match: /PRIME VIDEO|AMAZON PRIME/, category: 'streaming' },
  { key: 'youtube', name: 'YouTube Premium', match: /YOUTUBE/, category: 'streaming' },
  { key: 'vtmgo', name: 'VTM GO', match: /VTM ?GO/, category: 'streaming' },
  { key: 'spotify', name: 'Spotify', match: /SPOTIFY/, category: 'music' },
  { key: 'icloud', name: 'iCloud+', match: /APPLE\.COM\/BILL|ICLOUD/, category: 'cloud' },
  { key: 'telenet', name: 'Telenet', match: /TELENET/, category: 'telecom' },
  { key: 'proximus', name: 'Proximus', match: /PROXIMUS/, category: 'telecom' },
  { key: 'orange', name: 'Orange', match: /ORANGE BELGIUM/, category: 'telecom' },
  { key: 'basicfit', name: 'Basic-Fit', match: /BASIC.?FIT/, category: 'gym' },

  // Energy
  { key: 'engie', name: 'Engie', match: /ENGIE/, category: energyLine },
  { key: 'luminus', name: 'Luminus', match: /LUMINUS/, category: energyLine },
  { key: 'bolt', name: 'Bolt Energie', match: /BOLT ENERGIE/, category: energyLine },
  { key: 'mega', name: 'Mega', match: /\bMEGA\b.*ENERG/, category: energyLine },
  { key: 'gabriels', name: 'Gabriëls', match: /GABRIELS|MAZOUT|STOOKOLIE/, category: 'heating_oil' },
  { key: 'dewatergroep', name: 'De Watergroep', match: /WATERGROEP|WATER-LINK|FARYS|PIDPA/, category: 'water' },
  { key: 'solarinstall', name: 'Zonnepaneleninstallateur', match: /ZONNEPANELEN|SOLAR ?(PANEL|INSTALL)/, category: 'solar' },

  // Mobility
  { key: 'allego', name: 'Allego', match: /ALLEGO/, category: 'ev_charging' },
  { key: 'shellrecharge', name: 'Shell Recharge', match: /SHELL RECHARGE/, category: 'ev_charging' },
  { key: 'ionity', name: 'Ionity', match: /IONITY/, category: 'ev_charging' },
  { key: 'shell', name: 'Shell', match: /\bSHELL\b/, category: 'fuel' },
  { key: 'q8', name: 'Q8', match: /\bQ8\b/, category: 'fuel' },
  { key: 'esso', name: 'Esso', match: /ESSO/, category: 'fuel' },
  { key: 'dats24', name: 'DATS 24', match: /DATS ?24/, category: 'fuel' },
  { key: 'totalstation', name: 'TotalEnergies', match: /TOTALENERGIES STATION/, category: 'fuel' },
  { key: 'garage', name: 'Garage', match: /GARAGE|AUTOCENTER|BANDEN/, category: 'car' },
  { key: 'nmbs', name: 'NMBS', match: /NMBS|SNCB/, category: 'public_transport' },
  { key: 'delijn', name: 'De Lijn', match: /DE LIJN/, category: 'public_transport' },

  // Home and moving
  { key: 'mover', name: 'Verhuisfirma', match: /VERHUIS|DEMENAGEMENT|MOVERS/, category: 'moving' },
  { key: 'notary', name: 'Notaris', match: /NOTARIS|NOTAIRE/, category: 'notary' },
  { key: 'ikea', name: 'IKEA', match: /IKEA/, category: 'furniture' },
  { key: 'jysk', name: 'JYSK', match: /JYSK|LEEN BAKKER|MAISONS DU MONDE/, category: 'furniture' },
  { key: 'hubo', name: 'Hubo', match: /HUBO/, category: 'diy' },
  { key: 'brico', name: 'Brico', match: /BRICO|GAMMA|PRAXIS/, category: 'diy' },
  { key: 'mortgage', name: 'KBC Woonkrediet', match: /WOONKREDIET|HYPOTHE/, category: 'mortgage' },
  { key: 'rent', name: 'Huur', match: /\bHUUR\b/, category: 'rent' },

  // Finance
  { key: 'pension', name: 'Pensioensparen', match: /PENSIOENSPAREN|PENSIOENFONDS/, category: 'pension_saving' },
  { key: 'insurance', name: 'Verzekering', match: /VERZEKERING|ALLIANZ|AG INSURANCE|ETHIAS|BALOISE/, category: 'insurance' },
  { key: 'taxes', name: 'Belastingen', match: /BELASTINGDIENST|FOD FINANCIEN|VERKEERSBELASTING/, category: 'taxes' },
  { key: 'savings', name: 'Spaarrekening', match: /NAAR SPAARREKENING|EIGEN REKENING SPAAR/, category: 'savings' },

  // Daily life
  { key: 'colruyt', name: 'Colruyt', match: /COLRUYT/, category: 'groceries' },
  { key: 'delhaize', name: 'Delhaize', match: /DELHAIZE/, category: 'groceries' },
  { key: 'aldi', name: 'Aldi', match: /\bALDI\b/, category: 'groceries' },
  { key: 'lidl', name: 'Lidl', match: /\bLIDL\b/, category: 'groceries' },
  { key: 'carrefour', name: 'Carrefour', match: /CARREFOUR/, category: 'groceries' },
  { key: 'ah', name: 'Albert Heijn', match: /ALBERT HEIJN/, category: 'groceries' },
  { key: 'bol', name: 'bol', match: /\bBOL\.COM|\bBOL\b/, category: 'shopping' },
  { key: 'zalando', name: 'Zalando', match: /ZALANDO/, category: 'shopping' },
  { key: 'mediamarkt', name: 'MediaMarkt', match: /MEDIAMARKT|COOLBLUE/, category: 'shopping' },
  { key: 'pharmacy', name: 'Apotheek', match: /APOTHEEK|PHARMACIE/, category: 'health' },
  { key: 'childcare', name: 'Kinderopvang', match: /KINDEROPVANG|KRIBBE|SCHOOL|KINDERBIJSLAG|GROEIPAKKET/, category: 'childcare' },
  { key: 'deliveroo', name: 'Deliveroo', match: /DELIVEROO|TAKEAWAY|UBER ?EATS/, category: 'restaurants' },
  { key: 'snack_de_nijl', name: 'Snack De Nijl', match: /DE NIJL|SNACK DE NIJL/, category: 'restaurants' },
  { key: 'fakbar', name: 'Fakbar', match: /FAKBAR|ELIXIR|'T ELIXIR|RECUP|PAVLOV|DULCI|THEOKOT|'T VERZET/, category: 'restaurants' },
  { key: 'oude_markt', name: 'Café Oude Markt', match: /OUDE MARKT|CAFE BELGE|DE VRIJHEID|BAR OUDE MARKT/, category: 'restaurants' },
  { key: 'alma', name: 'Alma Studentenresto', match: /ALMA/, category: 'restaurants' },
  { key: 'restaurant', name: 'Restaurant', match: /RESTAURANT|BRASSERIE|CAFE|FRITUUR|BAKKERIJ|PANOS|EXKI/, category: 'restaurants' },
];

/** Normalise a raw counterparty into a key that groups the same payee. */
function normalise(counterparty: string): string {
  return counterparty
    .toUpperCase()
    .replace(/\b(NV|BV|SA|SRL|BVBA|VZW)\b/g, '')
    .replace(/[^A-Z ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/ /g, '-');
}

function parseFacts(text: string): EnrichedTransaction['facts'] {
  const facts: EnrichedTransaction['facts'] = {};
  const litres = text.match(/(\d[\d.]*)\s?(L|LITER|LITRES?)\b/);
  if (litres) facts.litres = Number(litres[1].replace(/\./g, ''));
  const kwh = text.match(/(\d[\d.,]*)\s?KWH\b/);
  if (kwh) facts.kwh = Number(kwh[1].replace(/\./g, '').replace(',', '.'));
  return facts;
}

export function categorise(tx: Transaction): EnrichedTransaction {
  const text = `${tx.counterparty} | ${tx.description}`.toUpperCase();
  const facts = parseFacts(text);

  // Salary or student allowance is recognised by direction and wording, not by employer.
  if (tx.amount > 0 && /\bLOON\b|SALARIS|WEDDE|VAKANTIEGELD|EINDEJAARSPREMIE/.test(text)) {
    return { ...tx, category: 'income', merchantKey: `employer:${normalise(tx.counterparty)}`, merchantName: tx.counterparty, facts };
  }
  if (tx.amount > 0 && /\b(ZAKGELD|LEEFGELD|OUDERS|STUDIETOELAGE)\b/.test(text)) {
    return { ...tx, category: 'income', merchantKey: `family:${normalise(tx.counterparty)}`, merchantName: tx.counterparty, facts };
  }

  for (const rule of RULES) {
    if (rule.match.test(text)) {
      const category = typeof rule.category === 'function' ? rule.category(text, tx) : rule.category;
      return { ...tx, category, merchantKey: rule.key, merchantName: rule.name, facts };
    }
  }

  return {
    ...tx,
    category: tx.amount > 0 ? 'income' : 'other',
    merchantKey: normalise(tx.counterparty),
    merchantName: tx.counterparty,
    facts,
  };
}
