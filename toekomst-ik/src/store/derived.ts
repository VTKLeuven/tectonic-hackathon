/** Derived, memoised views of the customer's state. All maths comes from the engine. */
import { useMemo } from 'react';
import {
  buildProjectionInput,
  buildSnapshot,
  evaluateAlerts,
  generateTransactions,
  getPersona,
  project,
  type CustomerState,
  type ISODate,
  type PersonaId,
  type Scenario,
} from '../../engine';
import { todayOf, useStore } from './useStore';

const historyCache = new Map<string, ReturnType<typeof generateTransactions>>();

export function baseHistory(personaId: PersonaId, anchorDate: ISODate) {
  const key = `${personaId}:${anchorDate}`;
  let txs = historyCache.get(key);
  if (!txs) {
    txs = generateTransactions(getPersona(personaId), anchorDate);
    historyCache.set(key, txs);
  }
  return txs;
}

export function useCustomerState(): CustomerState {
  const personaId = useStore((s) => s.personaId);
  const anchorDate = useStore((s) => s.anchorDate);
  const dayOffset = useStore((s) => s.dayOffset);
  const overlay = useStore((s) => s.overlays[s.personaId]);
  return useMemo(() => {
    const persona = getPersona(personaId);
    const base = baseHistory(personaId, anchorDate);
    const transactions = overlay.extraTransactions.length ? [...base, ...overlay.extraTransactions] : base;
    return {
      persona,
      today: todayOf({ anchorDate, dayOffset }),
      transactions,
      accounts: overlay.accounts,
      goals: persona.goals,
      budgets: overlay.budgets,
      excludedTxIds: overlay.excludedTxIds,
      alertMemory: overlay.alertMemory,
    };
  }, [personaId, anchorDate, dayOffset, overlay]);
}

export function useAlerts() {
  const state = useCustomerState();
  return useMemo(() => evaluateAlerts(state), [state]);
}

export function useProjection(scenario?: Scenario) {
  const state = useCustomerState();
  return useMemo(() => {
    const input = buildProjectionInput(state);
    const base = project(input);
    const scen = scenario && Object.keys(scenario).length ? project(input, scenario) : null;
    return { input, base, scen };
  }, [state, scenario]);
}

export function useSnapshot() {
  const state = useCustomerState();
  return useMemo(() => buildSnapshot(state), [state]);
}

export function useToday(): ISODate {
  const anchorDate = useStore((s) => s.anchorDate);
  const dayOffset = useStore((s) => s.dayOffset);
  return todayOf({ anchorDate, dayOffset });
}
