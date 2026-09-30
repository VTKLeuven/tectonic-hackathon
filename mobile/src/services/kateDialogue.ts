import {
  euro,
  type Analysis,
  type Lang,
  type PersonaData,
  type RankedInsight,
} from '../engine';

export interface QuestionPrompt {
  id: string;
  nl: string;
  en: string;
}

export const COMMON_QUESTIONS: QuestionPrompt[] = [
  {
    id: 'afford_savings',
    nl: 'Kan ik dit betalen met mijn spaargeld?',
    en: 'Can I pay for this with my savings?',
  },
  {
    id: 'why_now',
    nl: 'Waarom krijg ik deze tip nu?',
    en: 'Why am I getting this tip now?',
  },
  {
    id: 'fixed_costs',
    nl: 'Hoeveel vaste kosten heb ik per jaar?',
    en: 'How much are my fixed costs per year?',
  },
  {
    id: 'why_restraint',
    nl: 'Waarom zie ik niet méér tips?',
    en: 'Why do I not see more tips?',
  },
  {
    id: 'swarm_agents',
    nl: 'Welke agents berekenden dit advies?',
    en: 'Which agents calculated this advice?',
  },
];

export function getBriefingScript(
  persona: PersonaData['persona'],
  analysis: Analysis,
  lang: Lang
): string {
  const featured = analysis.featured;
  const firstName = persona.firstName;

  if (lang === 'nl') {
    if (firstName === 'Jasper' || featured?.type === 'nightlife_budget') {
      return `Goeiemorgen Jasper! Hopelijk heb je goed geslapen. Hoe was De Nijl gisteren? Ik raad je aan om volgende keer naar 't ElixIr of de fakbars te gaan in plaats van de Oude Markt. Je spendeerde vannacht 67 euro.`;
    }

    if (featured?.type === 'heat_pump') {
      const saving = featured.annualValue ? euro(featured.annualValue, 'nl') : '€ 600';
      return `Dag ${firstName}! Kate hier. Ik merkte je recente stookolielevering op. Door over te schakelen naar een warmtepomp bespaar je zo'n ${saving} per jaar en verlaag je je uitstoot met 3,5 ton CO2. Met een KBC Energielening aan 3,49% spreid je de investering zonder aan je veilige spaarbuffer te raken.`;
    }

    if (featured?.type === 'solar') {
      const saving = featured.annualValue ? euro(featured.annualValue, 'nl') : '€ 850';
      return `Dag ${firstName}! Sinds je verhuisde naar je nieuwe woning heb ik je stroomvoorschot geanalyseerd. Met zonnepanelen bespaar je naar schatting ${saving} per jaar op je energiefactuur. Je hebt de investering in zo'n 5 jaar terugverdiend.`;
    }

    if (featured?.type === 'price_increase' || featured?.type === 'streaming_rotation') {
      return `Dag ${firstName}! Ik zag een recente prijswijziging in je lopende abonnementen. Ik help je graag om overbodige kosten te vermijden.`;
    }

    return `Dag ${firstName}! Je financiën staan er evenwichtig voor. Ik hou je energiekosten, verrichtingen en vaste abonnementen continu in de gaten om je tijdig te adviseren.`;
  }

  // English fallback
  if (firstName === 'Jasper' || featured?.type === 'nightlife_budget') {
    return `Good morning Jasper! Hope you slept well. How was De Nijl yesterday? I recommend heading to 't ElixIr or other faculty bars next time instead of the Oude Markt. Last night you spent 67 euros.`;
  }

  if (featured?.type === 'heat_pump') {
    const saving = featured.annualValue ? euro(featured.annualValue, 'en') : '€600';
    return `Hello ${firstName}! This is Kate. I noticed your recent heating oil delivery. Switching to a heat pump could save you around ${saving} a year and reduce your carbon footprint by 3.5 tonnes. An energy loan lets you spread the cost easily while keeping your savings intact.`;
  }

  if (featured?.type === 'solar') {
    const saving = featured.annualValue ? euro(featured.annualValue, 'en') : '€850';
    return `Hello ${firstName}! Following your move into your new home, solar panels could save you approximately ${saving} annually on your electricity bill, breaking even in just 5 years.`;
  }

  return `Hello ${firstName}! Your finances look healthy. I am quietly monitoring your transactions and energy rhythm to provide timely advice when it truly matters.`;
}

