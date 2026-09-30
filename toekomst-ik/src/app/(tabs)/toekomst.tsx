import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { CATEGORY_LABELS, compareProjections, describeScenario, formatDateNL, formatEUR, type Category, type Scenario, type WorkRegime } from '../../../engine';
import { GoalCard } from '../../components/GoalCard';
import { ProjectionChart } from '../../components/ProjectionChart';
import { Button, Card, Chip, Row, Screen, SectionHeader, StatTile, T } from '../../components/ui';
import { useCustomerState, useProjection } from '../../store/derived';
import { useStore } from '../../store/useStore';
import { colors } from '../../theme/theme';

type Metric = 'netWorthCents' | 'liquidCents' | 'investmentsCents' | 'debtCents';
const METRICS: { key: Metric; label: string }[] = [
  { key: 'netWorthCents', label: 'Vermogen' },
  { key: 'liquidCents', label: 'Spaargeld' },
  { key: 'investmentsCents', label: 'Beleggingen' },
  { key: 'debtCents', label: 'Schuld' },
];

const HOME_PRICES = [220_000, 280_000, 350_000, 450_000];
const SAVINGS = [50, 100, 150, 250, 400];
const CATEGORY_OPTIONS: Category[] = ['maaltijdbezorging', 'shopping', 'restaurants', 'reizen', 'boodschappen', 'abonnementen'];
const CATEGORY_DELTAS = [-150, -100, -50, 50, 100];
const CAR_PRICES = [8_000, 15_000, 25_000];

