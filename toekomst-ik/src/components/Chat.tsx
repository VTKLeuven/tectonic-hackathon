import React, { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { formatDateNL, formatEUR, type ScenarioCard } from '../../engine';
import { colors, radius, spacing } from '../theme/theme';
import type { UiChatMessage } from '../store/useStore';
import { ProjectionChart } from './ProjectionChart';
import { T } from './ui';

const TOOL_LABELS: Record<string, string> = {
  get_financial_snapshot: 'financieel overzicht',
  simulate_scenario: 'scenario-simulatie',
  get_spending_details: 'uitgavendetails',
  get_alerts: 'Waakhond-signalen',
};

export function ScenarioCardView({ card }: { card: ScenarioCard }) {
  const delta = card.netWorth2035DeltaCents;
  return (
    <View style={styles.scenario}>
      <T variant="label">Scenario: {card.label}</T>
      <ProjectionChart
        compact
        height={120}
        baseline={card.baseline.map((p) => ({ date: p.date, value: p.netWorthCents }))}
        scenario={card.scenario.map((p) => ({ date: p.date, value: p.netWorthCents }))}
      />
      <T variant="caption" style={{ marginTop: 6 }}>
        Vermogen 2035: <T variant="caption" style={{ fontWeight: '700', color: delta < 0 ? colors.red : colors.green }}>{formatEUR(delta, { decimals: 0, signed: true })}</T> tegenover je huidige koers
        {card.feasibilityOk === false ? '  ·  betaalbaarheidsregel niet gehaald' : ''}
      </T>
      {card.goalDeltas
        .filter((g) => g.monthsDelta)
        .map((g) => (
          <T key={g.goalId} variant="caption">
            {g.name}: {g.scenarioDate ? formatDateNL(g.scenarioDate) : 'niet in zicht'} ({Math.abs(g.monthsDelta!)} mnd {g.monthsDelta! > 0 ? 'later' : 'vroeger'})
          </T>
        ))}
    </View>
  );
}

export function ChatBubble({ msg, futureName }: { msg: UiChatMessage; futureName: string }) {
  const mine = msg.role === 'user';
  return (
    <View style={[styles.bubbleWrap, mine ? styles.right : styles.left]}>
      {!mine ? (
        <T variant="caption" style={{ marginBottom: 3, marginLeft: 4, fontWeight: '600', color: colors.navy }}>
          {futureName}
          {msg.mode === 'offline' ? <T variant="caption" style={{ color: colors.amber, fontWeight: '700' }}>  ·  offline modus</T> : null}
        </T>
      ) : null}
      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
        <T variant="body" style={{ color: mine ? colors.white : colors.text }}>{msg.content}</T>
      </View>
      {msg.scenario ? <ScenarioCardView card={msg.scenario} /> : null}
      {!mine && msg.toolsUsed && msg.toolsUsed.length ? (
        <T variant="caption" style={{ marginTop: 3, marginLeft: 4, fontSize: 11, color: colors.textMuted }}>
          Cijfers berekend door de motor: {msg.toolsUsed.map((t) => TOOL_LABELS[t] ?? t).join(', ')}
        </T>
      ) : null}
    </View>
  );
}

export function TypingIndicator({ name }: { name: string }) {
  const [dots] = useState(() => [new Animated.Value(0.3), new Animated.Value(0.3), new Animated.Value(0.3)]);
  useEffect(() => {
    const anims = dots.map((d, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(d, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(d, { toValue: 0.3, duration: 300, useNativeDriver: true }),
          Animated.delay(300),
        ]),
      ),
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <View style={[styles.bubbleWrap, styles.left]}>
      <T variant="caption" style={{ marginBottom: 3, marginLeft: 4, fontWeight: '600', color: colors.navy }}>{name} denkt na…</T>
      <View style={[styles.bubble, styles.bubbleTheirs, { flexDirection: 'row', gap: 5, paddingVertical: 14 }]}>
        {dots.map((d, i) => (
          <Animated.View key={i} style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.navy, opacity: d }} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bubbleWrap: { maxWidth: '88%', marginBottom: spacing.md },
  left: { alignSelf: 'flex-start' },
  right: { alignSelf: 'flex-end' },
  bubble: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: radius.lg },
  bubbleMine: { backgroundColor: colors.navy, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: colors.card, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.border },
  scenario: { marginTop: 8, backgroundColor: colors.card, borderRadius: radius.md, padding: 12, borderWidth: 1, borderColor: colors.border, width: 300, maxWidth: '100%' },
});
