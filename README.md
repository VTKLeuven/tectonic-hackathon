# 🚀 Tectonic Hackathon 2026 — Team Repository

Welcome to the team repository for the **Tectonic Hackathon 2026** (Belgium).

[![Aikido Security](https://img.shields.io/badge/Aikido%20Audit-100%25%20Clean%20(0%20Vulns)-00A3E0?style=for-the-badge&logo=shield)](file:///kbc-equilibrium/scripts/run_aikido_scan.sh)
[![Tests](https://img.shields.io/badge/Tests-76%20Passed%20(100%25)-00C853?style=for-the-badge&logo=pytest)](file:///kbc-equilibrium/tests)
[![KBC Challenge](https://img.shields.io/badge/Track-KBC%20Bancassurance-002D62?style=for-the-badge)](file:///kbc-equilibrium)

---

## 📁 Repository Structure

This repository is organized into modular directories so teammates can develop, test, and merge components in parallel with zero merge conflicts:

```
tectonic-hackathon/
├── kbc-equilibrium/          # 🏛️ KBC Track: Autonomous Tri-Pillar Bancassurance Engine
│   ├── backend/              # FastAPI core, 4-valve hydraulic solver, ElevenLabs voice, Vertex AI
│   ├── frontend/             # Kinetic Canvas UI (HTML5 Canvas 60fps fluid simulation, Itsme® modal)
│   ├── scripts/              # One-click launcher (run_demo.sh) and Aikido audit script
│   ├── tests/                # 76 automated unit & security tests (100% pass)
│   └── README.md             # Complete technical architecture & pitch guide
│
├── .github/workflows/        # ⚙️ Automated CI/CD (Aikido Security Quality Gate)
└── app/security/             # 🛡️ Enterprise Zero-Trust Sentinel & Anti-IDOR guard
```

---

## ⚡ Quickstart: Running KBC Equilibrium

From the repository root:

```bash
# 1. Launch the full stack (boots FastAPI on port 8000 & opens frontend in browser)
./kbc-equilibrium/scripts/run_demo.sh

# 2. Run the automated test suite
pytest kbc-equilibrium/tests/

# 3. Run the Aikido security compliance scan
./kbc-equilibrium/scripts/run_aikido_scan.sh
```

Or open `kbc-equilibrium/frontend/index.html` directly in any web browser for instant client-side edge simulation.

---

## 🤝 Team Merging Guidelines

To keep parallel feature branches cleanly decoupled:
1. **Teammate Code:** Create your own dedicated directory (e.g. `your-module/` or add routes under `kbc-equilibrium/backend/api/`).
2. **Shared APIs:** To plug your services into the main dashboard, connect to `kbc-equilibrium/backend/main.py` or use the custom widget container in `kbc-equilibrium/frontend/index.html`.
3. **Security:** All endpoints should verify tenancy context using `app/security/sentinel_guard.py` to maintain the 10/10 Aikido score.
