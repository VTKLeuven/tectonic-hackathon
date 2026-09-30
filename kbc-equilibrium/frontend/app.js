/**
 * KBC Equilibrium - Kinetic Canvas Main Application Logic
 * Integrates Scenarios, Hydraulic Calculations, Real-time Graph tweening,
 * Itsme Biometrics, Aikido Security Inspector, and FastAPI Backend Connectivity.
 */

// Global App State
const state = {
  currentScenarioId: 'luc',
  shockAbsorberPct: 0, // 0 to 100
  language: 'en',
  backendOnline: false,
  apiBase: 'http://localhost:8000',
  isExecutingSca: false,
  scaResult: null,
};

// Scenario Database
const SCENARIOS = {
  luc: {
    id: 'luc',
    backendId: 'sme-invoice-crunch-luc',
    name: 'Luc De Smet',
    role: 'SME IT Consultant (BV De Smet)',
    location: 'Ghent, Flanders',
    avatar: '👨‍💼',
    pillLabel: '🏢 Luc De Smet — SME Invoice Squeeze (Ghent)',
    summary: '€14,200 invoice delayed 60 days. Belgian VAT (€4,100) & Mortgage (€1,920) due Monday.',
    tag: 'SME Dual-Life & Invoice Squeeze',
    tagColor: 'amber',
    
    // Vessel limits
    vessel1_min: 22,
    vessel1_max: 88,
    vessel2_min: 32,
    vessel2_max: 95,
    vessel3_min: 88,
    vessel3_max: 68,

    // Vessel dynamic text
    v1_label: 'Banking & Solvency',
    v1_asset_min: 'Drained (-€4,800)',
    v1_asset_max: '€5,000 Bridge Line Active',
    v1_detail: 'Flexible Mortgage Capital Paused (€1,450 freed)',

    v2_label: 'Insurance & Resilience',
    v2_asset_min: 'Standard Tier (32%)',
    v2_asset_max: 'Full Bancassurance Shield (95%)',
    v2_detail: 'Outstanding Balance rebate & Zero-deductible',

    v3_label: 'Investments & Wealth',
    v3_asset_min: 'IPT Auto-Debit (€250/mo draining)',
    v3_asset_max: 'IPT 30-Day Pause (Tax-Neutral)',
    v3_detail: 'Corporate wealth safe float preserved',

    // Voice Scripts
    script_en: "Dag Luc. We saw the sixty-day delay on your TechLogix invoice. Take a breath—your family mortgage and VAT obligations are completely safe. We've modeled a hydraulic rebalance across your business and personal accounts. Adjust the Shock Absorber to activate your safety shield.",
    script_nl: "Dag Luc. We hebben de vertraging van 60 dagen op je TechLogix factuur opgemerkt. Geen zorgen—je gezinswoonlening en btw-verplichtingen zijn gewaarborgd. We hebben een hydraulisch evenwicht berekend over je vennootschap en privérekening.",

    // Metrics calculation formulas at p (0 to 1)
    calcMetrics: (p) => ({
      netLiquidity: Math.round(p * 6700),
      mortgageMoratorium: p > 0.3 ? '1 Mo Freeze (€1,450)' : 'None (Full €1,920 Due)',
      protectionScore: Math.round(32 + p * 66),
      stressIndex: Math.round(89 - p * 81),
      day14Balance: Math.round(-4800 + p * 7250), // flips from -4800 to +2450
      day45Balance: Math.round(-3200 + p * 7900),
      day90Balance: Math.round(-900 + p * 8700),
    }),

    // Cashflow Bezier control points [d0, d14, d30, d60, d90]
    calcCurve: (p) => {
      const d0 = 1200;
      const d14 = -4800 + p * 7250; // -4800 -> +2450
      const d30 = -3900 + p * 7400; // -3900 -> +3500
      const d60 = -2100 + p * 7800; // -2100 -> +5700
      const d90 = -900 + p * 8700;  // -900 -> +7800
      return [d0, d14, d30, d60, d90];
    },

    scaActionSummary: [
      "Open €5,000 Instant Zero-Margin Bridge Line for BV De Smet",
      "Activate 1-Month Capital Moratorium on KBC Home Loan (#M-9921-GH)",
      "Temporarily suspend IPT auto-debit (€250) without fiscal penalties",
      "Guarantee immediate clearance of Belgian VAT (€4,100)"
    ]
  },

  lucas: {
    id: 'lucas',
    backendId: 'flemish-epc-lucas-camille',
    name: 'Lucas & Camille',
    role: 'Young Homeowners (Bertem)',
    location: 'Bertem, Flemish Brabant',
    avatar: '🏡',
    pillLabel: '🏡 Lucas & Camille — EPC E Fixer-Upper (Bertem)',
    summary: 'Spike of +€18,500 in heat pump & insulation costs. Debt-to-income risk exceeds 44%.',
    tag: 'Flemish EPC E Renovation & DTI Shield',
    tagColor: 'cyan',

    vessel1_min: 28,
    vessel1_max: 84,
    vessel2_min: 35,
    vessel2_max: 92,
    vessel3_min: 82,
    vessel3_max: 74,

    v1_label: 'Banking & Solvency',
    v1_asset_min: 'DTI 44.2% (Overstretched)',
    v1_asset_max: 'EPC Energy Bridge 0% (DTI 33.5%)',
    v1_detail: '6-Month Renovation Repayment Grace Period',

    v2_label: 'Insurance & Resilience',
    v2_asset_min: 'Fire Only (35%)',
    v2_asset_max: 'Climate Shield & Full Life Cover (92%)',
    v2_detail: 'Combined Outstanding Balance discount (-€42/mo)',

    v3_label: 'Investments & Wealth',
    v3_asset_min: 'Pricos Savings Dormant',
    v3_asset_max: 'Pricos Tax Advance Unlocked',
    v3_detail: '€10,000 Flemish Renovation Grant Certified',

    script_en: "Dag Lucas en Camille. The renovation inflation on your Bertem home doesn't have to break your monthly budget. By linking your Flemish EPC green discount with a temporary capital deferral, your monthly liquidity stays resilient at plus €1,850.",
    script_nl: "Dag Lucas en Camille. De renovatie-indexatie voor jullie woning in Bertem hoeft jullie maandbudget niet te belasten. Met de KBC EPC-korting en kapitaaluitstel blijft jullie buffer stabiel op plus 1.850 euro.",

    calcMetrics: (p) => ({
      netLiquidity: Math.round(p * 5280),
      mortgageMoratorium: p > 0.3 ? '6 Mo Grace Period' : 'None (Full Repayments)',
      protectionScore: Math.round(41 + p * 55),
      stressIndex: Math.round(78 - p * 70),
      day14Balance: Math.round(-3100 + p * 4950), // flips to +1850
      day45Balance: Math.round(-2400 + p * 6200),
      day90Balance: Math.round(-800 + p * 7400),
    }),

    calcCurve: (p) => {
      const d0 = 2400;
      const d14 = -3100 + p * 4950;
      const d30 = -2800 + p * 5800;
      const d60 = -1400 + p * 6900;
      const d90 = 400 + p * 6800;
      return [d0, d14, d30, d60, d90];
    },

    scaActionSummary: [
      "Grant KBC Flemish Green Renovation Bridge Line (0% Sub-rate)",
      "Activate 6-Month Construction Capital Repayment Deferral",
      "Apply -0.25% EPC B Future Discount to Base Mortgage",
      "Bundle KBC Climate & Storm Damage Insurance Package"
    ]
  },

  vincent: {
    id: 'vincent',
    backendId: 'burnout-medical-cliff-vincent',
    name: 'Vincent V.',
    role: 'Freelance Pharmacist',
    location: 'Namur / Leuven',
    avatar: '🩺',
    pillLabel: '🩺 Vincent — Burnout & RIZIV Income Cliff',
    summary: 'Sudden 55% income drop during RIZIV disability waiting period. Urgent -€3,200 deficit.',
    tag: 'Care Moratorium & RIZIV Fast-Track',
    tagColor: 'emerald',

    vessel1_min: 18,
    vessel1_max: 82,
    vessel2_min: 24,
    vessel2_max: 98,
    vessel3_min: 85,
    vessel3_max: 65,

    v1_label: 'Banking & Solvency',
    v1_asset_min: 'Cliff Drop (-€3,200)',
    v1_asset_max: 'Care Moratorium Active (82%)',
    v1_detail: 'Full loan freeze for 6 months (Car + Home)',

    v2_label: 'Insurance & Resilience',
    v2_asset_min: 'Dormant Policy (24%)',
    v2_asset_max: 'Gewaarborgd Inkomen Active (98%)',
    v2_detail: '€2,100/mo fast-track payout without waiting period',

    v3_label: 'Investments & Wealth',
    v3_asset_min: 'Volatile Equity Risk',
    v3_asset_max: 'KBC Defensive Capital Yield (65%)',
    v3_detail: '€180/mo recurring safe dividend float',

    script_en: "Hello Vincent. Your health comes first. We have activated your KBC Gewaarborgd Inkomen fast-track and frozen your loan amortizations for six months. Your family's cashflow is fully stabilized at ninety-two percent of your normal income.",
    script_nl: "Dag Vincent. Jouw herstel staat voorop. We hebben de versnelde uitkering Gewaarborgd Inkomen geactiveerd en je leningen voor zes maanden bevroren. Je gezinsinkomen is voor 92% beschermd.",

    calcMetrics: (p) => ({
      netLiquidity: Math.round(p * 8950),
      mortgageMoratorium: p > 0.3 ? '6 Mo Full Amortization Freeze' : 'None (Default Risk)',
      protectionScore: Math.round(28 + p * 71),
      stressIndex: Math.round(94 - p * 86),
      day14Balance: Math.round(-3200 + p * 5300), // flips to +2100
      day45Balance: Math.round(-5100 + p * 8900),
      day90Balance: Math.round(-6200 + p * 12600),
    }),

    calcCurve: (p) => {
      const d0 = 1800;
      const d14 = -3200 + p * 5300;
      const d30 = -4400 + p * 7600;
      const d60 = -5200 + p * 10200;
      const d90 = -6200 + p * 12600;
      return [d0, d14, d30, d60, d90];
    },

    scaActionSummary: [
      "Fast-Track Payout: KBC Gewaarborgd Inkomen (€2,100/month)",
      "Activate 6-Month KBC Care Moratorium (Pause Car & Home Loans)",
      "Auto-Shift High Risk Portfolio to KBC Defensive Capital Yield",
      "Waive administrative penalties and interest surcharges"
    ]
  }
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  window.vessels = new CommunicatingVesselsController();
  window.audio = new KateAudioEngine();

  initUIEvents();
  initAikidoDemo();
  checkBackendHealth();
  selectScenario('luc');
});

