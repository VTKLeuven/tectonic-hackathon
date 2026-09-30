/**
 * App state. We persist only the customer's "overlay" (persona, clock, added transactions, decisions, chats);
 * the synthetic history is regenerated deterministically from the seed on every launch.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  addDays,
  dueRecurringTransactions,
  emptyAlertMemory,
  getPersona,
  resolveAlert as resolveInMemory,
  snoozeAlert as snoozeInMemory,
  todayISO,
  type Account,
  type AlertMemory,
  type Budget,
  type Category,
  type ISODate,
  type NightlyMessage,
  type PersonaId,
  type PresetTransaction,
  type Scenario,
  type ScenarioCard,
  type Transaction,
} from '../../engine';
import type { ServerStatus } from '../lib/api';

export interface UiChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  mode?: 'claude' | 'offline';
  scenario?: ScenarioCard;
  toolsUsed?: string[];
  createdAt: number;
}

export interface PendingChat {
  prompt: string;
  alertContext: string;
}

interface PersonaOverlay {
  extraTransactions: Transaction[];
  excludedTxIds: string[];
  budgets: Budget[];
  accounts: Account[];
  alertMemory: AlertMemory;
  chat: UiChatMessage[];
  nightly: NightlyMessage[];
  lastNightlyRun: ISODate | null;
  lastNightlyMs: number | null;
  seq: number;
}

export interface AppState {
  hydrated: boolean;
  personaId: PersonaId;
  anchorDate: ISODate;
  dayOffset: number;
  overlays: Record<PersonaId, PersonaOverlay>;
  scenario: Scenario;
  serverStatus: ServerStatus;
  pendingChat: PendingChat | null;
  lastNotificationInfo: string | null;

  // actions
  setHydrated: () => void;
  switchPersona: (id: PersonaId) => void;
  addPreset: (preset: PresetTransaction) => Transaction;
  jumpDays: (n: number) => Transaction[];
  resetAll: () => void;
  resolveAlert: (alertId: string, transactionIds?: string[]) => void;
  snoozeAlert: (alertId: string) => void;
  setBudget: (category: Category, monthlyCents: number | null) => void;
  markSeen: (alertIds: string[]) => void;
  noteNotification: (info: string) => void;
  setScenario: (s: Scenario) => void;
  setServerStatus: (s: ServerStatus) => void;
  appendChat: (msg: UiChatMessage, personaId?: PersonaId) => void;
  clearChat: () => void;
  setPendingChat: (p: PendingChat | null) => void;
  setNightly: (messages: NightlyMessage[], ms: number, memory?: AlertMemory) => void;
}

function freshOverlay(id: PersonaId): PersonaOverlay {
  const p = getPersona(id);
  return {
    extraTransactions: [],
    excludedTxIds: [],
    budgets: p.budgets.map((b) => ({ ...b })),
    accounts: p.accounts.map((a) => ({ ...a })),
    alertMemory: emptyAlertMemory(),
    chat: [],
    nightly: [],
    lastNightlyRun: null,
    lastNightlyMs: null,
    seq: 1,
  };
}

function freshOverlays(): Record<PersonaId, PersonaOverlay> {
  return {
    lotte: freshOverlay('lotte'),
    'sam-noor': freshOverlay('sam-noor'),
    marc: freshOverlay('marc'),
    emma: freshOverlay('emma'),
  };
}

export const todayOf = (s: Pick<AppState, 'anchorDate' | 'dayOffset'>): ISODate => addDays(s.anchorDate, s.dayOffset);

function applyToAccounts(accounts: Account[], txs: Transaction[]): Account[] {
  const next = accounts.map((a) => ({ ...a }));
  for (const t of txs) {
    const acc = next.find((a) => a.id === t.accountId);
    if (acc) acc.balanceCents += t.amountCents;
  }
  return next;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      personaId: 'lotte',
      anchorDate: todayISO(),
      dayOffset: 0,
      overlays: freshOverlays(),
      scenario: {},
      serverStatus: 'unknown',
      pendingChat: null,
      lastNotificationInfo: null,

      setHydrated: () => set({ hydrated: true }),

      switchPersona: (id) => set({ personaId: id, scenario: {}, pendingChat: null }),

      addPreset: (preset) => {
        const s = get();
        const ov = s.overlays[s.personaId];
        const tx: Transaction = {
          id: `demo-${s.personaId}-${ov.seq}`,
          date: todayOf(s),
          amountCents: preset.amountCents,
          merchant: preset.merchant,
          category: preset.category,
          accountId: 'zicht',
          description: preset.description,
          recurring: preset.recurring,
          subscriptionKind: preset.subscriptionKind,
        };
        set({
          overlays: {
            ...s.overlays,
            [s.personaId]: {
              ...ov,
              seq: ov.seq + 1,
              extraTransactions: [...ov.extraTransactions, tx],
              accounts: applyToAccounts(ov.accounts, [tx]),
            },
          },
        });
        return tx;
      },

      jumpDays: (n) => {
        const s = get();
        const from = todayOf(s);
        const to = addDays(from, n);
        const ov = s.overlays[s.personaId];
        const due = dueRecurringTransactions(getPersona(s.personaId), from, to, ov.seq);
        set({
          dayOffset: s.dayOffset + n,
          overlays: {
            ...s.overlays,
            [s.personaId]: {
              ...ov,
              seq: ov.seq + due.length + 1,
              extraTransactions: [...ov.extraTransactions, ...due],
              accounts: applyToAccounts(ov.accounts, due),
            },
          },
        });
        return due;
      },

      resetAll: () =>
        set({
          personaId: 'lotte',
          anchorDate: todayISO(),
          dayOffset: 0,
          overlays: freshOverlays(),
          scenario: {},
          pendingChat: null,
          lastNotificationInfo: null,
        }),

      resolveAlert: (alertId, transactionIds = []) => {
        const s = get();
        const ov = s.overlays[s.personaId];
        const excluded = new Set(ov.excludedTxIds);
        for (const id of transactionIds) excluded.add(id);
        set({
          overlays: {
            ...s.overlays,
            [s.personaId]: {
              ...ov,
              alertMemory: resolveInMemory(ov.alertMemory, alertId, todayOf(s)),
              excludedTxIds: [...excluded],
            },
          },
        });
      },

      snoozeAlert: (alertId) => {
        const s = get();
        const ov = s.overlays[s.personaId];
        set({ overlays: { ...s.overlays, [s.personaId]: { ...ov, alertMemory: snoozeInMemory(ov.alertMemory, alertId, todayOf(s)) } } });
      },

      setBudget: (category, monthlyCents) => {
        const s = get();
        const ov = s.overlays[s.personaId];
        const budgets = ov.budgets.filter((b) => b.category !== category);
        if (monthlyCents && monthlyCents > 0) budgets.push({ category, monthlyCents });
        set({ overlays: { ...s.overlays, [s.personaId]: { ...ov, budgets } } });
      },

      markSeen: (alertIds) => {
        const s = get();
        const ov = s.overlays[s.personaId];
        const today = todayOf(s);
        const firstSeen = { ...ov.alertMemory.firstSeen };
        let changed = false;
        for (const id of alertIds) {
          if (!firstSeen[id]) {
            firstSeen[id] = today;
            changed = true;
          }
        }
        if (!changed) return;
        set({ overlays: { ...s.overlays, [s.personaId]: { ...ov, alertMemory: { ...ov.alertMemory, firstSeen } } } });
      },

      noteNotification: (info) => {
        const s = get();
        const ov = s.overlays[s.personaId];
        set({
          lastNotificationInfo: info,
          overlays: { ...s.overlays, [s.personaId]: { ...ov, alertMemory: { ...ov.alertMemory, lastNotificationDate: todayOf(s) } } },
        });
      },

      setScenario: (scenario) => set({ scenario }),
      setServerStatus: (serverStatus) => set({ serverStatus }),

      appendChat: (msg, personaId) => {
        const s = get();
        const pid = personaId ?? s.personaId;
        const ov = s.overlays[pid];
        set({ overlays: { ...s.overlays, [pid]: { ...ov, chat: [...ov.chat, msg].slice(-40) } } });
      },

      clearChat: () => {
        const s = get();
        const ov = s.overlays[s.personaId];
        set({ overlays: { ...s.overlays, [s.personaId]: { ...ov, chat: [] } } });
      },

      setPendingChat: (pendingChat) => set({ pendingChat }),

      setNightly: (messages, ms, memory) => {
        const s = get();
        const ov = s.overlays[s.personaId];
        set({
          overlays: {
            ...s.overlays,
            [s.personaId]: { ...ov, nightly: messages, lastNightlyRun: todayOf(s), lastNightlyMs: ms, alertMemory: memory ?? ov.alertMemory },
          },
        });
      },
    }),
    {
      name: 'toekomst-ik-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        personaId: s.personaId,
        anchorDate: s.anchorDate,
        dayOffset: s.dayOffset,
        overlays: s.overlays,
        scenario: s.scenario,
      }),
      // Deep-fill so a store persisted by an older build never lacks a persona or a field.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<AppState>;
        const fresh = freshOverlays();
        const overlays = Object.fromEntries(
          (Object.keys(fresh) as PersonaId[]).map((k) => {
            const stored: Partial<PersonaOverlay> = p.overlays?.[k] ?? {};
            return [k, { ...fresh[k], ...stored, alertMemory: { ...emptyAlertMemory(), ...(stored.alertMemory ?? {}) } }];
          }),
        ) as Record<PersonaId, PersonaOverlay>;
        const merged: AppState = { ...current, ...p, overlays };
        // A pristine store (no demo actions yet) follows the real calendar; otherwise the clock stays deterministic.
        const pristine = Object.values(overlays).every((o) => o.extraTransactions.length === 0 && o.chat.length === 0 && Object.keys(o.alertMemory.resolved).length === 0);
        if (pristine && merged.dayOffset === 0) merged.anchorDate = todayISO();
        return merged;
      },
      onRehydrateStorage: () => () => {
        // Runs on success and on failure: the app must never stay on the spinner.
        useStore.setState({ hydrated: true });
      },
    },
  ),
);

export const useOverlay = () => useStore((s) => s.overlays[s.personaId]);