export function getTipDetailScript(
  insight: RankedInsight,
  persona: PersonaData['persona'],
  lang: Lang
): string {
  const firstName = persona.firstName;

  if (lang === 'nl') {
    if (insight.type === 'nightlife_budget') {
      return `Jasper, gisteravond gaf je 67 euro uit op de Oude Markt en bij Snack De Nijl aan een durum van 8 euro 50. Dat is 67 procent van je weekbudget van 100 euro. In Fakbar 't ElixIr kost een pintje 1 euro 20 en in Recup 1 euro 50, tegenover 4 euro op de Oude Markt. Door te switchen bespaar je meer dan 40 euro per avond en hou je comfortabel geld over voor de rest van de week!`;
    }

    if (insight.type === 'heat_pump') {
      return `Sarah, je verwarmt momenteel met stookolie. Een warmtepomp verlaagt je energiekosten drastisch en bespaart zo'n 3,5 ton CO2 per jaar. Een KBC Energielening kost je ongeveer € 78 per maand, terwijl je maandelijkse brandstofbesparing daar al een groot deel van compenseert.`;
    }

    if (insight.type === 'solar') {
      return `${firstName}, op basis van je elektriciteitsvoorschot en je recente aankoop van je woning zijn zonnepanelen bijzonder rendabel. Je wekt zelf groene stroom op en beschermt jezelf tegen stijgende nettarieven.`;
    }

    if (insight.type === 'pension_saving') {
      return `${firstName}, door vóór 31 december aan pensioensparen te doen, recupereer je 30% van je inleg via je belastingaangifte. Dat is een gegarandeerd fiscaal voordeel van meer dan € 300.`;
    }

    if (insight.type === 'idle_cash') {
      return `${firstName}, er staat een aanzienlijk bedrag op je zichtrekening dat geen rente opbrengt. Door een deel over te zetten naar je spaarrekening haal je meer rendement, terwijl je geld altijd meteen beschikbaar blijft.`;
    }

    return `${firstName}, hier is je toelichting voor ${insight.title[lang]}. Kate berekende dit rechtstreeks uit je eigen betalingsritme.`;
  }

  // English fallback
  if (insight.type === 'nightlife_budget') {
    return `Jasper, last night you spent 67 euros on the Oude Markt and at Snack De Nijl on an 8 euro 50 durum. That is 67 percent of your 100 euro weekly allowance. In Fakbar 't ElixIr beers are 1 euro 20 and in Recup 1 euro 50, vs 4 euros on the Oude Markt. Switching saves over 40 euros per night!`;
  }
  return `${firstName}, here is your personal briefing for ${insight.title[lang]}. Calculated directly from your recent payment rhythm with zero questions asked.`;
}

