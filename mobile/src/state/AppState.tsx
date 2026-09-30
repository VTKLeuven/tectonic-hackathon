import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import {
  analyze,
  applyFeedback,
  attention,
  bookLiveEvent,
  buildPersona,
  currentBalance,
  DEFAULT_PREFS,
  EMPTY_FEEDBACK,
  PERSONA_IDS,
  todayISO,
  type Analysis,
  type Domain,
  type FeedbackAction,
  type FeedbackState,
  type ISODate,
  type Lang,
  type PersonaData,
  type PersonaId,
  type Preferences,
  type RankedInsight,
  type Transaction,
} from '../engine';

/**
 * The app's single source of state.
 *
 * Everything the customer "has" (transactions, balance) is derived from the
 * persona and the live events booked during the demo. Everything Kate
 * "thinks" is derived from that by the engine. The only things stored are
 * the choices the customer made: feedback on tips and settings.
 */

const STORAGE_KEY = 'kate-radar-state-v1';

interface PersonaState {
  booked: { eventId: string; date: ISODate }[];
  feedback: FeedbackState;
}

interface Persisted {
  personaId: PersonaId;
  lang: Lang;
  prefs: Preferences;
  /** Show a banner when Kate finds something new. */
  notify: boolean;
  byPersona: Record<PersonaId, PersonaState>;
}

const EMPTY_PERSONA: PersonaState = { booked: [], feedback: EMPTY_FEEDBACK };

const INITIAL: Persisted = {
  personaId: 'sarah',
  lang: 'nl',
  prefs: DEFAULT_PREFS,
  notify: true,
  byPersona: { sarah: EMPTY_PERSONA, tom: EMPTY_PERSONA, janssens: EMPTY_PERSONA },
};

interface Toast {
  id: number;
  text: string;
}

interface AppState {
  ready: boolean;
  loggedIn: boolean;
  embedded: boolean;
  login(): void;
  logout(): void;
  today: ISODate;
  lang: Lang;
  setLang(lang: Lang): void;
  prefs: Preferences;
  toggleDomain(domain: Domain): void;
  notify: boolean;
  setNotify(on: boolean): void;
  personaId: PersonaId;
  data: PersonaData;
  transactions: Transaction[];
  balance: number;
  analysis: Analysis;
  /** Live events for this persona and whether they already happened. */
  liveEvents: { event: PersonaData['live'][number]; booked: boolean }[];
  /** Id of the transaction that just arrived, for a highlight. */
  freshTxId: string | null;
  switchPersona(id: PersonaId): void;
  triggerLive(eventId: string): void;
  resetPersona(): void;
  giveFeedback(insight: Pick<RankedInsight, 'id' | 'type'>, action: FeedbackAction): void;
  banner: RankedInsight | null;
  dismissBanner(): void;
  toast: Toast | null;
  showToast(text: string): void;
  voiceVisible: boolean;
  voiceTargetTip?: RankedInsight;
  openVoice(tip?: RankedInsight): void;
  closeVoice(): void;
}

const Ctx = createContext<AppState | null>(null);

