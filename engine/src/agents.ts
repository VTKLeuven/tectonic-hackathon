import { l } from './format';
import type { Analysis, SwarmAgent } from './types';

export function resolveSwarmAgents(analysis: Analysis, personaId?: string): SwarmAgent[] {
  // If Jasper or nightlife insight present:
  const isJasper = personaId === 'jasper' || analysis.insights.some((i) => i.type === 'nightlife_budget');

  if (isJasper) {
    return [
      {
        id: 'cashflow_sentinel',
        name: 'Cashflow Sentinel',
        role: l('Liquiditeit & Weekbudget', 'Liquidity & Weekly Runway'),
        icon: 'shield',
        status: 'active',
        confidence: 0.98,
        verdict: l(
          'Kritieke uitgave gedetecteerd (€ 67 vannacht). Nog € 28,50 zichtrekening tot maandag. Daglimiet: € 5,70. Spaarbuffer van € 140 blijft onaangeroerd.',
          'Critical spend detected (€67 last night). €28.50 remaining until Monday. Daily limit: €5.70. €140 savings buffer stays untouched.',
        ),
        metrics: [
          { label: l('Resterend', 'Remaining'), value: '€ 28,50' },
          { label: l('Dagbudget', 'Daily limit'), value: '€ 5,70 / dag' },
          { label: l('Spaarbuffer', 'Savings buffer'), value: '€ 140,00' },
        ],
      },
      {
        id: 'nightlife_radar',
        name: 'Leuven Nightlife Radar',
        role: l('Horeca & Prijsarbitrage', 'Nightlife & Price Arbitrage'),
        icon: 'beer',
        status: 'active',
        confidence: 0.95,
        verdict: l(
          "Oude Markt (€ 4,00/consumptie) is 3,3x duurder dan Fakbar 't ElixIr (€ 1,20) en Recup (€ 1,50). Nachtelijke besparing: € 41,70.",
          "Oude Markt (€4.00/drink) is 3.3x pricier than Fakbar 't ElixIr (€1.20) and Recup (€1.50). Nightly savings: €41.70.",
        ),
        metrics: [
          { label: l('Nachtuitgave', 'Night spend'), value: '€ 67,00' },
          { label: l('Durum De Nijl', 'Durum De Nijl'), value: '€ 8,50' },
          { label: l("Besparing 't ElixIr", "Saving 't ElixIr"), value: '€ 41,70' },
        ],
      },
      {
        id: 'campus_concierge',
        name: 'Campus Concierge',
        role: l('VTK & Studentenvoordelen', 'VTK & Student Perks'),
        icon: 'graduation-cap',
        status: 'active',
        confidence: 0.92,
        verdict: l(
          'Ingenieursstudent aan VTK. Aanbeveling: Alma 3 Arenberg (€ 4,80 dagschotel) en cursusdienst CuDi i.p.v. retail boekhandel.',
          'VTK Engineering student. Recommendation: Alma 3 Arenberg (€4.80 daily special) and syllabus via CuDi instead of retail.',
        ),
        metrics: [
          { label: l('Campus', 'Campus'), value: 'Arenberg (VTK)' },
          { label: l('Alma maaltijd', 'Alma meal'), value: '€ 4,80' },
          { label: l('Sportkaart', 'Sports card'), value: 'Actief' },
        ],
      },
    ];
  }

  // Default agents for other personas (Sarah, Tom, Els)
  return [
    {
      id: 'energy_sentinel',
      name: 'Energy Sentinel',
      role: l('Energieverbruik & Verduurzaming', 'Energy Consumption & Transition'),
      icon: 'shield',
      status: 'active',
      confidence: 0.94,
      verdict: l(
        'Monitort stroomvoorschot en verwarmingsprofiel uit bankverrichtingen.',
        'Monitors energy advances and heating profile from bank statements.',
      ),
      metrics: [
        { label: l('CO2-uitstoot', 'CO2 Footprint'), value: `${(analysis.energy.co2Kg / 1000).toFixed(1)} t` },
        { label: l('Jaarkost energie', 'Annual energy'), value: `€ ${Math.round(analysis.energy.annual.total)}` },
      ],
    },
    {
      id: 'subscription_auditor',
      name: 'Subscription Auditor',
      role: l('Vaste Abonnementen & Sluipkosten', 'Subscriptions & Creeping Costs'),
      icon: 'beer',
      status: 'active',
      confidence: 0.96,
      verdict: l(
        `${analysis.recurring.filter((s) => s.active).length} actieve doorlopende opdrachten automatisch herkend.`,
        `${analysis.recurring.filter((s) => s.active).length} active recurring mandates detected automatically.`,
      ),
      metrics: [
        { label: l('Abonnementen', 'Subscriptions'), value: `${analysis.recurring.filter((s) => s.active).length}` },
      ],
    },
    {
      id: 'wealth_concierge',
      name: 'Wealth & Liquidity Sentinel',
      role: l('Liquiditeit & Fiscale Optimalisatie', 'Liquidity & Tax Optimization'),
      icon: 'graduation-cap',
      status: 'active',
      confidence: 0.91,
      verdict: l(
        'Bewaakt veilige spaarbuffer en signaleert fiscale opportuniteiten zoals pensioensparen.',
        'Guards safety cushion and identifies tax opportunities like pension saving.',
      ),
      metrics: [
        { label: l('Veilige buffer', 'Safety buffer'), value: 'Gewaarborgd' },
      ],
    },
  ];
}
