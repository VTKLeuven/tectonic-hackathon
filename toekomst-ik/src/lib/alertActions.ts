/** One place that turns an alert action into store changes and navigation. */
import { useCallback, useState } from 'react';
import { router } from 'expo-router';
import type { Alert, AlertActionKind } from '../../engine';
import type { BudgetTarget } from '../components/BudgetSheet';
import { useStore } from '../store/useStore';
import { haptic } from './haptics';

export function alertToContext(alert: Alert): string {
  return [`${alert.title} (${alert.severity})`, alert.message, ...alert.why.lines.map((l) => `${l.label.trim()}: ${l.value}`), alert.impact?.text ?? ''].filter(Boolean).join('\n');
}

export function useAlertActions() {
  const resolve = useStore((s) => s.resolveAlert);
  const snooze = useStore((s) => s.snoozeAlert);
  const setBudget = useStore((s) => s.setBudget);
  const setPendingChat = useStore((s) => s.setPendingChat);
  const budgets = useStore((s) => s.overlays[s.personaId].budgets);
  const [budgetTarget, setBudgetTarget] = useState<BudgetTarget | null>(null);

  const onAction = useCallback(
    (kind: AlertActionKind, alert: Alert) => {
      switch (kind) {
        case 'eenmalig':
          haptic.success();
          resolve(alert.id, alert.transactionIds ?? (alert.transactionId ? [alert.transactionId] : []));
          break;
        case 'snooze':
          snooze(alert.id);
          break;
        case 'budget': {
          const category = alert.category ?? 'overig';
          const current = budgets.find((b) => b.category === category)?.monthlyCents ?? null;
          setBudgetTarget({ category, suggestedCents: alert.suggestedBudgetCents ?? current ?? 10000, currentCents: current });
          break;
        }
        case 'chat':
          setPendingChat({ prompt: alert.chatPrompt, alertContext: alertToContext(alert) });
          router.navigate('/(tabs)/praat');
          break;
      }
    },
    [resolve, snooze, budgets, setPendingChat],
  );

  return { onAction, budgetTarget, closeBudget: () => setBudgetTarget(null), saveBudget: setBudget };
}
