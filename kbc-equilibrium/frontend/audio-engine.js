/**
 * KBC Equilibrium - ElevenLabs Voice Concierge & Kinetic Subtitles Audio Engine
 * Handles audio streaming, speech synthesis fallback, real-time waveform visualizer,
 * kinetic subtitle karaoke synchronization, and Web Audio SFX.
 */

class KateAudioEngine {
  constructor() {
    this.isPlaying = false;
    this.audioContext = null;
    this.currentUtterance = null;
    this.visualizerCanvas = document.getElementById('audio-visualizer-canvas');
    if (this.visualizerCanvas) {
      this.visCtx = this.visualizerCanvas.getContext('2d');
      this.resizeVisualizer();
      window.addEventListener('resize', () => this.resizeVisualizer());
    }

    this.transcriptEl = document.getElementById('kate-transcript-content');
    this.playBtn = document.getElementById('btn-play-voice');
    this.waveAnimPhase = 0;
    this.waveformIntensity = 0.1; // 0.1 idle, up to 1.0 active

    this.initSFX();
    this.animateWaveform = this.animateWaveform.bind(this);
    requestAnimationFrame(this.animateWaveform);
  }

  resizeVisualizer() {
    if (!this.visualizerCanvas) return;
    const rect = this.visualizerCanvas.parentElement.getBoundingClientRect();
    this.visualizerCanvas.width = rect.width * (window.devicePixelRatio || 1);
    this.visualizerCanvas.height = rect.height * (window.devicePixelRatio || 1);
    this.visCtx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    this.visWidth = rect.width;
    this.visHeight = rect.height;
  }