export default function ToekomstScreen() {
  const state = useCustomerState();
  const scenario = useStore((s) => s.scenario);
  const setScenario = useStore((s) => s.setScenario);
  const [metric, setMetric] = useState<Metric>('netWorthCents');
  const [fullHorizon, setFullHorizon] = useState(false);
  const { base, scen } = useProjection(scenario);
  const year = Number(state.today.slice(0, 4));
  const cmp = useMemo(() => (scen ? compareProjections(base, scen) : null), [base, scen]);
  const hasScenario = Object.keys(scenario).length > 0;

  const toPoints = (r: typeof base) => r.points.filter((p) => fullHorizon || p.date <= '2035-12-31').map((p) => ({ date: p.date, value: p[metric] }));
  const patch = (p: Partial<Scenario>) => setScenario({ ...scenario, ...p });
  const toggle = <K extends keyof Scenario>(key: K, value: Scenario[K]) => {
    if (JSON.stringify(scenario[key]) === JSON.stringify(value)) {
      const next = { ...scenario };
      delete next[key];
      setScenario(next);
    } else patch({ [key]: value } as Partial<Scenario>);
  };

  return (
    <Screen title="Toekomst" subtitle={`Je twin rekent elke maand door tot ${fullHorizon ? `je pensioen (${formatDateNL(base.retirementDate)})` : '2035'}.`}>
      <Card>
        <View style={styles.metricRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {METRICS.map((m) => (
              <Chip key={m.key} label={m.label} selected={metric === m.key} onPress={() => setMetric(m.key)} />
            ))}
          </ScrollView>
        </View>
        <ProjectionChart
          baseline={toPoints(base)}
          scenario={scen ? toPoints(scen) : null}
          height={220}
          markers={[{ date: '2035-06-01', label: '2035' }, ...(fullHorizon ? [{ date: base.retirementDate, label: 'pensioen' }] : [])]}
          scenarioLabel={hasScenario ? describeScenario(scenario) : 'Scenario'}
        />
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
          <Chip label={fullHorizon ? 'Toon tot 2035' : 'Toon tot pensioen'} onPress={() => setFullHorizon((v) => !v)} />
        </View>
      </Card>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <StatTile label="Vermogen 2035" value={formatEUR((scen ?? base).at2035.netWorthCents, { decimals: 0 })} sub={cmp ? `${formatEUR(cmp.netWorth2035DeltaCents, { decimals: 0, signed: true })} t.o.v. koers` : `huidige koers`} tone={cmp ? (cmp.netWorth2035DeltaCents < 0 ? 'bad' : 'good') : undefined} />
        <StatTile label={`Bij pensioen (${base.retirementDate.slice(0, 4)})`} value={formatEUR((scen ?? base).atRetirement.netWorthCents, { decimals: 0 })} sub={cmp ? `${formatEUR(cmp.netWorthRetirementDeltaCents, { decimals: 0, signed: true })}` : `op ${state.persona.retirementAge} jaar`} tone={cmp ? (cmp.netWorthRetirementDeltaCents < 0 ? 'bad' : 'good') : undefined} />
      </View>

      <Card>
        <Row label="Netto-inkomen per maand" value={formatEUR((scen ?? base).monthlyIncomeCents, { decimals: 0 })} />
        <Row label="Uitgaven per maand (incl. wonen)" value={formatEUR((scen ?? base).monthlySpendingCents, { decimals: 0 })} />
        <Row label="Overschot per maand" value={formatEUR((scen ?? base).monthlySurplusCents, { decimals: 0 })} strong style={{ borderBottomWidth: 0 }} />
        {scen?.feasibility ? (
          <View style={[styles.note, { backgroundColor: scen.feasibility.ok ? colors.greenSoft : colors.redSoft }]}>
            <T variant="caption" style={{ color: scen.feasibility.ok ? colors.green : colors.red, fontWeight: '700' }}>
              {scen.feasibility.ok ? 'Aankoop past binnen de betaalbaarheidsregel' : 'Aankoop botst op de regels'}
            </T>
            <T variant="caption" style={{ marginTop: 2 }}>
              Eigen inbreng {formatEUR(scen.feasibility.ownContributionCents ?? 0, { decimals: 0 })}, lening {formatEUR(scen.feasibility.loanCents ?? 0, { decimals: 0 })}, afbetaling {formatEUR(scen.feasibility.monthlyPaymentCents ?? 0, { decimals: 0 })} per maand ({Math.round((scen.feasibility.paymentToIncome ?? 0) * 100)} % van je inkomen).
              {scen.feasibility.reasons.length ? ` ${scen.feasibility.reasons.join(' ')}` : ''}
            </T>
          </View>
        ) : null}
      </Card>

      <SectionHeader title="Doelen op de tijdlijn" />
      <Card style={{ gap: 16 }}>
        {base.goals.map((g) => (
          <GoalCard key={g.goalId} goal={g} scenarioDate={scen ? (scen.goals.find((x) => x.goalId === g.goalId)?.achievedDate ?? null) : undefined} />
        ))}
      </Card>

      <SectionHeader title="Wat als…" action={hasScenario ? 'Wis scenario' : undefined} onAction={() => setScenario({})} />
      <Card style={{ gap: 14 }}>
        <View>
          <T variant="subheading">Werkregime</T>
          <View style={styles.chips}>
            {(['voltijds', '4/5', 'halftijds'] as WorkRegime[]).map((r) => (
              <Chip key={r} label={r === state.persona.workRegime ? `${r} (nu)` : r} selected={scenario.workRegime === r} onPress={() => toggle('workRegime', r)} />
            ))}
          </View>
        </View>
        {state.persona.housing.type === 'huur' ? (
          <View>
            <T variant="subheading">Een huis kopen</T>
            <T variant="caption">Prijs</T>
            <View style={styles.chips}>
              {HOME_PRICES.map((p) => (
                <Chip key={p} label={formatEUR(p * 100, { decimals: 0 })} selected={scenario.homePurchase?.priceCents === p * 100} onPress={() => patch({ homePurchase: { priceCents: p * 100, year: scenario.homePurchase?.year ?? year + 3 } })} />
              ))}
            </View>
            {scenario.homePurchase ? (
              <>
                <T variant="caption" style={{ marginTop: 6 }}>Jaar</T>
                <View style={styles.chips}>
                  {[1, 2, 3, 5, 8].map((n) => (
                    <Chip key={n} label={String(year + n)} selected={scenario.homePurchase?.year === year + n} onPress={() => patch({ homePurchase: { ...scenario.homePurchase!, year: year + n } })} />
                  ))}
                  <Chip label="Geen aankoop" onPress={() => toggle('homePurchase', scenario.homePurchase)} />
                </View>
                <T variant="caption" style={{ marginTop: 6 }}>Eigen inbreng</T>
                <View style={styles.chips}>
                  <Chip label="Minimum (10 % + kosten)" selected={scenario.homePurchase?.ownContributionCents === undefined} onPress={() => patch({ homePurchase: { priceCents: scenario.homePurchase!.priceCents, year: scenario.homePurchase!.year } })} />
                  {[30_000, 50_000, 80_000].map((own) => (
                    <Chip key={own} label={formatEUR(own * 100, { decimals: 0 })} selected={scenario.homePurchase?.ownContributionCents === own * 100} onPress={() => patch({ homePurchase: { ...scenario.homePurchase!, ownContributionCents: own * 100 } })} />
                  ))}
                </View>
              </>
            ) : null}
          </View>
        ) : (
          <View>
            <T variant="subheading">Een huis kopen</T>
            <T variant="caption" style={{ marginTop: 4 }}>Je hebt al een eigen woning met woonkrediet; die zit in de projectie. Een tweede woning zit niet in dit proof of concept.</T>
          </View>
        )}
        <View>
          <T variant="subheading">Elke maand extra sparen</T>
          <View style={styles.chips}>
            {SAVINGS.map((s) => (
              <Chip key={s} label={`€ ${s}`} selected={scenario.extraMonthlySavingCents === s * 100} onPress={() => toggle('extraMonthlySavingCents', s * 100)} />
            ))}
          </View>
        </View>
        <View>
          <T variant="subheading">Anders uitgeven in één categorie</T>
          <View style={styles.chips}>
            {CATEGORY_OPTIONS.map((c) => (
              <Chip key={c} label={CATEGORY_LABELS[c]} selected={scenario.categoryChange?.category === c} onPress={() => patch({ categoryChange: { category: c, deltaMonthlyCents: scenario.categoryChange?.deltaMonthlyCents ?? -5000 } })} />
            ))}
          </View>
          {scenario.categoryChange ? (
            <View style={styles.chips}>
              {CATEGORY_DELTAS.map((d) => (
                <Chip key={d} label={`${d > 0 ? '+' : ''}€ ${d}/mnd`} selected={scenario.categoryChange?.deltaMonthlyCents === d * 100} onPress={() => patch({ categoryChange: { category: scenario.categoryChange!.category, deltaMonthlyCents: d * 100 } })} />
              ))}
              <Chip label="Wis" onPress={() => toggle('categoryChange', scenario.categoryChange)} />
            </View>
          ) : null}
        </View>
        <View>
          <T variant="subheading">Een kindje</T>
          <View style={styles.chips}>
            {[1, 2, 4].map((n) => (
              <Chip key={n} label={`in ${year + n}`} selected={scenario.child?.year === year + n} onPress={() => toggle('child', { year: year + n })} />
            ))}
          </View>
        </View>
        <View>
          <T variant="subheading">Een auto</T>
          <View style={styles.chips}>
            {CAR_PRICES.map((p) => (
              <Chip key={p} label={`${formatEUR(p * 100, { decimals: 0 })} in ${year + 1}`} selected={scenario.car?.priceCents === p * 100} onPress={() => toggle('car', { priceCents: p * 100, year: year + 1 })} />
            ))}
          </View>
        </View>
        <T variant="caption" style={{ marginTop: 4 }}>
          Actief scenario: <T variant="caption" style={{ fontWeight: '700', color: colors.navy }}>{describeScenario(scenario)}</T>
        </T>
      </Card>

      <Card tone="accent">
        <T variant="subheading">De motor rekent, de AI praat</T>
        <T variant="caption" style={{ marginTop: 4 }}>
          Alle cijfers hierboven komen uit een deterministische berekening met vaste aannames. Vraag het aan jezelf in 2035 om ze uitgelegd te krijgen.
        </T>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <Button label="Bekijk aannames" variant="ghost" small onPress={() => router.push('/aannames')} />
          <Button label="Vraag het aan jezelf" small onPress={() => router.navigate('/(tabs)/praat')} />
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  metricRow: { marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  note: { borderRadius: 10, padding: 10, marginTop: 10 },
});