export function getAnswerScript(
  questionId: string,
  context: {
    persona: PersonaData['persona'];
    analysis: Analysis;
    tip?: RankedInsight;
    lang: Lang;
  }
): string {
  const { persona, analysis, tip, lang } = context;
  const firstName = persona.firstName;

  if (lang === 'nl') {
    switch (questionId) {
      case 'afford_savings': {
        if (persona.firstName === 'Jasper') {
          return `Je zichtrekening heeft nu nog een saldo van 28 euro 50. Als je de rest van de week in 't ElixIr (1 euro 20) drinkt en in Alma eet, kom je precies toe zonder aan je spaarbuffer van 140 euro te raken.`;
        }
        const savings = euro(persona.savingsBalance, 'nl');
        const cost = tip?.upfrontCost ? euro(tip.upfrontCost, 'nl') : '€ 9.500';
        return `Je spaarsaldo bedraagt momenteel ${savings}. De investering vraagt naar schatting ${cost}. Je kan dit uit eigen middelen betalen, maar met een KBC Energielening aan 3,49% behoud je je veilige financiële reserve voor onverwachte uitgaven.`;
      }

      case 'why_now': {
        if (persona.firstName === 'Jasper') {
          return `Omdat je vannacht 67 euro hebt uitgegeven op de Oude Markt en bij De Nijl (8 euro 50 voor je durum). Kate spreekt alleen op het moment dat het echt telt: de ochtend na een zware uitgave.`;
        }
        return `Kate let op het exacte moment. We analyseren het ritme van je verrichtingen en spreken pas als een gebeurtenis zoals een verhuis of een factuur relevant wordt. Zo voorkomen we onnodige meldingen.`;
      }

      case 'fixed_costs': {
        if (persona.firstName === 'Jasper') {
          return `Je hebt momenteel enkel Spotify Student als vast abonnement aan 5 euro 99 per maand. De rest van je 100 euro wekelijkse leefgeld is vrij voor je dagelijkse studentenleven.`;
        }
        const fixed = analysis.recurring.filter(
          (s) => s.active && !['savings', 'pension_saving'].includes(s.category)
        );
        const total = euro(
          fixed.reduce((acc, s) => acc + s.annualCost, 0),
          'nl'
        );
        return `Je hebt momenteel ${fixed.length} terugkerende betalingen die samen zo'n ${total} per jaar bedragen. Dit omvat onder meer je energievoorschot, internet en streamingdiensten.`;
      }

      case 'why_restraint': {
        const suppressedCount = analysis.suppressed.length;
        return `Kate kiest voor rust. We hebben bewust ${suppressedCount} mogelijke tips achtergehouden omdat ze onder je relevantiedrempel vielen of nog niet actueel waren. Alleen wat echt verschil maakt, komt op je scherm.`;
      }

      case 'swarm_agents': {
        if (persona.firstName === 'Jasper') {
          return `Drie gespecialiseerde agents werkten autonoom samen: de Cashflow Sentinel bewaakt je resterende € 28,50 en je veilige spaarbuffer; de Leuven Nightlife Radar berekende de € 41,70 prijsarbitrage tussen de Oude Markt en 't ElixIr; en de Campus Concierge stemde dit af op je studentenleven aan VTK en Alma Arenberg.`;
        }
        return `Drie gespecialiseerde background agents evalueren parallel je transacties: een Energy Sentinel, een Subscription Auditor en een Wealth & Liquidity Sentinel.`;
      }

      default:
        return `Ik help je graag met al je vragen over je verrichtingen en bancassurance-advies, ${firstName}.`;
    }
  }

  // English
  switch (questionId) {
    case 'afford_savings': {
      if (persona.firstName === 'Jasper') {
        return `Your current account balance is currently 28 euros 50. Sticking to fakbars and Alma student dining will get you through the week without touching your 140 euros savings buffer.`;
      }
      const savings = euro(persona.savingsBalance, 'en');
      const cost = tip?.upfrontCost ? euro(tip.upfrontCost, 'en') : '€9,500';
      return `Your savings balance is currently ${savings}. The estimated upfront investment is ${cost}. While you could fund this entirely yourself, an energy loan at 3.49% keeps your rainy-day cushion intact.`;
    }

    case 'why_now': {
      if (persona.firstName === 'Jasper') {
        return `Because you spent 67 euros last night on Oude Markt and at De Nijl. Kate speaks up only when it matters: the morning after a major spend.`;
      }
      return `Kate prioritises timing. We monitor the rhythm of your statements and only suggest options when triggered by a meaningful milestone, such as moving into a new home or receiving an oil bill.`;
    }

    case 'fixed_costs': {
      if (persona.firstName === 'Jasper') {
        return `You only have 1 recurring fixed cost: Spotify Student at 5 euros 99 a month. The rest of your 100 euro weekly allowance is available for daily student expenses.`;
      }
      const fixed = analysis.recurring.filter(
        (s) => s.active && !['savings', 'pension_saving'].includes(s.category)
      );
      const total = euro(
        fixed.reduce((acc, s) => acc + s.annualCost, 0),
        'en'
      );
      return `You have ${fixed.length} active recurring payments totalling approximately ${total} per year, including energy and subscriptions.`;
    }

    case 'why_restraint': {
      return `Kate values silence by default. We held back ${analysis.suppressed.length} potential recommendations because their financial impact or timing was below your threshold.`;
    }

    case 'swarm_agents': {
      if (persona.firstName === 'Jasper') {
        return `Three specialised agents collaborated: the Cashflow Sentinel protected your remaining 28 euros 50; the Leuven Nightlife Radar calculated the 41 euros 70 saving between Oude Markt and 't ElixIr; and the Campus Concierge tailored this to your student life at VTK and Alma Arenberg.`;
      }
      return `Three specialised background agents continuously evaluate your statements: an Energy Sentinel, a Subscription Auditor, and a Wealth & Liquidity Sentinel.`;
    }

    default:
      return `I am ready to help you navigate your transactions and financial opportunities, ${firstName}.`;
  }
}