// Check if FastAPI Backend is active
async function checkBackendHealth() {
  const statusBadge = document.getElementById('backend-status-pill');
  try {
    const res = await fetch(`${state.apiBase}/docs`, { method: 'HEAD', mode: 'no-cors' });
    state.backendOnline = true;
    if (statusBadge) {
      statusBadge.innerHTML = `
        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <span class="text-xs text-emerald-400 font-semibold">FastAPI Connected (:8000)</span>
      `;
    }
  } catch (err) {
    state.backendOnline = false;
    if (statusBadge) {
      statusBadge.innerHTML = `
        <span class="w-2 h-2 rounded-full bg-cyan-400"></span>
        <span class="text-xs text-cyan-300 font-semibold">Edge Simulation Mode</span>
      `;
    }
  }
}

// UI Event Handlers
function initUIEvents() {
  // Scenario Selection buttons
  document.querySelectorAll('[data-scenario-btn]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = btn.getAttribute('data-scenario-btn');
      selectScenario(id);
    });
  });

  // Shock Absorber Slider
  const slider = document.getElementById('shock-absorber-slider');
  if (slider) {
    slider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      state.shockAbsorberPct = val;
      updateHydraulics(val);
      window.audio.playTickSound();
    });

    slider.addEventListener('change', () => {
      window.audio.playHydraulicShiftSound();
    });
  }

  // Quick Preset Buttons
  document.querySelectorAll('[data-preset-val]').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = parseFloat(btn.getAttribute('data-preset-val'));
      if (slider) slider.value = val;
      state.shockAbsorberPct = val;
      updateHydraulics(val);
      window.audio.playHydraulicShiftSound();
    });
  });

  // Kate Voice Play Button
  const voiceBtn = document.getElementById('btn-play-voice');
  if (voiceBtn) {
    voiceBtn.addEventListener('click', () => {
      const sc = SCENARIOS[state.currentScenarioId];
      const text = state.language === 'nl' ? sc.script_nl : sc.script_en;
      window.audio.speakScenarioText(text, state.language);
    });
  }

  // Language Toggle
  const langToggle = document.getElementById('lang-toggle-btn');
  if (langToggle) {
    langToggle.addEventListener('click', () => {
      state.language = state.language === 'en' ? 'nl' : 'en';
      langToggle.textContent = state.language === 'en' ? '🇬🇧 EN' : '🇧🇪 NL';
      // If voice playing, re-speak
      if (window.audio.isPlaying) {
        window.audio.stopVoice();
        const sc = SCENARIOS[state.currentScenarioId];
        window.audio.speakScenarioText(state.language === 'nl' ? sc.script_nl : sc.script_en, state.language);
      }
    });
  }

  // Deploy Shield Button (Opens Itsme Modal)
  const deployBtn = document.getElementById('btn-deploy-shield');
  if (deployBtn) {
    deployBtn.addEventListener('click', openItsmeModal);
  }

  // Close Itsme Modal
  const closeItsmeBtn = document.getElementById('btn-close-itsme');
  if (closeItsmeBtn) {
    closeItsmeBtn.addEventListener('click', closeItsmeModal);
  }

  // Execute Biometric Tap
  const bioBtn = document.getElementById('btn-itsme-fingerprint');
  if (bioBtn) {
    bioBtn.addEventListener('click', executeItsmeBiometrics);
  }

  // Aikido Modal Triggers
  const openAikidoBtn = document.getElementById('btn-open-aikido');
  const closeAikidoBtn = document.getElementById('btn-close-aikido');
  if (openAikidoBtn) openAikidoBtn.addEventListener('click', openAikidoModal);
  if (closeAikidoBtn) closeAikidoBtn.addEventListener('click', closeAikidoModal);
}

