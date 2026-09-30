import { useEffect, useState } from 'react'

import { benchmark } from '../data'
import { formatNumber, PERSONA_IDS } from '../engine'

const CUSTOMERS = 2_300_000

/**
 * How this runs for every KBC customer, with a number measured on the spot:
 * the full pipeline, timed in the visitor's own browser.
 */
export function Scale() {
  const [bench, setBench] = useState<{ ms: number; transactions: number } | null>(null)

  useEffect(() => {
    // Let the page settle first; this is a measurement, not a loading step.
    const id = window.setTimeout(() => setBench(benchmark(PERSONA_IDS)), 900)
    return () => window.clearTimeout(id)
  }, [])

  const cpuHours = bench ? (CUSTOMERS * bench.ms) / 3_600_000 : null
  const minutesOn100 = cpuHours ? (cpuHours * 60) / 100 : null

  return (
    <section id="scale" className="band band-navy" aria-labelledby="scale-title">
      <div className="wrap">
        <div className="section-head">
          <h2 id="scale-title">Built to run for 2.3 million customers.</h2>
          <p className="lede">
            No model call per customer, no questionnaire, no manual segment. A pure function over the transactions the
            bank already stores, evaluated whenever a new one arrives.
          </p>
        </div>

        <ol className="pipeline">
          <li>
            <h3>Enrich</h3>
            <p>Each transaction gets a merchant and a category, from the counterparty and the communication.</p>
          </li>
          <li>
            <h3>Find the rhythm</h3>
            <p>Recurring payments surface on their own, with price rises and trials that quietly converted.</p>
          </li>
          <li>
            <h3>Read the situation</h3>
            <p>Weak hints combine into life events: a move, an oil-heated home, an EV. Each with a confidence and its proof.</p>
          </li>
          <li>
            <h3>Spot the opportunity</h3>
            <p>One small detector per kind of tip. A new use case is a new detector, reviewed like any other code.</p>
          </li>
          <li>
            <h3>Pick the moment</h3>
            <p>
              <code>value × confidence × timing × preference</code>. Then a delivery policy: one tip on the home screen,
              a notification only when fresh and important.
            </p>
          </li>
        </ol>

        <div className="facts">
          <div className="fact">
            <b className="num">{bench ? `${formatNumber(bench.ms, 'en', 1)} ms` : 'Measuring'}</b>
            <p>
              for the full pipeline on one customer{bench ? ` (${bench.transactions} transactions)` : ''}, measured just now
              in your browser.
            </p>
          </div>
          <div className="fact">
            <b className="num">{minutesOn100 !== null ? `${formatNumber(Math.max(1, Math.round(minutesOn100)), 'en', 0)} min` : '...'}</b>
            <p>to recompute every KBC customer from scratch on 100 cores. In practice only customers with a new transaction are re-run.</p>
          </div>
          <div className="fact">
            <b className="num">0</b>
            <p>questions asked, and 0 bytes sent to a third party. The analysis runs where the transactions already are.</p>
          </div>
        </div>

        <div className="fine">
          <div>
            <h3>It learns without surveillance</h3>
            <p>
              Every tip type starts from a prior learned across all customers: how often a solar tip was found useful.
              A customer's own "useful" and "not for me" taps update it for them. Only these counts are learned, not the
              transactions.
            </p>
          </div>
          <div>
            <h3>It explains itself</h3>
            <p>
              Every tip carries the transactions that triggered it, the formula, and the assumptions. That keeps it
              reviewable for compliance, and honest for the customer. Estimates are labelled as estimates.
            </p>
          </div>
          <div>
            <h3>It knows when to be quiet</h3>
            <p>
              Tips below a score threshold never surface. A dismissed type goes silent for six months. A price rise of
              € 12 a year is not worth an interruption, so Kate lets it go.
            </p>
          </div>
          <div>
            <h3>Where a language model fits</h3>
            <p>
              Not in the decision. A model can draft the wording of each tip type once, offline, reviewed by people, and
              answer follow-up questions in Kate's chat. The numbers always come from the engine.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
