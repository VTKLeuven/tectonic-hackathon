import { useRouter } from 'expo-router';
import { Leaf, Repeat } from 'lucide-react-native';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EnergyChart } from '../../components/EnergyChart';
import { CATEGORY_ICON } from '../../components/Icon';
import { Card, ListRow, T, tabular } from '../../components/ui';
import { euro, formatNumber, t as tr, type CategoryId } from '../../engine';
import { useApp } from '../../state/AppState';
import { C, S } from '../../theme';

export default function Inzicht() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { analysis, lang } = useApp();
  const { energy, recurring, signals } = analysis;
  const fixed = recurring.filter((s) => s.active && !['savings', 'pension_saving'].includes(s.category));
  const fixedYear = fixed.reduce((s, x) => s + x.annualCost, 0);
  const heatingLabel =
    energy.heatingSource === 'oil'
      ? lang === 'nl' ? 'Mazout' : 'Heating oil'
      : energy.heatingSource === 'gas'
        ? lang === 'nl' ? 'Aardgas' : 'Natural gas'
        : lang === 'nl' ? 'Nog niet gezien' : 'Not seen yet';

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={[styles.head, { paddingTop: insets.top + S.lg }]}>
        <T v="h1" color={C.onNavy}>
          {lang === 'nl' ? 'Inzicht' : 'Insights'}
        </T>
        <T v="small" color={C.onNavyMuted}>
          {lang === 'nl' ? 'Automatisch uit je verrichtingen. Je hoeft niets in te stellen.' : 'Built from your transactions. Nothing to set up.'}
        </T>
      </View>
      <ScrollView contentContainerStyle={{ padding: S.lg, paddingBottom: S.xxl * 2 }} showsVerticalScrollIndicator={false}>
        <T v="h3" style={styles.title}>
          {lang === 'nl' ? 'Je energie, de voorbije 12 maanden' : 'Your energy, last 12 months'}
        </T>
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <View>
              <T v="small" color={C.muted}>
                {lang === 'nl' ? 'Totaal' : 'Total'}
              </T>
              <T v="h1" style={tabular}>
                {euro(energy.annual.total, lang)}
              </T>
            </View>
            <View style={styles.co2}>
              <Leaf size={14} color={C.positive} />
              <T v="label" color={C.positive}>
                {formatNumber(energy.co2Kg / 1000, lang, 1)} t CO₂
              </T>
            </View>
          </View>
          <View style={{ marginTop: S.lg }}>
            <EnergyChart months={energy.months} lang={lang} annual={energy.annual} />
          </View>
          <View style={styles.facts}>
            <Fact label={lang === 'nl' ? 'Verwarming' : 'Heating'} value={heatingLabel} />
            {energy.estimatedKwh ? <Fact label={lang === 'nl' ? 'Stroomverbruik' : 'Power use'} value={`± ${formatNumber(energy.estimatedKwh, lang, 0)} kWh`} /> : null}
          </View>
        </Card>

        <T v="h3" style={styles.title}>
          {lang === 'nl' ? 'Vaste kosten' : 'Fixed costs'}
        </T>
        <Card padded={false}>
          <ListRow
            icon={Repeat}
            iconBg={C.kateBg}
            iconColor={C.blue}
            title={lang === 'nl' ? `${fixed.length} terugkerende betalingen` : `${fixed.length} recurring payments`}
            subtitle={lang === 'nl' ? `${euro(fixedYear, lang)} per jaar, zelf herkend` : `${euro(fixedYear, lang)} a year, recognised automatically`}
            onPress={() => router.push('/abonnementen')}
            last
          />
        </Card>

        <T v="h3" style={styles.title}>
          {lang === 'nl' ? 'Wat Kate over je situatie afleidt' : 'What Kate infers about your situation'}
        </T>
        <Card padded={false}>
          {signals.map((s, i) => {
            const Icon = CATEGORY_ICON[SIGNAL_CATEGORY[s.id] ?? 'other'];
            return (
              <ListRow
                key={s.id}
                icon={Icon}
                title={tr(s.label, lang)}
                subtitle={`${lang === 'nl' ? 'Zekerheid' : 'Confidence'} ${Math.round(s.confidence * 100)}% · ${s.evidence.length} ${lang === 'nl' ? (s.evidence.length === 1 ? 'verrichting' : 'verrichtingen') : s.evidence.length === 1 ? 'transaction' : 'transactions'}`}
                onPress={s.evidence[0] ? () => router.push(`/verrichting/${encodeURIComponent(s.evidence[0])}`) : undefined}
                last={i === signals.length - 1}
              />
            );
          })}
        </Card>
        <T v="small" color={C.muted} style={{ marginTop: S.sm, paddingHorizontal: S.xs }}>
          {lang === 'nl'
            ? 'Kate stelt je hierover geen vragen. Klopt iets niet, tik dan op "Niet voor mij" bij een tip.'
            : 'Kate never asks you about this. If something is off, tap "Not for me" on a tip.'}
        </T>
      </ScrollView>
    </View>
  );
}

const SIGNAL_CATEGORY: Record<string, CategoryId> = {
  moved: 'moving',
  home_purchase: 'notary',
  homeowner: 'mortgage',
  renter: 'rent',
  heating_oil: 'heating_oil',
  has_solar: 'solar',
  ev_driver: 'ev_charging',
  petrol_driver: 'fuel',
  car_repair: 'car',
  energy_advance_up: 'electricity',
  energy_settlement: 'electricity',
  streaming_stack: 'streaming',
  pension_saving: 'pension_saving',
  salary: 'income',
};

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <T v="tiny" color={C.muted}>
        {label}
      </T>
      <T v="label">{value}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { backgroundColor: C.navy, paddingHorizontal: S.lg, paddingBottom: S.xl },
  title: { marginTop: S.xl, marginBottom: S.sm, paddingHorizontal: S.xs },
  co2: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.positiveBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  facts: { flexDirection: 'row', gap: S.md, marginTop: S.lg, paddingTop: S.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
});