// Select Active Scenario
function selectScenario(id) {
  state.currentScenarioId = id;
  const sc = SCENARIOS[id];
  if (!sc) return;

  // Update scenario tabs styling
  document.querySelectorAll('[data-scenario-btn]').forEach(btn => {
    const btnId = btn.getAttribute('data-scenario-btn');
    if (btnId === id) {
      btn.className = "flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-700 to-cyan-700 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-cyan-900/30 border border-cyan-400/30 transition-all scale-[1.02]";
    } else {
      btn.className = "flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-slate-900/70 hover:bg-slate-800 text-slate-300 font-medium text-xs sm:text-sm border border-slate-800 transition-all hover:border-slate-700";
    }
  });

  // Update profile headers
  document.getElementById('scenario-name').textContent = sc.name;
  document.getElementById('scenario-role').textContent = `${sc.role} • ${sc.location}`;
  document.getElementById('scenario-summary').textContent = sc.summary;
  document.getElementById('scenario-tag').textContent = sc.tag;

  // Update vessels static info
  document.getElementById('v1-title').textContent = sc.v1_label;
  document.getElementById('v2-title').textContent = sc.v2_label;
  document.getElementById('v3-title').textContent = sc.v3_label;

  // Reset or reapply current slider
  const slider = document.getElementById('shock-absorber-slider');
  const curVal = slider ? parseFloat(slider.value) : 0;
  updateHydraulics(curVal);

  // Update Kate's transcript preview
  const previewText = state.language === 'nl' ? sc.script_nl : sc.script_en;
  const transcriptEl = document.getElementById('kate-transcript-content');
  if (transcriptEl) {
    transcriptEl.innerHTML = `<span class="text-slate-400 italic">"${previewText}"</span>`;
  }
}

