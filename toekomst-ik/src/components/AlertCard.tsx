import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { SEVERITY_LABELS, type Alert, type AlertActionKind } from '../../engine';
import { colors, radius, severityColor, severitySoft, shadow, spacing } from '../theme/theme';
import { Button, T } from './ui';

export function SeverityBadge({ severity }: { severity: Alert['severity'] }) {
  return (
    <View style={[styles.badge, { backgroundColor: severitySoft[severity] }]}>
      <View style={[styles.dot, { backgroundColor: severityColor[severity] }]} />
      <T variant="caption" style={{ color: severityColor[severity], fontWeight: '700', fontSize: 12 }}>{SEVERITY_LABELS[severity]}</T>
    </View>
  );
}

export function AlertCard({
  alert,
  compact,
  onAction,
}: {
  alert: Alert;
  compact?: boolean;
  onAction?: (kind: AlertActionKind, alert: Alert) => void;
}) {
  const open = () => router.push({ pathname: '/alert/[id]', params: { id: alert.id } });
  return (
    <View style={[styles.card, { borderLeftColor: severityColor[alert.severity] }]}>
      <Pressable onPress={open}>
        <View style={styles.top}>
          <SeverityBadge severity={alert.severity} />
          <T variant="caption" style={{ color: colors.accent, fontWeight: '600' }}>Waarom zie ik dit? ›</T>
        </View>
        <T variant="subheading" style={{ marginTop: 8 }}>{alert.title}</T>
        <T variant="body" style={{ marginTop: 4 }} numberOfLines={compact ? 3 : undefined}>{alert.message}</T>
        {alert.impact ? (
          <View style={styles.impact}>
            <T variant="caption" style={{ color: colors.navy }}>
              <T variant="caption" style={{ fontWeight: '700', color: colors.navy }}>Toekomst: </T>
              {alert.impact.text}
            </T>
          </View>
        ) : null}
      </Pressable>
      {!compact && onAction ? (
        <View style={styles.actions}>
          {alert.actions.map((a) => (
            <Button
              key={a.kind}
              small
              label={a.label}
              variant={a.kind === 'chat' ? 'primary' : a.kind === 'eenmalig' ? 'secondary' : 'ghost'}
              onPress={() => onAction(a.kind, alert)}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, borderLeftWidth: 4, ...shadow },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 10, borderRadius: radius.pill },
  dot: { width: 8, height: 8, borderRadius: 4 },
  impact: { marginTop: 10, backgroundColor: colors.background, borderRadius: radius.sm, padding: 10 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
});
