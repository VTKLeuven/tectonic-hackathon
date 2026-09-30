import {
  addDays,
  analyze,
  bookLiveEvent,
  buildPersona,
  daysBetween,
  todayISO,
  type Analysis,
  type ISODate,
  type PersonaData,
  type PersonaId,
  type Transaction,
} from './engine'

/** "Today" for the whole page. Every history is generated relative to it. */
export const TODAY: ISODate = todayISO()
export const YEAR_START: ISODate = addDays(TODAY, -364)

const cache = new Map<PersonaId, PersonaData>()

export function persona(id: PersonaId): PersonaData {
  let data = cache.get(id)
  if (!data) {
    data = buildPersona(id, TODAY)
    cache.set(id, data)
  }
  return data
}

/** History plus the persona's live events, placed on today. */
export function allTransactions(id: PersonaId): Transaction[] {
  const data = persona(id)
  return [...data.history, ...data.live.map((e) => bookLiveEvent(id, e, TODAY))]
}

export function analyzeAt(id: PersonaId, date: ISODate): Analysis {
  const data = persona(id)
  return analyze({
    transactions: allTransactions(id),
    today: date,
    profile: { firstName: data.persona.firstName, age: data.persona.age },
    openingBalance: data.openingBalance,
  })
}

export interface TimelineMarker {
  kind: 'event' | 'tip'
  date: ISODate
  offset: number
  label: { nl: string; en: string }
  id: string
}

const EVENT_SIGNALS = new Set(['moved', 'home_purchase', 'heating_oil', 'car_repair', 'energy_advance_up', 'energy_settlement'])

/**
 * Replay the year week by week and note when each tip first surfaced.
 * That is the "right moment" made visible.
 */
export function timeline(id: PersonaId): TimelineMarker[] {
  const markers: TimelineMarker[] = []
  const final = analyzeAt(id, TODAY)
  for (const s of final.signals) {
    if (!EVENT_SIGNALS.has(s.id) || s.date < YEAR_START) continue
    markers.push({ kind: 'event', date: s.date, offset: daysBetween(YEAR_START, s.date), label: s.label, id: `sig:${s.id}` })
  }
  for (const r of final.recurring) {
    if (!r.priceChange || r.priceChange.to <= r.priceChange.from || r.priceChange.date < YEAR_START) continue
    if (r.category === 'electricity' || r.category === 'gas') continue
    markers.push({
      kind: 'event',
      date: r.priceChange.date,
      offset: daysBetween(YEAR_START, r.priceChange.date),
      label: { nl: `${r.name} wordt duurder`, en: `${r.name} raises its price` },
      id: `price:${r.id}`,
    })
  }

  const seen = new Set<string>()
  const days: number[] = []
  for (let d = 0; d <= 364; d += 7) days.push(d)
  days.push(364)
  for (const d of days) {
    const date = addDays(YEAR_START, d)
    for (const insight of analyzeAt(id, date).insights) {
      if (seen.has(insight.type)) continue
      seen.add(insight.type)
      // Tips that already stood when the window opens have no moment to show.
      if (d === 0) continue
      markers.push({ kind: 'tip', date, offset: d, label: insight.title, id: `tip:${insight.type}` })
    }
  }
  return markers.sort((a, b) => a.offset - b.offset)
}

/** Median time the full pipeline takes for one customer in this browser. */
export function benchmark(ids: PersonaId[]): { ms: number; transactions: number } {
  const runs: number[] = []
  let transactions = 0
  for (let i = 0; i < 4; i++) {
    for (const id of ids) {
      const t0 = performance.now()
      const a = analyzeAt(id, TODAY)
      runs.push(performance.now() - t0)
      transactions = Math.max(transactions, a.transactions.length)
    }
  }
  runs.sort((a, b) => a - b)
  return { ms: runs[Math.floor(runs.length / 2)], transactions }
}
