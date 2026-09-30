import { useEffect, useState } from 'react'

import { Hero } from './sections/Hero'
import { PhoneDemo } from './sections/PhoneDemo'
import { Scale } from './sections/Scale'
import { Simulator } from './sections/Simulator'
import { UseCases } from './sections/UseCases'

export default function App() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <header className={`nav${scrolled ? ' scrolled' : ''}`}>
        <div className="wrap">
          <a className="wordmark" href="#top" aria-label="Kate Radar, home">
            <span className="radar-dot" aria-hidden="true" />
            Kate Radar <small>for KBC</small>
          </a>
          <nav className="nav-links" aria-label="Sections">
            <a href="#idea">The idea</a>
            <a href="#try">Try it</a>
            <a href="#app">The app</a>
            <a href="#use-cases">Use cases</a>
            <a href="#scale">At scale</a>
          </nav>
          <a className="btn btn-primary btn-small" href="#app">
            Open the app
          </a>
        </div>
      </header>

      <main id="top">
        <Hero />

        <section id="idea" className="band" style={{ paddingTop: 0 }} aria-labelledby="idea-title">
          <div className="wrap">
            <h2 id="idea-title" className="sr-only">
              The idea
            </h2>
            <div className="principles">
              <div className="principle">
                <h3>No questions asked</h3>
                <p>
                  Everything comes from what KBC already has: counterparties, amounts, rhythm. The customer never fills in
                  a profile.
                </p>
              </div>
              <div className="principle">
                <h3>The right moment</h3>
                <p>
                  The heat pump comparison arrives with the oil bill. Solar panels, once the boxes are unpacked. Pension
                  saving, before 31 December.
                </p>
              </div>
              <div className="principle">
                <h3>Quiet by default</h3>
                <p>
                  One tip on the home screen at most. Too small or too uncertain stays silent. "Not for me" buys six
                  months of quiet.
                </p>
              </div>
              <div className="principle">
                <h3>Shows its work</h3>
                <p>
                  Every tip names the transactions behind it, the formula and the assumptions. Nothing is a black box.
                </p>
              </div>
            </div>
          </div>
        </section>

        <Simulator />
        <PhoneDemo />
        <UseCases />
        <Scale />

        <section className="band band-sheet" aria-labelledby="impact-title">
          <div className="wrap">
            <div className="section-head">
              <h2 id="impact-title">Why this matters to KBC.</h2>
              <p className="lede">
                A bank that notices at the right moment becomes the first place people look when life changes. That is
                worth more than any campaign.
              </p>
            </div>
            <div className="impact">
              <div>
                <h3>For the customer</h3>
                <p>
                  Hundreds of euros a year in concrete, personal savings, without doing any homework. Advice that arrives
                  when the decision is actually on the table.
                </p>
              </div>
              <div>
                <h3>For KBC</h3>
                <p>
                  Relevance instead of reach. Energy loans, insurance and savings products appear as the second step of a
                  tip that already helped, which is where trust turns into business.
                </p>
              </div>
              <div>
                <h3>For the energy transition</h3>
                <p>
                  Oil boilers, petrol cars and bare roofs, found one statement line at a time, with a financing path
                  attached. A heat pump tip alone is worth tonnes of CO₂ a year per household.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap">
          <span>Built at the Tectonic Hackathon, 30 September 2026, for the KBC challenge.</span>
          <span>Fictional customers and synthetic data. Estimates are indicative, not advice.</span>
        </div>
      </footer>
    </>
  )
}