function readWebParams(): { persona?: PersonaId; embed: boolean } {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return { embed: false };
  const params = new URLSearchParams(window.location.search);
  const persona = params.get('persona') as PersonaId | null;
  return {
    persona: persona && PERSONA_IDS.includes(persona) ? persona : undefined,
    embed: params.get('embed') === '1',
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [web] = useState(readWebParams);
  const [state, setState] = useState<Persisted>(INITIAL);
  const [ready, setReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(web.embed);
  const [banner, setBanner] = useState<RankedInsight | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [freshTxId, setFreshTxId] = useState<string | null>(null);
  const [today, setToday] = useState(todayISO());
  const [voiceVisible, setVoiceVisible] = useState(false);
  const [voiceTargetTip, setVoiceTargetTip] = useState<RankedInsight | undefined>(undefined);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const openVoice = useCallback((tip?: RankedInsight) => {
    setVoiceTargetTip(tip);
    setVoiceVisible(true);
  }, []);

  const closeVoice = useCallback(() => {
    setVoiceVisible(false);
    setVoiceTargetTip(undefined);
  }, []);

  // Load what the customer chose earlier.
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!alive) return;
        const saved = raw ? (JSON.parse(raw) as Partial<Persisted>) : {};
        setState({
          ...INITIAL,
          ...saved,
          prefs: { domains: { ...DEFAULT_PREFS.domains, ...saved.prefs?.domains } },
          byPersona: { ...INITIAL.byPersona, ...saved.byPersona },
          ...(web.persona ? { personaId: web.persona } : {}),
        });
      })
      .catch(() => undefined)
      .finally(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, [web.persona]);

  useEffect(() => {
    if (ready) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => undefined);
  }, [state, ready]);

  // A demo that runs past midnight should move with the calendar.
  useEffect(() => {
    const id = setInterval(() => setToday(todayISO()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const personaId = state.personaId;
  const personaState = state.byPersona[personaId] ?? EMPTY_PERSONA;
  const data = useMemo(() => buildPersona(personaId, today), [personaId, today]);

  const transactions = useMemo(() => {
    const live = personaState.booked
      .map((b) => {
        const event = data.live.find((e) => e.id === b.eventId);
        return event ? bookLiveEvent(personaId, event, b.date) : null;
      })
      .filter((tx): tx is Transaction => tx !== null);
    return [...data.history, ...live];
  }, [data, personaState.booked, personaId]);

  const runAnalysis = useCallback(
    (txs: Transaction[], feedback: FeedbackState) =>
      analyze({
        transactions: txs,
        today,
        profile: { firstName: data.persona.firstName, age: data.persona.age },
        openingBalance: data.openingBalance,
        feedback,
        prefs: state.prefs,
      }),
    [today, data, state.prefs],
  );

  const analysis = useMemo(() => runAnalysis(transactions, personaState.feedback), [runAnalysis, transactions, personaState.feedback]);
  const balance = useMemo(() => currentBalance(transactions, data.openingBalance, today), [transactions, data.openingBalance, today]);

  const updatePersona = useCallback(
    (fn: (p: PersonaState) => PersonaState) =>
      setState((s) => ({ ...s, byPersona: { ...s.byPersona, [s.personaId]: fn(s.byPersona[s.personaId] ?? EMPTY_PERSONA) } })),
    [],
  );

  const showToast = useCallback((text: string) => {
    setToast({ id: Date.now(), text });
  }, []);

  const triggerLive = useCallback(
    (eventId: string) => {
      const event = data.live.find((e) => e.id === eventId);
      if (!event || personaState.booked.some((b) => b.eventId === eventId)) return;
      const tx = bookLiveEvent(personaId, event, today);
      const before = new Set(analysis.insights.map((i) => i.id));
      const after = runAnalysis([...transactions, tx], personaState.feedback);
      const fresh = after.insights
        .filter((i) => !before.has(i.id) && i.status === 'new')
        .sort((a, b) => attention(b, today) - attention(a, today))[0];

      updatePersona((p) => ({ ...p, booked: [...p.booked, { eventId, date: today }] }));
      setFreshTxId(tx.id);
      if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // The bank books the payment first; Kate reacts a moment later, like a real push would.
      if (fresh && state.notify) {
        timers.current.push(setTimeout(() => setBanner(fresh), 1_600));
      }
      timers.current.push(setTimeout(() => setFreshTxId(null), 12_000));
    },
    [data.live, personaState, personaId, today, analysis.insights, runAnalysis, transactions, updatePersona, state.notify],
  );

  const giveFeedback = useCallback(
    (insight: Pick<RankedInsight, 'id' | 'type'>, action: FeedbackAction) => {
      updatePersona((p) => ({ ...p, feedback: applyFeedback(p.feedback, insight, action, today) }));
    },
    [updatePersona, today],
  );

  const switchPersona = useCallback((id: PersonaId) => {
    setBanner(null);
    setFreshTxId(null);
    setState((s) => ({ ...s, personaId: id }));
  }, []);

  const resetPersona = useCallback(() => {
    setBanner(null);
    setFreshTxId(null);
    updatePersona(() => EMPTY_PERSONA);
  }, [updatePersona]);

  // The demo website drives the embedded app with postMessage (same origin only).
  const handlers = useRef({ triggerLive, switchPersona, resetPersona });
  useEffect(() => {
    handlers.current = { triggerLive, switchPersona, resetPersona };
  });
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const msg = e.data as { source?: string; action?: string; value?: string };
      if (msg?.source !== 'kate-demo' || typeof msg.action !== 'string') return;
      if (msg.action === 'trigger' && typeof msg.value === 'string') handlers.current.triggerLive(msg.value);
      if (msg.action === 'persona' && PERSONA_IDS.includes(msg.value as PersonaId)) handlers.current.switchPersona(msg.value as PersonaId);
      if (msg.action === 'reset') handlers.current.resetPersona();
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const value: AppState = {
    ready,
    loggedIn,
    embedded: web.embed,
    login: () => setLoggedIn(true),
    logout: () => setLoggedIn(false),
    today,
    lang: state.lang,
    setLang: (lang) => setState((s) => ({ ...s, lang })),
    prefs: state.prefs,
    toggleDomain: (domain) =>
      setState((s) => ({ ...s, prefs: { domains: { ...s.prefs.domains, [domain]: !s.prefs.domains[domain] } } })),
    notify: state.notify,
    setNotify: (notify) => setState((s) => ({ ...s, notify })),
    personaId,
    data,
    transactions,
    balance,
    analysis,
    liveEvents: data.live.map((event) => ({ event, booked: personaState.booked.some((b) => b.eventId === event.id) })),
    freshTxId,
    switchPersona,
    triggerLive,
    resetPersona,
    giveFeedback,
    banner,
    dismissBanner: () => setBanner(null),
    toast,
    showToast,
    voiceVisible,
    voiceTargetTip,
    openVoice,
    closeVoice,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp outside AppProvider');
  return ctx;
}

/** Pick the string for the current language. */
export function useT() {
  const { lang } = useApp();
  return useCallback((text: { nl: string; en: string }) => text[lang], [lang]);
}
