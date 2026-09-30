import { useDeferredValue, useMemo, useState } from 'react'

import { analyzeAt, persona, timeline, TODAY, YEAR_START, type TimelineMarker } from '../data'
import {
  addDays,
  daysBetween,
  euro,
  formatDate,
  formatMoney,
  PERSONA_IDS,
  PERSONAS,
  shortMonth,
  type Lang,
  type PersonaId,
  type RankedInsight,
} from '../engine'

const SCORE_PARTS: { key: 'value' | 'confidence' | 'timeliness' | 'affinity'; label: string }[] = [
  { key: 'value', label: 'Value' },
  { key: 'confidence', label: 'Confidence' },
  { key: 'timeliness', label: 'Timing' },
  { key: 'affinity', label: 'Preference' },
]

/**
 * Drag through a customer's year and watch the engine: what it reads,
 * what it infers, what it would say, and what it keeps to itself.
 * Everything here is computed live by the same code the app runs.
 */
export function Simulator() {
  const [id, setId] = useState<PersonaId>('sarah')
  const [offset, setOffset] = useState(364)
  const [lang, setLang] = useState<Lang>('en')
  const [open, setOpen] = useState<string | null>(null)
  const deferredOffset = useDeferredValue(offset)

  const date = addDays(YEAR_START, deferredOffset)
  const analysis = useMemo(() => analyzeAt(id, date), [id, date])
  const markers = useMemo(() => timeline(id), [id])
  const p = persona(id).persona

  const evidence = new Set(analysis.insights.flatMap((i) => i.evidence.map((e) => e.transactionId).filter(Boolean) as string[]))
  const moment = analysis.featured?.evidence[0]?.transactionId
  const lines = [...analysis.transactions].reverse().slice(0, 14)

  const months = useMemo(() => {
    const out: { key: string; offset: number }[] = []
    for (let d = 0; d <= 364; d++) {
      const day = addDays(YEAR_START, d)
      if (day.endsWith('-01')) out.push({ key: day.slice(0, 7), offset: d })
    }
    return out
  }, [])

  function choose(next: PersonaId) {
    setId(next)
    setOffset(364)
    setOpen(null)
  }

  return (
    <section id="try" className="band band-sheet" aria-labelledby="try-title">
      <div className="wrap">
        <div className="section-head">
          <h2 id="try-title">Drag through a customer's year.</h2>
          <p className="lede">
            Pick a customer and move through their last twelve months. The statement, the conclusions and the tips below
            are computed live in your browser, by the same engine that runs in the app.
          </p>
        </div>

        <div className="personas" role="group" aria-label="Customer">
          {PERSONA_IDS.map((pid) => {
            const pp = PERSONAS[pid]
            return (
              <button key={pid} type="button" className="persona" aria-pressed={pid === id} onClick={() => choose(pid)}>
                <span className="avatar">{pp.initials}</span>
                <strong>
                  {pp.name}, {pp.age}
                </strong>
                <span>{pp.tagline.en}</span>
              </button>
            )
          })}
        </div>
        <p className="story">{p.story.en}</p>

        <div className="timeline">
          <div className="timeline-top">
            <div>
              <div className="small muted">{deferredOffset === 364 ? 'Today' : `${daysBetween(date, TODAY)} days ago`}</div>
              <div className="timeline-date num">{formatDate(date, 'en', true)}</div>
            </div>
            <div className="legend" aria-hidden="true">
              <span>
                <i style={{ background: 'var(--marker)' }} /> Something happened
              </span>
              <span>
                <i style={{ background: 'var(--cyan)' }} /> Kate spoke up
              </span>
            </div>
          </div>
          <div className="track">
            <div className="track-rail" />
            <div className="track-fill" style={{ width: `${(offset / 364) * 100}%` }} />
            {markers.map((m) => (
              <Marker key={m.id + m.offset} marker={m} onPick={setOffset} />
            ))}
            <input
              type="range"
              min={0}
              max={364}
              step={1}
              value={offset}
              onChange={(e) => setOffset(Number(e.target.value))}
              aria-label="Date"
              aria-valuetext={formatDate(date, 'en', true)}
            />
          </div>
          <div className="months" aria-hidden="true">
            {months.map((m) => (
              <span key={m.key}>{shortMonth(m.key, 'en')}</span>
            ))}
          </div>
        </div>

        <div className="panes">
          <div className="pane">
            <div className="pane-head">
              <h3>The statement</h3>
              <p>What the bank already has. Highlighted lines are evidence.</p>
            </div>
            {lines.map((tx) => (
              <div key={tx.id} className={`st-line${evidence.has(tx.id) ? ' marked' : ''}${tx.id === moment ? ' moment' : ''}`}>
                <span className="st-date num">
                  {tx.date.slice(8, 10)}/{tx.date.slice(5, 7)}
                </span>
                <span className="st-party">
                  {tx.counterparty}
                  <span className="st-desc">{tx.description}</span>
                </span>
                <span className={`st-amount num${tx.amount > 0 ? ' credit' : ''}`}>{formatMoney(tx.amount, 'nl')}</span>
              </div>
            ))}
          </div>

          <div className="pane">
            <div className="pane-head">
              <h3>What Kate infers</h3>
              <p>Situations, each with a confidence and its proof.</p>
            </div>
            {analysis.signals.length === 0 && <p className="empty">Nothing yet.</p>}
            {analysis.signals.map((s) => (
              <div key={s.id} className="signal">
                <div>{s.label.en}</div>
                <div className="conf">
                  <span className="num">{Math.round(s.confidence * 100)}%</span>
                  <span className="bar">
                    <i style={{ width: `${s.confidence * 100}%` }} />
                  </span>
                  <span className="num">
                    {s.evidence.length} {s.evidence.length === 1 ? 'line' : 'lines'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="pane pane-say">
            <div className="pane-head" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start' }}>
              <div>
                <h3>What Kate would say</h3>
                <p>Ranked by value, confidence, timing and preference. The home screen favours what just happened.</p>
              </div>
              <div className="lang-toggle" role="group" aria-label="Language of the tips">
                {(['en', 'nl'] as const).map((l) => (
                  <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)}>
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            {analysis.insights.length === 0 && <p className="empty">Nothing worth your attention yet. Kate stays quiet.</p>}
            {analysis.insights.map((insight) => (
              <Tip
                key={insight.id}
                insight={insight}
                lang={lang}
                featured={analysis.featured?.id === insight.id}
                open={open === insight.id}
                onToggle={() => setOpen(open === insight.id ? null : insight.id)}
              />
            ))}
            {analysis.suppressed.length > 0 && (
              <div className="held">
                <h4>Held back on purpose</h4>
                <ul>
                  {analysis.suppressed.map((s, i) => (
                    <li key={i}>
                      <span className="muted">{s.type.replace('_', ' ')}:</span> {s.reason[lang]}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function Marker({ marker, onPick }: { marker: TimelineMarker; onPick: (offset: number) => void }) {
  return (
    <button
      type="button"
      className={`marker ${marker.kind}`}
      style={{ left: `${(marker.offset / 364) * 100}%`, top: marker.kind === 'tip' ? 0 : 8 }}
      title={`${formatDate(marker.date, 'en')}: ${marker.label.en}`}
      aria-label={`${formatDate(marker.date, 'en')}: ${marker.label.en}`}
      onClick={() => onPick(marker.offset)}
    >
      <span className="pin" />
      <span className="stem" style={{ height: marker.kind === 'tip' ? 26 : 18 }} />
    </button>
  )
}

function Tip({
  insight,
  lang,
  featured,
  open,
  onToggle,
}: {
  insight: RankedInsight
  lang: Lang
  featured: boolean
  open: boolean
  onToggle: () => void
}) {
  return (
    <div className={`tip${featured ? ' featured' : ''}`}>
      <button type="button" aria-expanded={open} onClick={onToggle}>
        <span>
          <span className="tip-title">{insight.title[lang]}</span>
          <span className="chips">
            {featured && <span className="chip kate">On the home screen</span>}
            {insight.annualValue !== undefined && (
              <span className="chip save">
                {euro(insight.annualValue, lang)}
                {lang === 'nl' ? '/jaar' : '/yr'}
              </span>
            )}
            <span className="chip">{insight.domain}</span>
          </span>
        </span>
        <span className="tip-score">
          <b className="num">{Math.round(insight.score.total * 100)}</b>
          score
        </span>
        <span className="score-parts">
          {SCORE_PARTS.map((part) => {
            const v = part.key === 'affinity' ? insight.score.affinity / 1.4 : insight.score[part.key]
            return (
              <span key={part.key} className="score-part">
                {part.label}
                <span className="bar">
                  <i style={{ width: `${Math.min(1, v) * 100}%` }} />
                </span>
              </span>
            )
          })}
        </span>
      </button>
      {open && (
        <div className="tip-body">
          <p>{insight.summary[lang]}</p>
          <h4>{lang === 'nl' ? 'Waarom nu' : 'Why now'}</h4>
          <p>{insight.trigger[lang]}</p>
          <h4>{lang === 'nl' ? 'Waarom zie ik dit' : 'Why am I seeing this'}</h4>
          <ul>
            {insight.reasons.map((r, i) => (
              <li key={i}>{r[lang]}</li>
            ))}
          </ul>
          {insight.breakdown.length > 0 && (
            <>
              <h4>{lang === 'nl' ? 'Zo rekende Kate' : 'How Kate calculated it'}</h4>
              <table className="breakdown">
                <tbody>
                  {insight.breakdown.map((l, i) => (
                    <tr key={i} className={l.strong ? 'strong' : undefined}>
                      <td>{l.label[lang]}</td>
                      <td>{l.value[lang]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
    </div>
  )
}
