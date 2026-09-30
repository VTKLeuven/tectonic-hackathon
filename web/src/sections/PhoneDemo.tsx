import QRCode from 'qrcode'
import { useEffect, useRef, useState } from 'react'

import { persona } from '../data'
import { PERSONA_IDS, PERSONAS, type PersonaId } from '../engine'

/** Where the Expo web build is served. Same origin in Docker; override for local dev. */
const APP_URL: string = import.meta.env.VITE_APP_URL ?? '/app/'

interface RuntimeConfig {
  /** exp:// address of the Expo dev server, for Expo Go. Set by the Docker entrypoint. */
  expoUrl?: string
}

/**
 * The real app, running in a phone frame. The buttons talk to it with
 * postMessage (same origin only), so the jury can make a transaction happen
 * and see Kate's notification arrive.
 */
export function PhoneDemo() {
  const frame = useRef<HTMLIFrameElement>(null)
  const [id, setId] = useState<PersonaId>('sarah')
  const [booked, setBooked] = useState<Record<string, boolean>>({})
  const [config, setConfig] = useState<RuntimeConfig>({})
  const [qr, setQr] = useState<string | null>(null)

  const appOrigin = new URL(APP_URL, window.location.href).origin
  const sameOrigin = appOrigin === window.location.origin
  const src = `${APP_URL}?embed=1&persona=${id}`

  useEffect(() => {
    fetch('/config.json', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : {}))
      .then((c: RuntimeConfig) => setConfig(c))
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    if (!config.expoUrl || !/^exps?:\/\/[\w.:-]+\/?$/.test(config.expoUrl)) return
    QRCode.toDataURL(config.expoUrl, { margin: 1, width: 264, color: { dark: '#003665', light: '#ffffff' } })
      .then(setQr)
      .catch(() => setQr(null))
  }, [config.expoUrl])

  function send(action: 'trigger' | 'reset', value?: string) {
    frame.current?.contentWindow?.postMessage({ source: 'kate-demo', action, value }, appOrigin)
  }

  function choose(next: PersonaId) {
    setId(next)
    setBooked({})
  }

  const live = persona(id).live

  return (
    <section id="app" className="band band-navy" aria-labelledby="app-title">
      <div className="wrap phone-layout">
        <div className="phone">
          <iframe ref={frame} key={src} src={src} title="KBC Mobile prototype with Kate Radar" />
        </div>
        <div className="controls">
          <div>
            <h2 id="app-title">The same brain, inside KBC Mobile.</h2>
            <p className="lede" style={{ marginTop: 20 }}>
              Kate already lives in the KBC app. Kate Radar gives her something to say before you ask: one quiet card on
              the home screen, a notification only when it counts, and a "why am I seeing this" on every tip.
            </p>
          </div>

          <div>
            <h3>1. Pick a customer</h3>
            <div className="control-row" role="group" aria-label="Customer in the app">
              {PERSONA_IDS.map((pid) => (
                <button key={pid} type="button" className="btn btn-quiet btn-small" aria-pressed={pid === id} onClick={() => choose(pid)}>
                  {PERSONAS[pid].firstName}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3>2. Make something happen</h3>
            {live.map((e) => (
              <div key={e.id} style={{ marginTop: 12 }}>
                <p className="muted small">{e.hint.en}</p>
                <div className="control-row">
                  <button
                    type="button"
                    className="btn btn-primary btn-small"
                    disabled={!sameOrigin || booked[e.id]}
                    onClick={() => {
                      send('trigger', e.id)
                      setBooked((b) => ({ ...b, [e.id]: true }))
                    }}
                  >
                    {booked[e.id] ? 'Booked' : `Book: ${e.label.en}`}
                  </button>
                  <button
                    type="button"
                    className="btn btn-quiet btn-small"
                    disabled={!sameOrigin}
                    onClick={() => {
                      send('reset')
                      setBooked({})
                    }}
                  >
                    Reset
                  </button>
                </div>
              </div>
            ))}
            {!sameOrigin && (
              <p className="muted small" style={{ marginTop: 10 }}>
                The app runs on another origin in this setup, so these buttons are off. Use the Demo screen inside the
                app, or run everything with Docker.
              </p>
            )}
          </div>

          <div>
            <h3>3. Or on your own phone</h3>
            {qr ? (
              <div className="qr" style={{ marginTop: 12 }}>
                <img src={qr} alt={`QR code for ${config.expoUrl}`} />
                <p className="muted small">
                  Scan with Expo Go (Android) or the camera (iOS). Hold the KBC logo on the login screen to open the demo
                  controls.
                </p>
              </div>
            ) : (
              <p className="muted small" style={{ marginTop: 8 }}>
                Start the Expo server with <code>docker compose --profile expo up</code> and scan the QR code it prints
                with Expo Go. Any five digits unlock the app.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
