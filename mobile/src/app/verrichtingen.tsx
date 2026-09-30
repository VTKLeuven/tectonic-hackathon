import { useMemo } from 'react';
import { SectionList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Header } from '../components/Screen';
import { TxRow } from '../components/TxRow';
import { T } from '../components/ui';
import { monthName, type EnrichedTransaction } from '../engine';
import { useApp } from '../state/AppState';
import { C, R, S } from '../theme';

export default function Verrichtingen() {
  const insets = useSafeAreaInsets();
  const { analysis, lang } = useApp();

  const sections = useMemo(() => {
    const byMonth = new Map<string, EnrichedTransaction[]>();
    for (const tx of [...analysis.transactions].reverse()) {
      const key = tx.date.slice(0, 7);
      byMonth.set(key, [...(byMonth.get(key) ?? []), tx]);
    }
    return [...byMonth.entries()].map(([key, data]) => ({
      title: `${monthName(Number(key.slice(5, 7)) - 1, lang)} ${key.slice(0, 4)}`,
      data,
    }));
  }, [analysis.transactions, lang]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title={lang === 'nl' ? 'Verrichtingen' : 'Transactions'} />
      <SectionList
        sections={sections}
        keyExtractor={(tx) => tx.id}
        stickySectionHeadersEnabled
        initialNumToRender={20}
        contentContainerStyle={{ paddingBottom: insets.bottom + S.xl }}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHead}>
            <T v="label" color={C.muted} style={{ textTransform: 'capitalize' }}>
              {section.title}
            </T>
          </View>
        )}
        renderItem={({ item, index, section }) => (
          <View style={[styles.item, index === 0 && styles.first, index === section.data.length - 1 && styles.last]}>
            <TxRow tx={item} last={index === section.data.length - 1} />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHead: { backgroundColor: C.bg, paddingHorizontal: S.lg + S.xs, paddingTop: S.lg, paddingBottom: S.sm },
  item: { backgroundColor: C.card, marginHorizontal: S.lg, overflow: 'hidden' },
  first: { borderTopLeftRadius: R.lg, borderTopRightRadius: R.lg },
  last: { borderBottomLeftRadius: R.lg, borderBottomRightRadius: R.lg },
});
