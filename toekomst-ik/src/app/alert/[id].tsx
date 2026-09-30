import React from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ALERT_TYPE_LABELS } from '../../../engine';
import { SeverityBadge } from '../../components/AlertCard';
import { BudgetSheet } from '../../components/BudgetSheet';
import { Button, Card, Row, Screen, SectionHeader, T } from '../../components/ui';
import { useAlertActions } from '../../lib/alertActions';
import { useAlerts } from '../../store/derived';
import { colors } from '../../theme/theme';

export default function AlertDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { candidates } = useAlerts();
  const alert = candidates.find((a) => a.id === id);
  const { onAction, budgetTarget, closeBudget, saveBudget } = useAlertActions();

  if (!alert) {
    return (
      <Screen inStack>
        <Card>
          <T variant="subheading">Dit signaal is niet meer actief</T>
          <T variant="caption" style={{ marginTop: 4 }}>Het werd opgelost, gesnoozed, of de cijfers zijn intussen veranderd.</T>
          <Button label="Terug" variant="ghost" onPress={() => router.back()} style={{ marginTop: 12 }} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen inStack>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <SeverityBadge severity={alert.severity} />
        <T variant="caption">{ALERT_TYPE_LABELS[alert.type]}</T>
      </View>
      <T variant="title">{alert.title}</T>
      <T variant="body">{alert.message}</T>

      {alert.impact ? (
        <Card tone="navy">
          <T variant="label" style={{ color: 'rgba(255,255,255,0.7)' }}>Wat dit betekent voor je toekomst</T>
          <T variant="body" style={{ color: colors.white, marginTop: 6 }}>{alert.impact.text}</T>
          <T variant="caption" style={{ color: 'rgba(255,255,255,0.7)', marginTop: 6 }}>Berekend door je twin met dezelfde aannames als het tabblad Toekomst.</T>
        </Card>
      ) : null}

      <SectionHeader title="De cijfers erachter" />
      <Card>
        {alert.why.lines.map((l, i) => (
          <Row key={`${l.label}-${i}`} label={l.label} value={l.value} strong={!l.label.startsWith(' ')} style={i === alert.why.lines.length - 1 ? { borderBottomWidth: 0 } : undefined} />
        ))}
      </Card>
      <Card tone="accent">
        <T variant="label">De regel die afging</T>
        <T variant="caption" style={{ marginTop: 4, color: colors.navy }}>{alert.why.rule}</T>
      </Card>

      <SectionHeader title="Wat wil je doen?" />
      <View style={{ gap: 8 }}>
        {alert.actions.map((a) => (
          <Button
            key={a.kind}
            label={a.label}
            variant={a.kind === 'chat' ? 'primary' : a.kind === 'eenmalig' ? 'secondary' : 'ghost'}
            onPress={() => {
              onAction(a.kind, alert);
              if (a.kind === 'eenmalig' || a.kind === 'snooze') router.back();
            }}
          />
        ))}
      </View>
      <BudgetSheet target={budgetTarget} onClose={closeBudget} onSave={saveBudget} />
    </Screen>
  );
}
