import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { CATEGORY_ICON } from '../components/Icon';
import { Header, Page } from '../components/Screen';
import { Card, ListRow, Pill, T, tabular } from '../components/ui';
import { CATEGORIES, euro, formatMoney, type RecurringStream } from '../engine';
import { useApp, useT } from '../state/AppState';
import { C, S } from '../theme';

const GROUPS: { id: string; nl: string; en: string; match: (s: RecurringStream) => boolean }[] = [
  { id: 'subs', nl: 'Abonnementen', en: 'Subscriptions', match: (s) => CATEGORIES[s.category].group === 'subscriptions' },
  { id: 'energy', nl: 'Energie', en: 'Energy', match: (s) => CATEGORIES[s.category].group === 'energy' },
  { id: 'home', nl: 'Wonen', en: 'Housing', match: (s) => CATEGORIES[s.category].group === 'housing' },
  { id: 'other', nl: 'Overige', en: 'Other', match: () => true },
];

const CADENCE = {
  weekly: { nl: 'per week', en: 'a week' },
  monthly: { nl: 'per maand', en: 'a month' },
  quarterly: { nl: 'per kwartaal', en: 'a quarter' },
  yearly: { nl: 'per jaar', en: 'a year' },
};

/** Every fixed cost Kate found, without the customer listing a single one. */
export default function Abonnementen() {
  const router = useRouter();
  const { analysis, lang } = useApp();
  const t = useT();
  const streams = analysis.recurring.filter((s) => s.active && !['savings', 'pension_saving'].includes(s.category));
  const used = new Set<string>();
  const total = streams.reduce((s, x) => s + x.annualCost, 0);

  return (
    <Page header={<Header title={lang === 'nl' ? 'Vaste kosten' : 'Fixed costs'} />}>
      <Card>
        <T v="small" color={C.muted}>
          {lang === 'nl' ? 'Samen per jaar' : 'Together per year'}
        </T>
        <T v="h1" style={tabular}>
          {euro(total, lang)}
        </T>
        <T v="small" color={C.muted} style={{ marginTop: S.xs }}>
          {lang === 'nl'
            ? 'Kate herkende deze betalingen aan hun ritme. Je hoefde niets op te lijsten.'
            : 'Kate recognised these payments by their rhythm. You did not have to list anything.'}
        </T>
      </Card>
      {GROUPS.map((g) => {
        const items = streams.filter((s) => !used.has(s.id) && g.match(s));
        items.forEach((s) => used.add(s.id));
        if (!items.length) return null;
        return (
          <View key={g.id}>
            <T v="h3" style={{ marginTop: S.xl, marginBottom: S.sm, paddingHorizontal: S.xs }}>
              {g[lang]}
            </T>
            <Card padded={false}>
              {items.map((s, i) => {
                const up = s.priceChange && s.priceChange.to > s.priceChange.from;
                return (
                  <ListRow
                    key={s.id}
                    icon={CATEGORY_ICON[s.category]}
                    title={s.name}
                    subtitle={`${t(CATEGORIES[s.category].label)} · ${formatMoney(s.lastAmount, lang)} ${CADENCE[s.cadence][lang]}`}
                    onPress={() => router.push(`/verrichting/${encodeURIComponent(s.transactionIds[s.transactionIds.length - 1])}`)}
                    right={
                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <T v="label" style={tabular}>
                          {euro(s.annualCost, lang)}
                        </T>
                        {up ? (
                          <Pill text={`+${Math.round(((s.priceChange!.to - s.priceChange!.from) / s.priceChange!.from) * 100)}%`} color={C.warning} bg={C.warningBg} />
                        ) : s.trialConverted ? (
                          <Pill text={lang === 'nl' ? 'na proef' : 'after trial'} color={C.warning} bg={C.warningBg} />
                        ) : null}
                      </View>
                    }
                    chevron={false}
                    last={i === items.length - 1}
                  />
                );
              })}
            </Card>
          </View>
        );
      })}
    </Page>
  );
}
