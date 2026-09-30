import { emptyAlertMemory, generateTransactions, type CustomerState, type Persona } from '../index';

export function stateFor(persona: Persona, today: string): CustomerState {
  return {
    persona,
    today,
    transactions: generateTransactions(persona, today),
    accounts: persona.accounts.map((a) => ({ ...a })),
    goals: persona.goals,
    budgets: persona.budgets,
    excludedTxIds: [],
    alertMemory: emptyAlertMemory(),
  };
}

export const TEST_DATES = ['2026-09-30', '2026-10-03', '2026-10-14', '2026-11-20', '2027-01-08'];
