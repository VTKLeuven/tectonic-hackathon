import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export type VoiceEngineType = 'elevenlabs' | 'browser' | 'none';

export interface VoiceState {
  isPlaying: boolean;
  activeWordIndex: number;
  words: string[];
  currentText: string;
  engineUsed: VoiceEngineType;
  error: string | null;
}

export type VoiceStateListener = (state: VoiceState) => void;

// Flemish / Belgian Voice Presets
export const BELGIAN_VOICES = {
  liesbeth: {
    id: '21m00Tcm4TlvDq8ikWAM', // Studio warm Flemish voice equivalent
    name: 'Liesbeth',
    title: 'Vlaamse warme rust (Liesbeth)',
    desc: 'Rustig, empathisch en betrouwbaar voor financieel advies',
  },
  marc: {
    id: 'VR6AewLTigWG4xSOukaG',
    name: 'Marc',
    title: 'Belgisch zakelijk adviseur (Marc)',
    desc: 'Helder, pragmatisch en doortastend',
  },
};

const ELEVENLABS_STORAGE_KEY = 'kate-radar-elevenlabs-api-key';

class VoiceService {
  private apiKey: string | null = null;
  private voiceId: string = BELGIAN_VOICES.liesbeth.id;
  private state: VoiceState = {
    isPlaying: false,
    activeWordIndex: -1,
    words: [],
    currentText: '',
    engineUsed: 'none',
    error: null,
  };
  private listeners = new Set<VoiceStateListener>();
  private currentAudio: HTMLAudioElement | null = null;
  private wordTimer: ReturnType<typeof setInterval> | null = null;
  private speechUtterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    this.initKey();
  }

  private async initKey() {
    try {
      const stored = await AsyncStorage.getItem(ELEVENLABS_STORAGE_KEY);
      const envKey = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY;
      this.apiKey = stored || envKey || null;
    } catch {
      // Ignored in SSR / storage initialisation
    }
  }

  public async setApiKey(key: string | null) {
    this.apiKey = key ? key.trim() : null;
    if (this.apiKey) {
      await AsyncStorage.setItem(ELEVENLABS_STORAGE_KEY, this.apiKey);
    } else {
      await AsyncStorage.removeItem(ELEVENLABS_STORAGE_KEY);
    }
    this.notify();
  }

  public getApiKey(): string | null {
    return this.apiKey;
  }

  public setVoiceId(id: string) {
    this.voiceId = id;
  }

  public getState(): VoiceState {
    return { ...this.state };
  }

  public subscribe(listener: VoiceStateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private updateState(partial: Partial<VoiceState>) {
    this.state = { ...this.state, ...partial };
    this.notify();
  }

  private notify() {
    const s = this.getState();
    this.listeners.forEach((l) => l(s));
  }

  public stop() {
    this.stopAudio();
    this.updateState({
      isPlaying: false,
      activeWordIndex: -1,
      engineUsed: 'none',
      error: null,
    });
  }

  private stopAudio() {
    if (this.wordTimer) {
      clearInterval(this.wordTimer);
      this.wordTimer = null;
    }

    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
        this.currentAudio.src = '';
      } catch {
        // audio element teardown
      }
      this.currentAudio = null;
    }

    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // synthesis cancellation
      }
    }
    this.speechUtterance = null;
  }

  public async speak(text: string, lang: 'nl' | 'en' = 'nl'): Promise<void> {
    this.stop();
    const cleanText = text.trim();
    if (!cleanText) return;

    const words = cleanText.split(/\s+/).filter(Boolean);
    this.updateState({
      isPlaying: true,
      currentText: cleanText,
      words,
      activeWordIndex: 0,
      error: null,
    });

    // 1. If an ElevenLabs API key is configured, synthesize via ElevenLabs
    if (this.apiKey) {
      const success = await this.speakElevenLabs(cleanText, words);
      if (success) return;
    }

    // 2. Otherwise fall back to device browser speech synthesis
    this.speakBrowser(cleanText, words, lang);
  }

  private async speakElevenLabs(text: string, words: string[]): Promise<boolean> {
    try {
      this.updateState({ engineUsed: 'elevenlabs' });
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}`, {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey!,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.85,
            similarity_boost: 0.85,
            style: 0.15,
            use_speaker_boost: true,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs error (${response.status})`);
      }

      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      this.currentAudio = audio;

      return new Promise<boolean>((resolve) => {
        audio.onloadedmetadata = () => {
          const duration = audio.duration || 5;
          const intervalMs = Math.max(120, (duration * 1000) / (words.length || 1));
          let currentIdx = 0;

          this.wordTimer = setInterval(() => {
            currentIdx++;
            if (currentIdx < words.length) {
              this.updateState({ activeWordIndex: currentIdx });
            } else if (this.wordTimer) {
              clearInterval(this.wordTimer);
              this.wordTimer = null;
            }
          }, intervalMs);
        };

        audio.onended = () => {
          this.stop();
          resolve(true);
        };

        audio.onerror = () => {
          this.stopAudio();
          resolve(false);
        };

        audio.play().catch(() => {
          this.stopAudio();
          resolve(false);
        });
      });
    } catch {
      return false;
    }
  }

  private speakBrowser(text: string, words: string[], lang: 'nl' | 'en') {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        this.speechUtterance = utter;
        utter.rate = 1.0;
        utter.pitch = 1.05;
        utter.lang = lang === 'nl' ? 'nl-BE' : 'en-US';

        const voices = window.speechSynthesis.getVoices();
        const voice = voices.find(
          (v) =>
            (lang === 'nl' ? v.lang.startsWith('nl') : v.lang.startsWith('en')) &&
            (v.name.includes('Natural') ||
              v.name.includes('Google') ||
              v.name.includes('Klara') ||
              v.name.includes('Ellen') ||
              v.name.includes('Samantha') ||
              v.name.includes('Flemish'))
        ) || voices.find((v) => (lang === 'nl' ? v.lang.startsWith('nl') : v.lang.startsWith('en')));

        if (voice) utter.voice = voice;

        let wordCounter = 0;
        utter.onboundary = (event) => {
          if (event.name === 'word') {
            this.updateState({ activeWordIndex: wordCounter });
            wordCounter = Math.min(words.length - 1, wordCounter + 1);
          }
        };

        utter.onend = () => {
          this.stop();
        };

        utter.onerror = () => {
          this.stop();
        };

        this.updateState({ engineUsed: 'browser' });
        window.speechSynthesis.speak(utter);
        return;
      } catch (e: any) {
        this.updateState({ error: e?.message || 'Voice playback error', isPlaying: false });
        return;
      }
    }

    // If speech synthesis is completely unavailable, simulate karaoke text for display
    this.updateState({ engineUsed: 'none' });
    let idx = 0;
    this.wordTimer = setInterval(() => {
      idx++;
      if (idx < words.length) {
        this.updateState({ activeWordIndex: idx });
      } else {
        this.stop();
      }
    }, 280);
  }
}

export const voiceService = new VoiceService();