  initSFX() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.audioContext = new AudioCtx();
      }
    } catch (e) {
      console.warn('Web Audio not supported');
    }
  }

  resumeAudioContext() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  playTickSound() {
    if (!this.audioContext) return;
    this.resumeAudioContext();
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, this.audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, this.audioContext.currentTime + 0.04);
    gain.gain.setValueAtTime(0.04, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.04);
    osc.connect(gain);
    gain.connect(this.audioContext.destination);
    osc.start();
    osc.stop(this.audioContext.currentTime + 0.04);
  }

  playHydraulicShiftSound() {
    if (!this.audioContext) return;
    this.resumeAudioContext();
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, this.audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(320, this.audioContext.currentTime + 0.25);
    gain.gain.setValueAtTime(0.08, this.audioContext.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, this.audioContext.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(this.audioContext.destination);
    osc.start();
    osc.stop(this.audioContext.currentTime + 0.3);
  }

  playBiometricBeep() {
    if (!this.audioContext) return;
    this.resumeAudioContext();
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, this.audioContext.currentTime); // D5
    osc.frequency.setValueAtTime(880, this.audioContext.currentTime + 0.1); // A5
    gain.gain.setValueAtTime(0.12, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(this.audioContext.destination);
    osc.start();
    osc.stop(this.audioContext.currentTime + 0.35);
  }

  playSuccessChime() {
    if (!this.audioContext) return;
    this.resumeAudioContext();
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const startTime = this.audioContext.currentTime + idx * 0.08;
      gain.gain.setValueAtTime(0.15, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);
      osc.connect(gain);
      gain.connect(this.audioContext.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.4);
    });
  }

  async speakScenarioText(scriptText, lang = 'en') {
    if (this.isPlaying) {
      this.stopVoice();
      return;
    }

    this.isPlaying = true;
    this.waveformIntensity = 0.9;
    this.updatePlayBtnState(true);

    // Prepare kinetic transcript
    const words = scriptText.split(' ');
    if (this.transcriptEl) {
      this.transcriptEl.innerHTML = words
        .map((w, idx) => `<span id="word-${idx}" class="transition-all duration-150 inline-block mr-1">${w}</span>`)
        .join('');
    }

    // Try ElevenLabs backend voice synthesis first
    try {
      const persona = lang === 'nl' ? 'liesbeth' : 'liesbeth';
      const res = await fetch('http://localhost:8000/api/voice/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: scriptText,
          persona: persona,
          stress_level: 0.4,
          return_binary: false
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.audio_base64) {
          const audioSrc = `data:audio/${data.format || 'mp3'};base64,${data.audio_base64}`;
          this.currentAudio = new Audio(audioSrc);
          this.currentAudio.onended = () => this.stopVoice();
          this.currentAudio.onerror = () => this.fallbackSpeech(scriptText, words, lang);
          this.simulateKaraoke(words, (this.currentAudio.duration || 10) * 1000);
          await this.currentAudio.play();
          return;
        }
      }
    } catch (e) {
      // Backend offline or error, proceed to browser SpeechSynthesis fallback
    }

    this.fallbackSpeech(scriptText, words, lang);
  }

  fallbackSpeech(scriptText, words, lang) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(scriptText);
      utter.rate = 1.02;
      utter.pitch = 1.05;
      utter.lang = lang === 'nl' ? 'nl-BE' : 'en-US';

      // Pick preferred high quality voice
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v => 
        (lang === 'nl' ? v.lang.includes('nl') : v.lang.includes('en')) && 
        (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Ellen') || v.name.includes('Klara'))
      );
      if (preferred) utter.voice = preferred;

      let currentWordIdx = 0;
      let boundaryFired = false;

      utter.onboundary = (event) => {
        boundaryFired = true;
        if (event.name === 'word') {
          const prev = document.querySelector('.subtitle-active-word');
          if (prev) prev.classList.remove('subtitle-active-word');
          const target = document.getElementById(`word-${currentWordIdx}`);
          if (target) {
            target.classList.add('subtitle-active-word');
            target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
          currentWordIdx++;
        }
      };

      // Fallback timer if onboundary isn't triggered by browser engine
      setTimeout(() => {
        if (!boundaryFired && this.isPlaying) {
          this.simulateKaraoke(words);
        }
      }, 500);

      utter.onend = () => {
        this.stopVoice();
      };

      utter.onerror = () => {
        this.stopVoice();
      };

      this.currentUtterance = utter;
      window.speechSynthesis.speak(utter);
    } else {
      // Simulation mode if Web Speech is blocked
      this.simulateKaraoke(words);
    }
  }

  simulateKaraoke(words) {
    let i = 0;
    this.karaokeInterval = setInterval(() => {
      const prev = document.querySelector('.subtitle-active-word');
      if (prev) prev.classList.remove('subtitle-active-word');
      const target = document.getElementById(`word-${i}`);
      if (target) target.classList.add('subtitle-active-word');
      i++;
      if (i >= words.length) {
        clearInterval(this.karaokeInterval);
        this.stopVoice();
      }
    }, 280);
  }

  stopVoice() {
    this.isPlaying = false;
    this.waveformIntensity = 0.12;
    if (this.currentAudio) {
      try { this.currentAudio.pause(); } catch (e) {}
      this.currentAudio = null;
    }
    if (this.karaokeInterval) clearInterval(this.karaokeInterval);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.updatePlayBtnState(false);
    const active = document.querySelector('.subtitle-active-word');
    if (active) active.classList.remove('subtitle-active-word');
  }

  updatePlayBtnState(playing) {
    if (!this.playBtn) return;
    if (playing) {
      this.playBtn.innerHTML = `
        <span class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-400/40 text-xs font-semibold animate-pulse">
          <i class="fa-solid fa-square text-xs"></i>
          <span>Pause Kate</span>
        </span>
      `;
    } else {
      this.playBtn.innerHTML = `
        <span class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-md text-xs font-semibold transition-all">
          <i class="fa-solid fa-play text-xs"></i>
          <span>Listen to Kate</span>
        </span>
      `;
    }
  }

  animateWaveform() {
    this.waveAnimPhase += 0.06;

    if (this.visCtx && this.visWidth && this.visHeight) {
      const ctx = this.visCtx;
      ctx.clearRect(0, 0, this.visWidth, this.visHeight);

      const bars = 36;
      const barWidth = this.visWidth / bars - 2;
      const centerY = this.visHeight / 2;

      for (let i = 0; i < bars; i++) {
        const factor = Math.sin(this.waveAnimPhase + i * 0.3) * Math.cos(this.waveAnimPhase * 0.7 + i * 0.2);
        const amp = (Math.abs(factor) * 0.8 + 0.2) * this.visHeight * 0.75 * this.waveformIntensity;
        const x = i * (barWidth + 2);
        const y = centerY - amp / 2;

        const grad = ctx.createLinearGradient(0, y, 0, y + amp);
        if (this.isPlaying) {
          grad.addColorStop(0, '#00C853');
          grad.addColorStop(0.5, '#00A3E0');
          grad.addColorStop(1, '#002D62');
        } else {
          grad.addColorStop(0, '#00A3E0');
          grad.addColorStop(1, 'rgba(0, 45, 98, 0.4)');
        }

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(x, y, barWidth, Math.max(3, amp), 3) : ctx.rect(x, y, barWidth, Math.max(3, amp));
        ctx.fill();
      }
    }

    requestAnimationFrame(this.animateWaveform);
  }
}

window.KateAudioEngine = KateAudioEngine;
