/**
 * Four synthetic KBC customers. Nothing here is real customer data.
 * Transactions are generated separately (see generator.ts) from these definitions.
 */
import { annuityPayment } from './finance';
import { euros } from './money';
import type { Persona, PersonaId, RecurringItem } from './types';

function rec(
  id: string,
  merchant: string,
  category: RecurringItem['category'],
  amountEuros: number,
  dayOfMonth: number,
  extra: Partial<RecurringItem> = {},
): RecurringItem {
  return {
    id,
    merchant,
    category,
    amountCents: euros(amountEuros),
    dayOfMonth,
    accountId: 'zicht',
    ...extra,
  };
}

const samNoorMortgage = {
  principalCents: euros(245_000),
  annualRate: 0.021,
  monthsRemaining: 216,
};
const marcMortgage = {
  principalCents: euros(17_500),
  annualRate: 0.028,
  monthsRemaining: 30,
};

export const lotte: Persona = {
  id: 'lotte',
  firstName: 'Lotte',
  displayName: 'Lotte',
  futureSelfName: 'Lotte, 37',
  age: 28,
  birthYear: 1998,
  city: 'Gent',
  employer: 'Showpad NV',
  householdLabel: 'Alleenstaand, huurt in Gent',
  netIncomeCents: euros(2_650),
  incomeDay: 25,
  workRegime: 'voltijds',
  housing: { type: 'huur', rentCents: euros(875) },
  accounts: [
    { id: 'zicht', name: 'KBC Zichtrekening', balanceCents: euros(2_900) },
    { id: 'spaar', name: 'KBC Spaarrekening', balanceCents: euros(18_200) },
  ],
  goals: [
    {
      id: 'huis',
      name: 'Eigen huis kopen',
      type: 'huis',
      targetCents: euros(52_000),
      targetDate: '2029-06-01',
      measure: 'liquid',
      note: 'Eigen inbreng + kosten voor een woning van ± € 300.000, plus een kleine buffer.',
    },
  ],
  budgets: [{ category: 'maaltijdbezorging', monthlyCents: euros(80) }],
  recurring: [
    rec('salary', 'Showpad NV – loon', 'inkomen', 2_650, 25, { description: 'Nettoloon' }),
    rec('rent', 'Immo De Smet – huur', 'wonen', -875, 1),
    rec('engie', 'Engie', 'energie', -110, 8),
    rec('proximus', 'Proximus', 'telecom', -49, 12),
    rec('netflix', 'Netflix', 'abonnementen', -13.99, 15, { subscriptionKind: 'video' }),
    rec('prime', 'Amazon Prime', 'abonnementen', -6.99, 20, { subscriptionKind: 'video' }),
    rec('streamz', 'Streamz', 'abonnementen', -12.95, 6, { subscriptionKind: 'video' }),
    rec('spotify', 'Spotify', 'abonnementen', -10.99, 3, { subscriptionKind: 'muziek' }),
    rec('basicfit', 'Basic-Fit', 'abonnementen', -24.99, 2, { subscriptionKind: 'fitness' }),
    rec('kbc-familiale', 'KBC Verzekeringen – Familiale', 'verzekeringen', -12, 5),
    rec('kbc-brand', 'KBC Verzekeringen – Brandverzekering huurder', 'verzekeringen', -14.5, 5),
    rec('save', 'Overschrijving naar KBC Spaarrekening', 'sparen', -400, 26),
  ],
  retirementAge: 67,
  investMonthlyCents: 0,
  saveMonthlyCents: euros(400),
  suggestedQuestions: [
    'Kan ik in 2029 een huis kopen?',
    'Waarom waarschuw je me over Deliveroo?',
    'Wat als ik elke maand € 150 extra spaar?',
    'Wat als ik 4/5 ga werken?',
  ],
  story:
    'Lotte spaart voor een eigen huis in 2029. De laatste twee maanden bestelt ze veel vaker eten aan huis, en ze heeft drie streamingdiensten naast elkaar lopen.',
  emoji: '🏡',
};