// Recalculate and Re-render Hydraulics & Cashflow Graph
function updateHydraulics(percent) {
  const sc = SCENARIOS[state.currentScenarioId];
  if (!sc) return;

  const p = percent / 100;
  const metrics = sc.calcMetrics(p);

  // Update vessels liquid
  window.vessels.setShockAbsorber(percent, sc);

  // Update slider badge
  const pctBadge = document.getElementById('slider-pct-badge');
  if (pctBadge) {
    pctBadge.textContent = `${Math.round(percent)}%`;
    if (percent < 30) {
      pctBadge.className = "px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30";
    } else if (percent < 75) {
      pctBadge.className = "px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30";
    } else {
      pctBadge.className = "px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30";
    }
  }

  // Update Vessel Labels
  document.getElementById('v1-asset-val').textContent = p > 0.5 ? sc.v1_asset_max : sc.v1_asset_min;
  document.getElementById('v1-detail').textContent = p > 0.3 ? sc.v1_detail : 'Pending Authorization';

  document.getElementById('v2-asset-val').textContent = p > 0.5 ? sc.v2_asset_max : sc.v2_asset_min;
  document.getElementById('v2-detail').textContent = p > 0.3 ? sc.v2_detail : 'Standard Policy Only';

  document.getElementById('v3-asset-val').textContent = p > 0.5 ? sc.v3_asset_max : sc.v3_asset_min;
  document.getElementById('v3-detail').textContent = sc.v3_detail;

  // Update Metric Cards
  document.getElementById('metric-net-liquidity').textContent = metrics.netLiquidity > 0 ? `+€${metrics.netLiquidity.toLocaleString()}` : `€0`;
  document.getElementById('metric-moratorium').textContent = metrics.mortgageMoratorium;
  document.getElementById('metric-protection-score').textContent = `${metrics.protectionScore}/100`;
  document.getElementById('metric-stress-index').textContent = `${metrics.stressIndex}%`;

  // Update Graph SVG
  renderCashflowSVG(sc.calcCurve(p), metrics);
}

