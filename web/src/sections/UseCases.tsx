import { useMemo } from 'react'

import { analyzeAt, TODAY } from '../data'
import { euro, type InsightType, type PersonaId } from '../engine'

interface Row {
  line: string
  infers: string
  when: string
  says: string
  /** Where to read the live number from. */
  source?: { persona: PersonaId; type: InsightType; suffix?: string }
  worth?: string
}

const ENERGY: Row[] = [
  {
    line: 'DE VOS VERHUIZINGEN, NOTARISKANTOOR VAN DEN BROECK, IKEA',
    infers: 'Moved into a home they own',
    when: 'Six weeks after the move, once the boxes are unpacked',
    says: 'Solar panels, sized on their own electricity advance',
    source: { persona: 'sarah', type: 'solar' },
  },
  {
    line: 'GABRIELS BRANDSTOFFEN, MAZOUT 1500 L, - 1.575,00',
    infers: 'Heats with oil, uses about 1,500 litres a year',
    when: 'The day the delivery is booked',
    says: 'Heat pump comparison, with and without solar',
    source: { persona: 'sarah', type: 'heat_pump' },
  },
  {
    line: 'NOTARIS AKTE AANKOOP WONING + a first oil delivery',
    infers: 'Bought an older home',
    when: 'After the first heating bill',
    says: 'Heads-up on the Flemish renovation obligation, with a plan',
    worth: 'no deadline rush',
  },
  {
    line: 'GARAGE VERHAEGEN, - 1.340,00 and € 180 of fuel a month',
    infers: 'Petrol commuter at a decision point',
    when: 'Right after the repair bill',
    says: 'What the same kilometres cost electric, even without a home charger',
    source: { persona: 'tom', type: 'ev_switch' },
  },
  {
    line: 'ALLEGO LAADSESSIE, SHELL RECHARGE, INJECTIEVERGOEDING',
    infers: 'EV driver with solar panels, charging in public',
    when: 'After a few months of public charging',
    says: 'A home charger that runs on their own solar power',
    source: { persona: 'janssens', type: 'home_charging' },
  },
  {
    line: 'ENGIE JAARAFREKENING, - 486,20',
    infers: 'Energy bill shock',
    when: 'The day the settlement lands',
    says: 'Compare contracts in the regulator\'s V-test',
    source: { persona: 'janssens', type: 'energy_contract', suffix: 'up to ' },
  },
]

const GENERAL: Row[] = [
  {
    line: 'NETFLIX.COM 13,99 then 15,99, plus Disney+ and Streamz',
    infers: 'Three video services at once, one just got pricier',
    when: 'Right after the price rise',
    says: 'Keep one, rotate monthly, miss nothing',
    source: { persona: 'sarah', type: 'streaming_rotation', suffix: 'up to ' },
  },
  {
    line: 'DISNEY PLUS 1,99, then 10,99 every month',
    infers: 'A trial quietly turned into a subscription',
    when: 'Within a month of the first full charge',
    says: 'Meant to keep it? Then there is nothing to do',
    source: { persona: 'tom', type: 'trial_converted' },
  },
  {
    line: 'LOON every month, no PENSIOENSPAREN in a year',
    infers: 'Regular income, no pension saving',
    when: 'Autumn, before the 31 December deadline',
    says: 'The tax reduction they are leaving on the table',
    source: { persona: 'tom', type: 'pension_saving' },
  },
  {
    line: 'SPOTIFY 11,99 then 12,99',
    infers: 'A price rise of € 12 a year',
    when: 'Never',
    says: 'Nothing. Too small to be worth an interruption',
    worth: 'silence',
  },
]

function useWorth(rows: Row[]) {
  return useMemo(() => {
    const byPersona = new Map<PersonaId, ReturnType<typeof analyzeAt>>()
    return rows.map((row) => {
      if (row.worth || !row.source) return row.worth ?? ''
      let a = byPersona.get(row.source.persona)
      if (!a) {
        a = analyzeAt(row.source.persona, TODAY)
        byPersona.set(row.source.persona, a)
      }
      const insight = a.insights.find((i) => i.type === row.source!.type)
      if (!insight?.annualValue) return ''
      return `${row.source.suffix ?? ''}${euro(insight.annualValue, 'en')} a year`
    })
  }, [rows])
}

function Ledger({ rows, caption }: { rows: Row[]; caption: string }) {
  const worth = useWorth(rows)
  return (
    <table className="ledger">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr>
          <th scope="col">On the statement</th>
          <th scope="col">Kate infers</th>
          <th scope="col">She speaks up</th>
          <th scope="col">She says</th>
          <th scope="col" style={{ textAlign: 'right' }}>
            Worth
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={row.line}>
            <td className="line-cell" data-label="On the statement">
              <span className="raw">{row.line}</span>
            </td>
            <td data-label="Kate infers">{row.infers}</td>
            <td className="when" data-label="She speaks up">
              {row.when}
            </td>
            <td className="says" data-label="She says">
              {row.says}
            </td>
            <td className="worth num" data-label="Worth">
              {worth[i]}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function UseCases() {
  return (
    <section id="use-cases" className="band" aria-labelledby="uc-title">
      <div className="wrap">
        <div className="section-head">
          <h2 id="uc-title">Start with energy. Then everything else.</h2>
          <p className="lede">
            Energy is where a timely nudge changes most: big bills, big savings, a real dent in CO₂, and a natural bridge
            to KBC's energy loans. The same pipeline handles any moment a statement reveals. Amounts below are computed
            live for the demo customers.
          </p>
        </div>

        <Ledger rows={ENERGY} caption="Energy use cases" />

        <div className="ledger-group">
          <h3>Beyond energy</h3>
          <Ledger rows={GENERAL} caption="General use cases" />
        </div>

        <div className="ledger-group">
          <h3>Next detectors, same pipeline</h3>
          <div className="next">
            <p>
              <strong>A baby on the way</strong>
              Payments to a maternity ward and a baby store: childcare costs, the growth package, a savings account in
              the child's name.
            </p>
            <p>
              <strong>A first salary</strong>
              A new employer in the credits: a buffer target, a first standing order to savings, a hospitalisation
              insurance check.
            </p>
            <p>
              <strong>A rent increase</strong>
              The same landlord, a higher amount: what that does to the monthly budget, and what buying would cost
              instead.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