export const samNoor: Persona = {
  id: 'sam-noor',
  firstName: 'Sam',
  displayName: 'Sam & Noor',
  futureSelfName: 'Sam & Noor, 44 en 43',
  age: 35,
  birthYear: 1991,
  city: 'Mechelen',
  employer: 'Telenet Group & AZ Sint-Maarten',
  householdLabel: 'Koppel met twee jonge kinderen, eigen woning in Mechelen',
  netIncomeCents: euros(5_400),
  incomeDay: 27,
  workRegime: 'voltijds',
  housing: {
    type: 'hypotheek',
    ...samNoorMortgage,
    monthlyPaymentCents: annuityPayment(
      samNoorMortgage.principalCents,
      samNoorMortgage.annualRate,
      samNoorMortgage.monthsRemaining,
    ),
    homeValueCents: euros(430_000),
  },
  accounts: [
    { id: 'zicht', name: 'KBC Zichtrekening', balanceCents: euros(3_240) },
    { id: 'spaar', name: 'KBC Spaarrekening', balanceCents: euros(31_500) },
    { id: 'beleggen', name: 'KBC Beleggingsplan', balanceCents: euros(12_800) },
  ],
  goals: [
    {
      id: 'renovatie',
      name: 'Renovatie badkamer',
      type: 'verbouwing',
      targetCents: euros(45_000),
      targetDate: '2028-03-01',
      measure: 'liquid',
    },
    {
      id: 'studie',
      name: 'Studiefonds kinderen',
      type: 'studie',
      targetCents: euros(60_000),
      targetDate: '2040-09-01',
      measure: 'liquid_plus_investments',
      note: 'Kot en studiekosten voor twee kinderen.',
    },
  ],
  budgets: [
    { category: 'boodschappen', monthlyCents: euros(700) },
    { category: 'energie', monthlyCents: euros(220) },
  ],
  recurring: [
    rec('salary-sam', 'Telenet Group BV – loon', 'inkomen', 2_900, 27, { description: 'Nettoloon Sam' }),
    rec('salary-noor', 'AZ Sint-Maarten – loon', 'inkomen', 2_500, 1, { description: 'Nettoloon Noor' }),
    rec('groeipakket', 'FONS – Groeipakket', 'inkomen', 360, 8),
    rec('mortgage', 'KBC Woningkrediet', 'wonen', -1_363, 5),
    rec('luminus', 'Luminus', 'energie', -195, 10),
    rec('telenet', 'Telenet', 'telecom', -89, 14),
    rec('netflix', 'Netflix', 'abonnementen', -13.99, 16, { subscriptionKind: 'video' }),
    rec('disney', 'Disney+', 'abonnementen', -11.99, 22, { subscriptionKind: 'video' }),
    rec('spotify', 'Spotify Family', 'abonnementen', -17.99, 4, { subscriptionKind: 'muziek' }),
    rec('kbc-brand', 'KBC Verzekeringen – Woningpolis', 'verzekeringen', -48, 5),
    rec('kbc-auto', 'KBC Verzekeringen – Auto', 'verzekeringen', -72, 5),
    rec('kbc-familiale', 'KBC Verzekeringen – Familiale', 'verzekeringen', -12, 5),
    rec('kbc-hospi', 'KBC Verzekeringen – Hospitalisatie', 'verzekeringen', -41, 5),
    rec('opvang', "Kinderdagverblijf 't Kapoentje", 'kinderen', -385, 3),
    rec('school', 'GO! Basisschool De Vlinder', 'kinderen', -55, 18),
    rec('save', 'Overschrijving naar KBC Spaarrekening', 'sparen', -500, 28),
    rec('invest', 'KBC Beleggingsplan', 'sparen', -150, 28),
  ],
  retirementAge: 67,
  investMonthlyCents: euros(150),
  saveMonthlyCents: euros(500),
  suggestedQuestions: [
    'Wat als Noor 4/5 gaat werken?',
    'Waarom is onze energiefactuur een probleem?',
    'Wat als er een derde kindje komt?',
    'Halen we het studiefonds voor de kinderen?',
  ],
  story:
    'Sam en Noor hebben twee jonge kinderen en een lopend woonkrediet. Hun energiefactuur is plots gestegen, en Noor overweegt om 4/5 te gaan werken.',
  emoji: '👨‍👩‍👧‍👦',
};

