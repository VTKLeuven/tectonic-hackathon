/**
 * KBC Equilibrium - Kinetic Communicating Vessels Engine
 * Fluid dynamics simulation for the 3 Bancassurance Pillars:
 * 1. Banking & Solvency
 * 2. Insurance & Resilience
 * 3. Investments & Wealth
 */

class LiquidVessel {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    
    this.colorTop = options.colorTop || '#00A3E0';
    this.colorBottom = options.colorBottom || '#002D62';
    this.bubbleColor = options.bubbleColor || 'rgba(0, 163, 224, 0.4)';
    this.accentColor = options.accentColor || '#00C853';
    
    this.targetPercent = options.initialPercent || 30;
    this.currentPercent = options.initialPercent || 30;
    
    this.wavePhase = Math.random() * 10;
    this.waveSpeed = options.waveSpeed || 0.04;
    this.waveAmplitude = options.waveAmplitude || 7;
    
    this.bubbles = [];
    for (let i = 0; i < 15; i++) {
      this.bubbles.push(this.createBubble());
    }
    
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width * (window.devicePixelRatio || 1);
    this.canvas.height = rect.height * (window.devicePixelRatio || 1);
    this.ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    this.width = rect.width;
    this.height = rect.height;
  }

  createBubble() {
    return {
      x: Math.random() * (this.width || 200),
      y: (this.height || 350) + Math.random() * 50,
      radius: 1.5 + Math.random() * 3.5,
      speed: 0.6 + Math.random() * 1.4,
      opacity: 0.2 + Math.random() * 0.5,
      wobble: Math.random() * Math.PI * 2,
    };
  }

  setTargetPercent(percent) {
    this.targetPercent = Math.max(5, Math.min(95, percent));
  }

  update() {
    // Smooth spring-like lerp to target
    this.currentPercent += (this.targetPercent - this.currentPercent) * 0.07;
    this.wavePhase += this.waveSpeed;

    // Update bubbles
    const surfaceY = this.height * (1 - this.currentPercent / 100);
    for (let b of this.bubbles) {
      b.y -= b.speed;
      b.wobble += 0.05;
      b.x += Math.sin(b.wobble) * 0.4;
      
      // If bubble reaches surface or goes out of bounds, reset
      if (b.y <= surfaceY || b.y < 0) {
        b.y = this.height + Math.random() * 20;
        b.x = Math.random() * this.width;
      }
    }
  }

  render() {
    if (!this.ctx || !this.width || !this.height) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    const surfaceY = this.height * (1 - this.currentPercent / 100);

    // Create liquid gradient
    const grad = ctx.createLinearGradient(0, surfaceY, 0, this.height);
    grad.addColorStop(0, this.colorTop);
    grad.addColorStop(1, this.colorBottom);

    // Draw primary liquid wave
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, this.height);
    ctx.lineTo(0, surfaceY);

    const points = 40;
    const step = this.width / points;

    for (let i = 0; i <= points; i++) {
      const x = i * step;
      // Dual sine wave superposition for fluid organic feel
      const y = surfaceY + 
        Math.sin(this.wavePhase + i * 0.22) * this.waveAmplitude +
        Math.sin(this.wavePhase * 0.7 + i * 0.15) * (this.waveAmplitude * 0.4);
      ctx.lineTo(x, y);
    }

    ctx.lineTo(this.width, this.height);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Draw surface crest glow
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.beginPath();
    for (let i = 0; i <= points; i++) {
      const x = i * step;
      const y = surfaceY + 
        Math.sin(this.wavePhase + i * 0.22) * this.waveAmplitude +
        Math.sin(this.wavePhase * 0.7 + i * 0.15) * (this.waveAmplitude * 0.4);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Secondary back-wave for 3D depth
    ctx.beginPath();
    ctx.moveTo(0, this.height);
    for (let i = 0; i <= points; i++) {
      const x = i * step;
      const y = surfaceY + Math.cos(this.wavePhase * 1.2 + i * 0.3) * (this.waveAmplitude * 0.6);
      if (i === 0) ctx.lineTo(0, y);
      else ctx.lineTo(x, y);
    }
    ctx.lineTo(this.width, this.height);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fill();

    // Draw bubbles
    for (let b of this.bubbles) {
      if (b.y > surfaceY) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.bubbleColor;
        ctx.globalAlpha = b.opacity;
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }
    }

    ctx.restore();
  }
}