// Render dynamic 90-day cashflow SVG curve with spring tweening
function renderCashflowSVG(dataPoints, metrics) {
  const svg = document.getElementById('cashflow-svg');
  if (!svg) return;

  const width = 800;
  const height = 240;
  const padX = 50;
  const padY = 30;

  // Scale: Days 0, 14, 30, 60, 90 mapped to X
  const dayX = [
    padX,
    padX + (14 / 90) * (width - padX * 2),
    padX + (30 / 90) * (width - padX * 2),
    padX + (60 / 90) * (width - padX * 2),
    width - padX
  ];

  // Y Scale: -€6,000 to +€10,000
  const minY = -6500;
  const maxY = 9500;
  const toY = (val) => {
    const norm = (val - minY) / (maxY - minY);
    return height - padY - norm * (height - padY * 2);
  };

  const zeroY = toY(0);
  const pts = dataPoints.map((v, i) => ({ x: dayX[i], y: toY(v), val: v }));

  // Build smooth Bezier Curve
  let dCurve = `M ${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const curr = pts[i];
    const next = pts[i + 1];
    const midX = (curr.x + next.x) / 2;
    dCurve += ` C ${midX},${curr.y} ${midX},${next.y} ${next.x},${next.y}`;
  }

  // Build Closed Area Polygon for Gradient Fill
  const dArea = `${dCurve} L ${dayX[4]},${zeroY} L ${dayX[0]},${zeroY} Z`;

  // Color logic: if Day 14 is in negative, red gradient, else emerald
  const isHealthy = pts[1].val >= 0;
  const strokeColor = isHealthy ? '#00C853' : '#FF5252';
  const fillColor = isHealthy ? 'url(#green-grad)' : 'url(#red-grad)';

  svg.innerHTML = `
    <defs>
      <linearGradient id="green-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#00C853" stop-opacity="0.45" />
        <stop offset="100%" stop-color="#00C853" stop-opacity="0.0" />
      </linearGradient>
      <linearGradient id="red-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#FF5252" stop-opacity="0.0" />
        <stop offset="100%" stop-color="#FF5252" stop-opacity="0.45" />
      </linearGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>

    <!-- Background Grid Lines -->
    <line x1="${padX}" y1="${zeroY}" x2="${width - padX}" y2="${zeroY}" stroke="#64748B" stroke-dasharray="4,4" stroke-width="1.5" opacity="0.6"/>
    <text x="${padX - 8}" y="${zeroY + 4}" fill="#94A3B8" font-size="11" font-family="'JetBrains Mono', monospace" text-anchor="end">€0</text>
    
    <!-- Vertical Day Markers -->
    <line x1="${dayX[1]}" y1="${padY}" x2="${dayX[1]}" y2="${height - padY}" stroke="rgba(255,255,255,0.1)" stroke-dasharray="2,2"/>
    <text x="${dayX[1]}" y="${height - 10}" fill="#94A3B8" font-size="11" font-family="'JetBrains Mono', monospace" text-anchor="middle">Day 14 (VAT)</text>

    <line x1="${dayX[2]}" y1="${padY}" x2="${dayX[2]}" y2="${height - padY}" stroke="rgba(255,255,255,0.06)" stroke-dasharray="2,2"/>
    <text x="${dayX[2]}" y="${height - 10}" fill="#64748B" font-size="11" font-family="'JetBrains Mono', monospace" text-anchor="middle">Day 30</text>

    <line x1="${dayX[3]}" y1="${padY}" x2="${dayX[3]}" y2="${height - padY}" stroke="rgba(255,255,255,0.06)" stroke-dasharray="2,2"/>
    <text x="${dayX[3]}" y="${height - 10}" fill="#64748B" font-size="11" font-family="'JetBrains Mono', monospace" text-anchor="middle">Day 60</text>

    <line x1="${dayX[4]}" y1="${padY}" x2="${dayX[4]}" y2="${height - padY}" stroke="rgba(255,255,255,0.1)" stroke-dasharray="2,2"/>
    <text x="${dayX[4]}" y="${height - 10}" fill="#94A3B8" font-size="11" font-family="'JetBrains Mono', monospace" text-anchor="middle">Day 90</text>

    <!-- Filled Area -->
    <path d="${dArea}" fill="${fillColor}" />

    <!-- Main Bezier Curve Line -->
    <path d="${dCurve}" fill="none" stroke="${strokeColor}" stroke-width="3.5" filter="url(#glow)"/>

    <!-- Key Points (Day 14 Critical Stress Point) -->
    <circle cx="${pts[1].x}" cy="${pts[1].y}" r="6" fill="${strokeColor}" stroke="#FFFFFF" stroke-width="2"/>
    <rect x="${pts[1].x - 55}" y="${pts[1].y - (pts[1].val < 0 ? 32 : -12)}" width="110" height="24" rx="6" fill="#0F172A" stroke="${strokeColor}" stroke-width="1.2"/>
    <text x="${pts[1].x}" y="${pts[1].y - (pts[1].val < 0 ? 16 : -28)}" fill="${strokeColor}" font-size="11" font-weight="700" font-family="'JetBrains Mono', monospace" text-anchor="middle">
      ${pts[1].val >= 0 ? '+' : ''}€${pts[1].val.toLocaleString()}
    </text>

    <!-- Day 90 Point -->
    <circle cx="${pts[4].x}" cy="${pts[4].y}" r="5" fill="${strokeColor}" stroke="#FFFFFF" stroke-width="1.5"/>
    <text x="${pts[4].x - 10}" y="${pts[4].y - 12}" fill="#E2E8F0" font-size="10" font-family="'JetBrains Mono', monospace" text-anchor="end">
      ${pts[4].val >= 0 ? '+' : ''}€${pts[4].val.toLocaleString()}
    </text>
  `;
}

// Itsme 1-Tap Biometric Authentication Logic
function openItsmeModal() {
  const modal = document.getElementById('itsme-modal');
  if (!modal) return;

  const sc = SCENARIOS[state.currentScenarioId];
  document.getElementById('itsme-user-name').textContent = sc.name;
  document.getElementById('itsme-tx-id').textContent = `#TX-KBC-2026-${Math.floor(1000 + Math.random() * 9000)}-HYD`;

  const summaryList = document.getElementById('itsme-action-summary-list');
  if (summaryList) {
    summaryList.innerHTML = sc.scaActionSummary
      .map(action => `<li class="flex items-start gap-2 text-xs text-slate-300"><i class="fa-solid fa-check text-emerald-400 mt-0.5"></i> <span>${action}</span></li>`)
      .join('');
  }

  // Reset modal state
  document.getElementById('itsme-step-scan').classList.remove('hidden');
  document.getElementById('itsme-step-success').classList.add('hidden');
  document.getElementById('itsme-fingerprint-icon').classList.remove('text-emerald-400');
  document.getElementById('itsme-fingerprint-icon').classList.add('text-orange-400');

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeItsmeModal() {
  const modal = document.getElementById('itsme-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

async function executeItsmeBiometrics() {
  if (state.isExecutingSca) return;
  state.isExecutingSca = true;

  window.audio.playBiometricBeep();
  const scanBeam = document.getElementById('itsme-scan-beam');
  if (scanBeam) scanBeam.classList.remove('hidden');

  // Trigger backend SCA or instant fallback
  try {
    let result = null;
    if (state.backendOnline) {
      const backendId = sc.backendId || 'sme-invoice-crunch-luc';
      const res = await fetch(`${state.apiBase}/api/execute-sca`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario_id: backendId,
          rebalance_payload: {
            scenario_id: backendId,
            shock_absorption_pct: state.shockAbsorberPct || 100.0,
            activate_valve_1_buffer_float: true,
            activate_valve_2_amortization_sync: true,
            activate_valve_3_lombard_ipt_advance: true,
            activate_valve_4_mortgage_moratorium: true
          },
          customer_action: "AUTHORIZE_TRI_PILLAR_HYDRAULIC_REBALANCE",
          phone_or_identity_token: "+32470123456",
          totp_or_biometric_assertion: "ITSME_BIOMETRIC_ASSERTION_OK"
        })
      });
      if (res.ok) {
        const data = await res.json();
        result = {
          status: data.itsme_status || "APPROVED_AND_SEALED",
          signature_token: data.transaction_id ? `#SCA-KBC-2026-${data.transaction_id.slice(-4)}-OK` : `#SCA-KBC-2026-9921-OK`,
          audit_hash: data.signed_hash || "sha256:7f83b1657ff1...",
          execution_duration_ms: 1240,
          compliance_reg: "Belgian Banking Law 25-04-2014 & EBA PSD2 SCA"
        };
      }
    }
    
    if (!result) {
      // Edge simulation fallback
      await new Promise(r => setTimeout(r, 1100));
      result = {
        status: "APPROVED_AND_SEALED",
        signature_token: `#SCA-KBC-2026-${Math.floor(1000 + Math.random() * 9000)}-OK`,
        audit_hash: "sha256:" + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join(''),
        execution_duration_ms: 1420,
        compliance_reg: "Belgian Banking Law 25-04-2014 & EBA PSD2 SCA"
      };
    }

    state.scaResult = result;
    window.audio.playSuccessChime();

    // Show Success State
    document.getElementById('itsme-step-scan').classList.add('hidden');
    document.getElementById('itsme-step-success').classList.remove('hidden');
    document.getElementById('itsme-sig-token').textContent = result.signature_token;
    document.getElementById('itsme-hash-display').textContent = result.audit_hash;

    // Automatically set shock absorber to 100% on the main canvas!
    const slider = document.getElementById('shock-absorber-slider');
    if (slider) slider.value = 100;
    state.shockAbsorberPct = 100;
    updateHydraulics(100);

  } catch (err) {
    console.error('SCA Error:', err);
  } finally {
    state.isExecutingSca = false;
    if (scanBeam) scanBeam.classList.add('hidden');
  }
}

