# 🧬 KBC Equilibrium — Kinetic Canvas Frontend

Welcome to the **KBC Equilibrium Kinetic Canvas**, the interactive, single-page client interface built for the Tectonic Hackathon 2026 (Builderbase / Belgium).

Designed to power the **3-Minute Master Pitch** and showcase autonomous Bancassurance hydraulics to KBC executives and hackathon judges.

---

## 🌟 Key Features

1. **Header & Brand System:**
   - Authentic KBC Brand Palette: Deep Blue (`#002D62`), Cyan Accent (`#00A3E0`), Emerald Green (`#00C853`), and Coral Alert (`#FF5252`).
   - Interactive Scenario Selector:
     - 🏢 **Luc De Smet** — SME Invoice Squeeze (Ghent)
     - 🏡 **Lucas & Camille** — EPC E Fixer-Upper (Bertem)
     - 🩺 **Vincent V.** — Burnout & RIZIV Income Cliff (Namur/Leuven)
   - Clickable **Aikido Security Badge**: Demonstrates 100% clean audit, 0 IDOR, and zero-trust perimeter.

2. **The 3 Communicating Vessels (Core Centerpiece):**
   - 3 dynamic glassmorphic columns featuring realistic fluid physics:
     - **Vessel 1: Banking & Solvency** (Working capital, bridge line, mortgage capital moratorium).
     - **Vessel 2: Insurance & Resilience** (Deductible tier, outstanding balance insurance discount).
     - **Vessel 3: Investments & Wealth** (Pension Pricos pause, IPT corporate advance, safe yield float).
   - Canvas-based undulating wave physics, rising ambient bubbles, and real-time horizontal hydraulic conduit particle flows.

3. **Interactive Shock Absorber Dial (The 18-Second Magic):**
   - Direct manipulation slider: `0% (Unmitigated Crisis)` to `100% (Full Hydraulic Shield)`.
   - Real-time 90-Day Cashflow Bezier Curve (SVG engine):
     - At 0%: Curve plunges into deep crimson red deficit (**-€4,800** at Day 14).
     - As user slides the dial: Red deficit zone smoothly shrinks and flips into a solid emerald green safety buffer (**+€2,450**).
     - Live metric cards: Net Liquidity Saved (`+€6,700`), Mortgage Moratorium (`1 Mo Freeze`), Protection Score (`98/100`), Stress Index (`8%`).

4. **ElevenLabs Voice Concierge (Kate AI):**
   - Floating real-time audio wave visualizer (Canvas sine wave).
   - "Listen to Kate" play/pause button with bilingual Flemish Dutch and English support.
   - Live synchronized kinetic subtitles with active word karaoke highlighting.
   - Dual-engine: Calls backend ElevenLabs synthesis (`/api/voice/synthesize`) with instant browser SpeechSynthesis fallback.

5. **Itsme® Biometric 1-Tap Execution Modal:**
   - Authentic Belgian Itsme® styling with transaction token `#TX-KBC-2026-9921-HYD`.
   - Pulsing biometric fingerprint scanner with scan beam animation.
   - Calls backend `/api/execute-sca` (or client edge simulation), displaying cryptographic signature `#SCA-KBC-2026-9921-OK` and SHA-256 state hash in under 2 seconds.

6. **Aikido Security Sentinel Inspector:**
   - Modal drawer showcasing 100% clean audit proof (0 IDOR, 0 SQLi, 0 Secrets leaked).
   - Interactive live Belgian PII Scrubber (Rijksregisternummer and IBAN masking).
   - Interactive Prompt Injection Sandbox testing hostile inputs.

---

## 🚀 Quick Start

### Option 1: Direct Browser Launch
Open `index.html` directly in any modern web browser:
```bash
open index.html
```

### Option 2: Local HTTP Server
Run a lightweight server from the `frontend/` directory:
```bash
python3 -m http.server 8080
```
Then visit `http://localhost:8080`.

### Option 3: Full Stack with FastAPI Backend
Start the FastAPI backend on port 8000:
```bash
cd ../backend
uvicorn main:app --reload --port 8000
```
Open `http://localhost:8000/` or visit `frontend/index.html`. The frontend status badge will illuminate with **"FastAPI Connected (:8000)"**.