// Master Vessels Controller
class CommunicatingVesselsController {
  constructor() {
    this.vessel1 = new LiquidVessel('canvas-vessel-1', {
      colorTop: '#00A3E0',
      colorBottom: '#002D62',
      bubbleColor: 'rgba(0, 163, 224, 0.5)',
      initialPercent: 24,
    });

    this.vessel2 = new LiquidVessel('canvas-vessel-2', {
      colorTop: '#00C853',
      colorBottom: '#004D40',
      bubbleColor: 'rgba(0, 200, 83, 0.5)',
      initialPercent: 32,
    });

    this.vessel3 = new LiquidVessel('canvas-vessel-3', {
      colorTop: '#38BDF8',
      colorBottom: '#1E1B4B',
      bubbleColor: 'rgba(56, 189, 248, 0.4)',
      initialPercent: 85,
    });

    this.initConduitParticles();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initConduitParticles() {
    this.conduitCanvas = document.getElementById('conduit-particles-canvas');
    if (!this.conduitCanvas) return;
    this.conduitCtx = this.conduitCanvas.getContext('2d');
    this.particles = [];
    this.flowRate = 0; // -1 to +1
    this.resizeConduit();
    window.addEventListener('resize', () => this.resizeConduit());

    for (let i = 0; i < 30; i++) {
      this.particles.push({
        x: Math.random() * (this.conduitWidth || 800),
        y: Math.random() * (this.conduitHeight || 30),
        speed: 1 + Math.random() * 2,
        size: 1.5 + Math.random() * 2,
        alpha: 0.3 + Math.random() * 0.7
      });
    }
  }

  resizeConduit() {
    if (!this.conduitCanvas) return;
    const rect = this.conduitCanvas.parentElement.getBoundingClientRect();
    this.conduitCanvas.width = rect.width * (window.devicePixelRatio || 1);
    this.conduitCanvas.height = rect.height * (window.devicePixelRatio || 1);
    this.conduitCtx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    this.conduitWidth = rect.width;
    this.conduitHeight = rect.height;
  }

  setShockAbsorber(percent, scenarioData) {
    // percent: 0 to 100
    // Dynamic Hydraulic Balancing based on current scenario
    const p = percent / 100;
    
    // Vessel 1: Banking & Solvency (Rises from crisis level to safe shield)
    const v1Min = scenarioData.vessel1_min || 22;
    const v1Max = scenarioData.vessel1_max || 88;
    const v1Val = v1Min + (v1Max - v1Min) * p;
    this.vessel1.setTargetPercent(v1Val);

    // Vessel 2: Insurance & Resilience (Expands coverage tier)
    const v2Min = scenarioData.vessel2_min || 30;
    const v2Max = scenarioData.vessel2_max || 94;
    const v2Val = v2Min + (v2Max - v2Min) * p;
    this.vessel2.setTargetPercent(v2Val);

    // Vessel 3: Investments & Wealth (Calibrated draw & tax-shield rebalance)
    const v3Min = scenarioData.vessel3_min || 86;
    const v3Max = scenarioData.vessel3_max || 68; // Drops slightly to inject liquidity into Solvency
    const v3Val = v3Min - (v3Min - v3Max) * p;
    this.vessel3.setTargetPercent(v3Val);

    this.flowRate = p > 0.05 ? p * 2.5 : 0;
  }

  animate() {
    this.vessel1.update();
    this.vessel1.render();

    this.vessel2.update();
    this.vessel2.render();

    this.vessel3.update();
    this.vessel3.render();

    // Render conduit particles
    if (this.conduitCtx && this.conduitWidth) {
      this.conduitCtx.clearRect(0, 0, this.conduitWidth, this.conduitHeight);
      this.conduitCtx.fillStyle = '#00A3E0';

      for (let pt of this.particles) {
        pt.x += (pt.speed * (this.flowRate + 0.5));
        if (pt.x > this.conduitWidth) pt.x = 0;
        if (pt.x < 0) pt.x = this.conduitWidth;

        this.conduitCtx.beginPath();
        this.conduitCtx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        this.conduitCtx.globalAlpha = pt.alpha;
        this.conduitCtx.fill();
      }
      this.conduitCtx.globalAlpha = 1.0;
    }

    requestAnimationFrame(this.animate);
  }
}

window.CommunicatingVesselsController = CommunicatingVesselsController;