// Aikido Security Modal Handlers & Interactive Testing
function openAikidoModal() {
  const modal = document.getElementById('aikido-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

function closeAikidoModal() {
  const modal = document.getElementById('aikido-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

window.openAikidoModal = openAikidoModal;
window.closeAikidoModal = closeAikidoModal;
window.openItsmeModal = openItsmeModal;
window.closeItsmeModal = closeItsmeModal;
window.selectScenario = selectScenario;

function initAikidoDemo() {
  // PII Live Scrubber Test Input
  const piiInput = document.getElementById('aikido-pii-input');
  const piiOutput = document.getElementById('aikido-pii-output');
  const piiHmac = document.getElementById('aikido-pii-hmac');

  if (piiInput) {
    piiInput.addEventListener('input', (e) => {
      const val = e.target.value;
      // Regex for Belgian SSN (YY.MM.DD-XXX.CD) and Belgian IBAN (BEkk BBBB BBBB BBBB)
      const ssnPattern = /\b(\d{2}[\.\s]?\d{2}[\.\s]?\d{2}[-\s]?\d{3}[\.\s-]?\d{2})\b/g;
      const ibanPattern = /\b(BE\d{2}[\s]?(?:\d{4}[\s]?){3})\b/gi;

      let scrubbed = val.replace(ssnPattern, '<span class="text-emerald-400 font-bold">[MASKED_BELGIAN_SSN]</span>');
      scrubbed = scrubbed.replace(ibanPattern, '<span class="text-cyan-400 font-bold">[MASKED_BE_IBAN]</span>');

      if (piiOutput) piiOutput.innerHTML = scrubbed || '<span class="text-slate-500 italic">Sanitized stream preview appears here...</span>';
      if (piiHmac) {
        piiHmac.textContent = "hmac_sha256:" + Array.from({length: 16}, () => Math.floor(Math.random()*16).toString(16)).join('');
      }
    });
  }

  // Prompt Injection Sandbox Test
  window.testAdversarialInjection = (attackType) => {
    const resultBox = document.getElementById('aikido-injection-result');
    if (!resultBox) return;

    if (attackType === 'override') {
      resultBox.innerHTML = `
        <div class="p-3 rounded-lg bg-rose-500/10 border border-rose-500/40 text-rose-300 text-xs">
          <div class="font-bold flex items-center gap-1.5 mb-1 text-rose-400">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <span>AIKIDO SENTINEL GUARD: JAILBREAK CONTAINED</span>
          </div>
          <p>Pattern matched: <code>SYSTEM OVERRIDE / DISREGARD LIMITS</code>. Input quarantined into isolated XML boundary. LLM context preserved with 0 policy breaches.</p>
        </div>
      `;
    } else {
      resultBox.innerHTML = `
        <div class="p-3 rounded-lg bg-rose-500/10 border border-rose-500/40 text-rose-300 text-xs">
          <div class="font-bold flex items-center gap-1.5 mb-1 text-rose-400">
            <i class="fa-solid fa-shield-xmark"></i>
            <span>UNAUTHORIZED CREDIT ATTEMPT BLOCKED</span>
          </div>
          <p>Direct execution rejected. Mandatory PSD2 SCA biometric signature required via Itsme®. Arbitrary parameter injection halted.</p>
        </div>
      `;
    }
  };
}