export const marc: Persona = {
  id: 'marc',
  firstName: 'Marc',
  displayName: 'Marc',
  futureSelfName: 'Marc, 67',
  age: 58,
  birthYear: 1968,
  city: 'Hasselt',
  employer: 'Provincie Limburg',
  householdLabel: 'Koppel, kinderen het huis uit, eigen woning in Hasselt',
  netIncomeCents: euros(3_900),
  incomeDay: 28,
  workRegime: 'voltijds',
  housing: {
    type: 'hypotheek',
    ...marcMortgage,
    monthlyPaymentCents: annuityPayment(
      marcMortgage.principalCents,
      marcMortgage.annualRate,
      marcMortgage.monthsRemaining,
    ),
    homeValueCents: euros(385_000),
  },
  accounts: [
    { id: 'zicht', name: 'KBC Zichtrekening', balanceCents: euros(4_850) },
    { id: 'spaar', name: 'KBC Spaarrekening', balanceCents: euros(86_000) },
    { id: 'beleggen', name: 'KBC Beleggingsplan', balanceCents: euros(142_000) },
  ],
  goals: [
    {
      id: 'pensioen',
      name: 'Vervroegd pensioen op 63',
      type: 'pensioen',
      targetCents: euros(300_000),
      targetDate: '2031-03-01',
      measure: 'liquid_plus_investments',
      note: 'Spaarpot om de jaren tussen 63 en het wettelijk pensioen te overbruggen.',
    },
  ],
  budgets: [{ category: 'reizen', monthlyCents: euros(250) }],
  recurring: [
    rec('salary', 'Provincie Limburg – loon', 'inkomen', 3_900, 28, { description: 'Nettoloon' }),
    rec('mortgage', 'KBC Woningkrediet', 'wonen', -604, 5),
    rec('engie', 'Engie', 'energie', -165, 9),
    rec('telenet', 'Telenet', 'telecom', -79, 13),
    rec('netflix', 'Netflix', 'abonnementen', -13.99, 17, { subscriptionKind: 'video' }),
    rec('hln', 'HLN Digitaal', 'abonnementen', -9.99, 2, { subscriptionKind: 'nieuws' }),
    rec('spotify', 'Spotify', 'abonnementen', -10.99, 11, { subscriptionKind: 'muziek' }),
    rec('kbc-brand', 'KBC Verzekeringen – Woningpolis', 'verzekeringen', -52, 5),
    rec('kbc-auto', 'KBC Verzekeringen – Auto', 'verzekeringen', -68, 5),
    rec('kbc-familiale', 'KBC Verzekeringen – Familiale', 'verzekeringen', -12, 5),
    rec('kbc-hospi', 'KBC Verzekeringen – Hospitalisatie', 'verzekeringen', -58, 5),
    rec('save', 'Overschrijving naar KBC Spaarrekening', 'sparen', -600, 29),
    rec('invest', 'KBC Beleggingsplan', 'sparen', -400, 29),
  ],
  retirementAge: 63,
  investMonthlyCents: euros(400),
  saveMonthlyCents: euros(600),
  suggestedQuestions: [
    'Kan ik echt op 63 stoppen met werken?',
    'Waarom waarschuw je me over mijn reizen?',
    'Wat als ik vanaf nu 4/5 werk?',
    'Wat als ik € 300 per maand extra beleg?',
  ],
  story:
    'Marc wil op 63 stoppen met werken. Zijn woonkrediet is bijna afbetaald, maar dit jaar geeft hij veel meer uit aan reizen dan vroeger.',
  emoji: '✈️',
};

