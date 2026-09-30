/** "Deze maand versus jouw normaal": horizontal bars per category. */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { CATEGORY_LABELS, formatEUR, type CategoryStats } from '../../engine';
import { colors, radius } from '../theme/theme';
import { T } from './ui';

export function SpendingCompare({ stats, limit = 6 }: { stats: CategoryStats[]; limit?: number }) {
  const rows = stats.filter((s) => s.category !== 'wonen' && (s.baselineCents > 0 || s.mtdCents > 0)).slice(0, limit);
  const max = Math.max(1, ...rows.map((r) => Math.max(r.baselineCents, r.projectedCents, r.mtdCents)));
  return (
    <View style={{ gap: 10 }}>
      {rows.map((r) => {
        const over = r.projectedCents > r.baselineCents * 1.3 && r.projectedCents - r.baselineCents > 4000;
        return (
          <View key={r.category}>
            <View style={styles.labelRow}>
              <T variant="caption" style={{ color: colors.navy, fontWeight: '600' }}>{CATEGORY_LABELS[r.category]}</T>
              <T variant="caption" style={{ fontVariant: ['tabular-nums'] }}>
                <T variant="caption" style={{ color: over ? colors.red : colors.navy, fontWeight: '700' }}>{formatEUR(r.mtdCents, { decimals: 0 })}</T>
                {'  ·  normaal '}{formatEUR(r.baselineCents, { decimals: 0 })}
              </T>
            </View>
            <View style={styles.track}>
              <View style={[styles.bar, { width: `${(r.baselineCents / max) * 100}%`, backgroundColor: colors.border }]} />
              <View style={[styles.bar, styles.barOverlay, { width: `${(r.mtdCents / max) * 100}%`, backgroundColor: over ? colors.red : colors.accent }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  track: { height: 10, backgroundColor: colors.background, borderRadius: radius.pill, overflow: 'hidden' },
  bar: { position: 'absolute', left: 0, top: 0, height: 10, borderRadius: radius.pill },
  barOverlay: { height: 6, top: 2 },
});
