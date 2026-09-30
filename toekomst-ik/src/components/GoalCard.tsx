import React from 'react';
import { StyleSheet, View } from 'react-native';
import { formatDateNL, formatEUR, type GoalOutcome } from '../../engine';
import { colors } from '../theme/theme';
import { ProgressBar, T } from './ui';

export function GoalCard({ goal, scenarioDate }: { goal: GoalOutcome; scenarioDate?: string | null }) {
  const late = goal.monthsDelta !== null && goal.monthsDelta >= 2;
  const unreachable = goal.achievedDate === null;
  const done = goal.progress >= 1;
  const tone = done ? colors.green : unreachable || (goal.monthsDelta ?? 0) >= 12 ? colors.red : late ? colors.amber : colors.green;
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <T variant="subheading" style={{ flex: 1 }}>{goal.name}</T>
        <T variant="caption" style={{ fontWeight: '700', color: colors.navy }}>
          {formatEUR(goal.currentCents, { decimals: 0 })} / {formatEUR(goal.targetCents, { decimals: 0 })}
        </T>
      </View>
      <ProgressBar value={goal.progress} color={tone} />
      <View style={[styles.row, { marginTop: 6 }]}>
        <T variant="caption">Gepland: {formatDateNL(goal.targetDate)}</T>
        <T variant="caption" style={{ color: tone, fontWeight: '600' }}>
          {done
            ? 'Bereikt'
            : unreachable
              ? 'Niet in zicht'
              : `Verwacht: ${formatDateNL(goal.achievedDate!)}${goal.monthsDelta ? ` (${Math.abs(goal.monthsDelta)} mnd ${goal.monthsDelta > 0 ? 'later' : 'vroeger'})` : ''}`}
        </T>
      </View>
      {scenarioDate !== undefined ? (
        <T variant="caption" style={{ color: colors.accent, fontWeight: '600', marginTop: 2 }}>
          In scenario: {scenarioDate ? formatDateNL(scenarioDate) : 'niet in zicht'}
        </T>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
});