export const emma: Persona = {
  id: 'emma',
  firstName: 'Emma',
  displayName: 'Emma',
  futureSelfName: 'Emma, 30',
  age: 21,
  birthYear: 2005,
  city: 'Leuven',
  employer: 'Delhaize Leuven (studentenjob)',
  householdLabel: 'Student, huurt een kot in Leuven',
  netIncomeCents: euros(1_130),
  incomeDay: 10,
  workRegime: 'halftijds',
  housing: { type: 'huur', rentCents: euros(495) },
  accounts: [
    { id: 'zicht', name: 'KBC Zichtrekening', balanceCents: euros(140) },
    { id: 'spaar', name: 'KBC Spaarrekening', balanceCents: euros(1_250) },
  ],
  goals: [
    {
      id: 'rijbewijs',
      name: 'Rijbewijs halen',
      type: 'ander',
      targetCents: euros(1_800),
      targetDate: '2027-06-01',
      measure: 'liquid',
      note: 'Rijlessen, examens en een eerste verzekering.',
    },
    {
      id: 'auto',
      name: 'Eerste auto',
      type: 'auto',
      targetCents: euros(6_000),
      targetDate: '2028-09-01',
      measure: 'liquid',
      note: 'Een tweedehands stadswagen.',
    },
  ],
  budgets: [{ category: 'shopping', monthlyCents: euros(80) }],
  recurring: [
    rec('job', 'Delhaize Leuven – studentenjob', 'inkomen', 680, 10, { description: 'Studentenloon' }),
    rec('parents', 'Overschrijving Mama & Papa', 'inkomen', 450, 10, { description: 'Maandelijkse steun' }),
    rec('rent', 'Studentenhuisvesting Leuven – huur kot', 'wonen', -495, 1),
    rec('vikings', 'Mobile Vikings', 'telecom', -15, 7),
    rec('spotify', 'Spotify Student', 'abonnementen', -5.99, 4, { subscriptionKind: 'muziek' }),
    rec('netflix', 'Netflix', 'abonnementen', -8.99, 6, { subscriptionKind: 'video' }),
    rec('basicfit', 'Basic-Fit', 'abonnementen', -24.99, 2, { subscriptionKind: 'fitness' }),
    rec('save', 'Overschrijving naar KBC Spaarrekening', 'sparen', -50, 11),
  ],
  retirementAge: 67,
  investMonthlyCents: 0,
  saveMonthlyCents: euros(50),
  suggestedQuestions: [
    'Kom ik deze maand rond?',
    'Wanneer kan ik mijn rijbewijs betalen?',
    'Waarom waarschuw je me over Zalando?',
    'Wat als ik € 30 minder shop per maand?',
  ],
  story:
    'Emma studeert in Leuven en werkt als jobstudent. Deze maand ging er veel geld naar kleding, en haar zichtrekening dreigt onder nul te gaan vóór haar volgende loon.',
  emoji: '🎓',
};

export const PERSONAS: Record<PersonaId, Persona> = {
  lotte,
  'sam-noor': samNoor,
  marc,
  emma,
};

export const PERSONA_LIST: Persona[] = [lotte, samNoor, marc, emma];

export function getPersona(id: PersonaId): Persona {
  return PERSONAS[id];
}

// Keep the recurring mortgage payment identical to the annuity in `housing`.
for (const p of PERSONA_LIST) {
  if (p.housing.type === 'hypotheek') {
    const m = p.recurring.find((r) => r.id === 'mortgage');
    if (m) m.amountCents = -p.housing.monthlyPaymentCents;
  }
}
