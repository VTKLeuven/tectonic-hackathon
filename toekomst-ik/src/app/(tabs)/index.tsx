import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { allCategoryStats, formatDateNL, formatEUR, totalStats } from '../../../engine';
import { AlertCard } from '../../components/AlertCard';
import { BudgetSheet } from '../../components/BudgetSheet';
import { GoalCard } from '../../components/GoalCard';
import { SpendingCompare } from '../../components/SpendingCompare';
import { Button, Card, Screen, SectionHeader, StatTile, T } from '../../components/ui';
import { useAlertActions } from '../../lib/alertActions';
import { useAlerts, useCustomerState, useProjection } from '../../store/derived';
import { useStore } from '../../store/useStore';
import { colors } from '../../theme/theme';

function greeting(today: string): string {
  const h = new Date().getHours();
  const part = h < 12 ? 'Goeiemorgen' : h < 18 ? 'Goeiemiddag' : 'Goeieavond';
  return `${part}`;
}

export default function VandaagScreen() {
  const state = useCustomerState();
  const { active } = useAlerts();
  const { base } = useProjection();
  const nightly = useStore((s) => s.overlays[s.personaId].nightly);
  const { onAction, budgetTarget, closeBudget, saveBudget } = useAlertActions();
  const stats = useMemo(() => allCategoryStats(state), [state]);
  const totals = useMemo(() => totalStats(state), [state]);
  const zicht = state.accounts.find((a) => a.id === 'zicht')?.balanceCents ?? 0;
  const spaar = state.accounts.find((a) => a.id === 'spaar')?.balanceCents ?? 0;
  const beleggen = state.accounts.find((a) => a.id === 'beleggen')?.balanceCents ?? 0;
  const p = state.persona;
  const overNormal = totals.projectedCents - totals.baselineCents;

  return (
    <Screen>
      <View style={{ marginTop: 8 }}>
        <T variant="caption">{formatDateNL(state.today)} · {p.householdLabel}</T>
        <T variant="title" style={{ marginTop: 2 }}>{greeting(state.today)}, {p.firstName} {p.emoji}</T>
      </View>

      <Card tone="navy">
        <T variant="label" style={{ color: 'rgba(255,255,255,0.7)' }}>Zichtrekening</T>
        <T variant="amount" style={{ color: colors.white, marginTop: 2 }}>{formatEUR(zicht)}</T>
        <View style={styles.balanceRow}>
          <View style={{ flex: 1 }}>
            <T variant="caption" style={{ color: 'rgba(255,255,255,0.7)' }}>Spaarrekening</T>
            <T variant="amountSmall" style={{ color: colors.white }}>{formatEUR(spaar, { decimals: 0 })}</T>
          </View>
          {beleggen > 0 ? (
            <View style={{ flex: 1 }}>
              <T variant="caption" style={{ color: 'rgba(255,255,255,0.7)' }}>Beleggingen</T>
              <T variant="amountSmall" style={{ color: colors.white }}>{formatEUR(beleggen, { decimals: 0 })}</T>
            </View>
          ) : null}
          <View style={{ flex: 1 }}>
            <T variant="caption" style={{ color: 'rgba(255,255,255,0.7)' }}>Vermogen 2035</T>
            <T variant="amountSmall" style={{ color: colors.accent }}>{formatEUR(base.at2035.netWorthCents, { decimals: 0 })}</T>
          </View>
        </View>
      </Card>

      <SectionHeader title="Deze maand" action="Details" onAction={() => router.navigate('/(tabs)/waakhond')} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <StatTile label={`Uitgegeven (dag ${totals.daysElapsed}/${totals.daysInMonth})`} value={formatEUR(totals.mtdCents, { decimals: 0 })} sub={`normaal ${formatEUR(totals.baselineCents, { decimals: 0 })} per maand`} />
        <StatTile
          label="Verwacht einde maand"
          value={formatEUR(totals.projectedCents, { decimals: 0 })}
          sub={overNormal > 4000 ? `${formatEUR(overNormal, { decimals: 0 })} boven je normaal` : 'binnen je normaal'}
          tone={overNormal > 4000 ? 'bad' : 'good'}
        />
      </View>
      <Card>
        <T variant="label" style={{ marginBottom: 10 }}>Deze maand tegenover jouw normaal</T>
        <SpendingCompare stats={stats} />
      </Card>

      <SectionHeader title={`Waakhond · ${active.length} ${active.length === 1 ? 'signaal' : 'signalen'}`} action="Alles" onAction={() => router.navigate('/(tabs)/waakhond')} />
      {active.length === 0 ? (
        <Card tone="accent">
          <T variant="subheading">Alles rustig</T>
          <T variant="caption" style={{ marginTop: 4 }}>Geen signalen die je aandacht vragen. De Waakhond kijkt elke dag opnieuw.</T>
        </Card>
      ) : (
        active.slice(0, 2).map((a) => <AlertCard key={a.id} alert={a} compact onAction={onAction} />)
      )}

      <SectionHeader title="Doelen" action="Toekomst" onAction={() => router.navigate('/(tabs)/toekomst')} />
      <Card style={{ gap: 16 }}>
        {base.goals.map((g) => (
          <GoalCard key={g.goalId} goal={g} />
        ))}
      </Card>

      {nightly.length ? (
        <>
          <SectionHeader title="Vannacht berekend" />
          <Card style={{ gap: 12 }}>
            {nightly.slice(0, 3).map((m) => (
              <View key={m.id}>
                <T variant="subheading">{m.title}</T>
                <T variant="caption" style={{ marginTop: 2 }}>{m.message}</T>
              </View>
            ))}
          </Card>
        </>
      ) : null}

      <Button label={`Praat met ${p.futureSelfName}`} onPress={() => router.navigate('/(tabs)/praat')} style={{ marginTop: 4 }} />
      <BudgetSheet target={budgetTarget} onClose={closeBudget} onSave={saveBudget} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  balanceRow: { flexDirection: 'row', marginTop: 16, gap: 8 },
});
