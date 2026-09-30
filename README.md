# Kate Radar

**Advice that doesn't ask questions.** A proof of concept for the KBC challenge at the Tectonic Hackathon (30 September 2026).

Kate Radar reads the transactions KBC already processes and turns the few that matter into timely, explainable tips inside KBC Mobile. It never asks the customer anything. A move becomes a solar panel estimate, an oil delivery becomes a heat pump comparison, a fourth streaming service becomes a question.

- **No questions asked.** Only data the bank already has: counterparty, amount, communication, rhythm.
- **The right moment.** Each tip type has its own timing curve: the heat pump comparison arrives with the oil bill, solar panels once the boxes of a move are unpacked, pension saving before 31 December.
- **Quiet by default.** At most one tip on the home screen. Too small, too uncertain, or dismissed means silent.
- **Shows its work.** Every tip lists the transactions behind it, the calculation and the assumptions.

Energy is the deep use case (solar, heat pump, EPC renovation obligation, EV switch, home charging, energy contract). Subscriptions, savings and a student's budget after a night out in Leuven show that the same pipeline is general.

**Demo video (2:57):** [docs/kate-radar-demo.mp4](docs/kate-radar-demo.mp4)

## Description

Banks personalise by asking: forms, questionnaires, campaigns. KBC already holds the richest signal there is, every transaction. Kate Radar reads it and turns the few moments that matter into timely, explainable advice inside KBC Mobile, delivered by Kate, without asking the customer a single question.

A notary deed and a moving company mean Sarah moved into a home she owns; once the boxes are unpacked, Kate suggests solar panels sized on her own electricity advance. The day a € 1,575 heating oil delivery is booked, Kate compares a heat pump: about € 600 a year and 3.5 t CO₂ less. A garage bill triggers an EV comparison, a fourth streaming service triggers a question, and a € 12 Spotify price rise stays silent.

Every tip shows why now, which transactions triggered it, the calculation and its assumptions. Tips are ranked on value × confidence × timing × preference, where preference is learned across customers and updated by one-tap feedback, and the home screen shows at most one. With Kate Voice, Kate reads a tip aloud and answers follow-up questions about it.

The engine is a pure TypeScript function, about 4 ms per customer and with no language model in the decision loop, so it scales to 2.3 million customers. It powers an Expo prototype of KBC Mobile and a demo website with a live simulator. Everything runs with `docker compose up`.

## Run the demo

Requires Docker.

```bash
docker compose up --build
```

Open **http://localhost:8080**: the demo website, with the app running live in a phone frame. Use "Make something happen" to book a transaction and watch Kate react.

### On a real phone (Expo Go)

```bash
HOST_IP=$(ipconfig getifaddr en0) docker compose --profile expo up --build   # macOS; use your LAN IP elsewhere
```

The website then shows a QR code for Expo Go (phone and laptop on the same Wi-Fi). Any five digits unlock the app. Long-press the KBC logo on the login screen (or go to Meer, Demo) for the demo controls: switch customer, book a live transaction, reset.

### Without Docker

```bash
cd engine && npm install && npm test        # engine test suite
cd mobile && npm install && npm start       # Expo dev server; press w for web, scan for Expo Go
cd web && npm install && npm run dev        # website on http://localhost:5173
```

In local dev the site and the app run on different ports, so the website's "book a transaction" buttons are disabled (the app only accepts messages from its own origin). Use the Demo screen in the app instead, or Docker.

## Three-minute demo script

1. **Website hero (20 s).** A real statement. One line gets the highlighter: an oil delivery. Kate's note in the margin: a heat pump saves about €600 a year and 3.5 t CO₂.
2. **Simulator, Sarah (60 s).** Drag through her year. In June a notary appears, in July a mover; the engine infers "moved into a home she owns" with 97% confidence. Kate waits: the solar tip enters her list a week after the move and only takes the home screen after about six weeks, sized on Sarah's own electricity advance. When Netflix raises its price, the streaming tip briefly takes over. At the end the oil delivery lands and the heat pump tip wins the home screen. Open a tip: why now, why me, the calculation.
3. **Restraint (20 s).** Switch to Tom: the Spotify price rise of €12 a year is held back on purpose. Switch to Els: no solar tip, she already has panels.
4. **The app (60 s).** In the phone frame, book the heating oil delivery. The transaction appears, a notification from Kate follows, the home card changes. Open it, tap "Waarom zie ik dit?", then "Bereken je energielening": the monthly saving is set against the loan.
5. **Scale (20 s).** The pipeline, and the benchmark measured live in the browser: a few milliseconds per customer, about a minute for all 2.3 million on 100 cores.

## How it works

```
engine/   The recommendation engine. Pure TypeScript, no dependencies, shared by app and website.
mobile/   KBC Mobile look-alike in Expo (SDK 57, Expo Router). Runs in Expo Go and on the web.
web/      Demo website (Vite + React). Imports the same engine.
docker/   nginx config for the single demo image.
```

The engine is one pure function, `analyze(transactions, today, profile, feedback)`:

1. **Enrich** (`merchants.ts`): recognise merchant and category from the raw statement line.
2. **Rhythm** (`recurring.ts`): find recurring payments, price changes and converted trials.
3. **Situation** (`signals.ts`): combine weak hints into life events with a confidence and evidence (moved, bought a home, heats with oil, drives electric).
4. **Opportunities** (`detectors/`): one small detector per tip type. Each returns a tip with numbers, reasons, evidence and assumptions, or an explicit reason to stay silent.
5. **Moment** (`rank.ts`): `score = value × confidence × timing × preference`. Preference is a Beta posterior per tip type: a population prior, updated by the customer's own "useful" and "not for me" taps. A delivery policy picks at most one tip for the home screen and favours fresh events.

All numbers the engine does not read from transactions live in `engine/src/assumptions.ts` (indicative Flemish 2026 values) and are shown to the customer next to every estimate.

The demo customers (`engine/src/personas/`) are synthetic and generated relative to today, so the demo is always current. `npm run report` in `engine/` prints what the engine concludes for each of them.

## Security

- No backend, no accounts, no secrets. Everything runs client-side on synthetic data.
- The Docker image serves static files from an unprivileged nginx, read-only filesystem, all capabilities dropped, with a strict Content-Security-Policy and the usual hardening headers.
- The app accepts demo commands via `postMessage` only from its own origin, and follows only in-app routes.
- In production the engine would run inside KBC next to the transaction ledger; nothing leaves the bank. Only counts of feedback per tip type would be aggregated for the population prior.

## What is unfinished

- Data is synthetic; there is no connection to real KBC systems or APIs.
- Merchant recognition is a readable rule table, not KBC's production categorisation.
- Savings amounts are indicative estimates with round, documented assumptions, not advice.
- Transfers, Payconiq, loan applications and similar buttons are stubs.
- Notifications are an in-app banner; real push needs a development build (not Expo Go).
- A language model is deliberately not in the loop. It could draft tip wording offline and answer follow-up questions in Kate's chat.
