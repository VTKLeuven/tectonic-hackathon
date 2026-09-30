import { useLayoutEffect, useMemo, useRef, useState } from 'react'

import { analyzeAt, TODAY } from '../data'
import { euro, formatMoney, formatNumber } from '../engine'

/**
 * The hero is a real statement: the last lines on Sarah's account, as the
 * bank books them. One of them gets the highlighter, and Kate writes in the
 * margin. That is the whole concept in one picture.
 */
export function Hero() {
  const { lines, tip, momentId } = useMemo(() => {
    const a = analyzeAt('sarah', TODAY)
    const tip = a.insights.find((i) => i.type === 'heat_pump') ?? a.featured
    const momentId = tip?.evidence[0]?.transactionId
    const lines = [...a.transactions].reverse().slice(0, 8)
    return { lines, tip, momentId }
  }, [])

  // Pin Kate's note just under the highlighted line, wherever it ends up.
  const marked = useRef<HTMLDivElement>(null)
  const [noteTop, setNoteTop] = useState(120)
  useLayoutEffect(() => {
    const el = marked.current
    if (!el) return
    const place = () => setNoteTop(el.offsetTop + el.offsetHeight + 10)
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [])

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="wrap">
        <div>
          <h1 id="hero-title">Advice that doesn't ask questions.</h1>
          <p className="lede">
            Kate Radar reads the transactions KBC already processes and turns the few that matter into timely, explainable
            tips. A move becomes a solar estimate, an oil delivery becomes a heat pump comparison, a fourth streaming
            service becomes a question. No forms, no profile, no noise.
          </p>
          <div className="hero-actions">
            <a className="btn btn-primary" href="#try">
              Try it on three customers
            </a>
            <a className="btn btn-quiet" href="#app">
              See it in KBC Mobile
            </a>
          </div>
          <p className="hero-note">A proof of concept for the KBC challenge at the Tectonic Hackathon.</p>
        </div>

        <figure className="statement animate" aria-label="Sarah's latest transactions, with one line highlighted by Kate" style={{ margin: 0 }}>
          <div className="statement-head">
            <span>
              <strong>KBC-Plus Rekening</strong> Sarah Peeters
            </span>
            <span className="num">BE21 7350 4412 8837</span>
          </div>
          {lines.map((tx, i) => (
            <div
              key={tx.id}
              ref={tx.id === momentId ? marked : undefined}
              className={`st-line${tx.id === momentId ? ' marked moment' : ''}`}
              style={{ ['--i' as string]: i }}
            >
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
          {tip && (
            <aside className="annotation" style={{ top: noteTop }} aria-label="Kate's note">
              <div className="who">
                <i aria-hidden="true" /> Kate, a moment later
              </div>
              <h3>{tip.title.en}</h3>
              <p>{tip.teaser.en}</p>
              <div className="chips">
                {tip.annualValue !== undefined && <span className="chip save">{euro(tip.annualValue, 'en')} a year</span>}
                {tip.co2SavedKg !== undefined && (
                  <span className="chip save">-{formatNumber(tip.co2SavedKg / 1000, 'en', 1)} t CO₂</span>
                )}
                <span className="chip kate">1 transaction as evidence</span>
              </div>
            </aside>
          )}
        </figure>
      </div>
    </section>
  )
}
