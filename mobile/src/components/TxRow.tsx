import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { CATEGORIES, formatDate, formatMoney, type EnrichedTransaction } from '../engine';
import { useApp } from '../state/AppState';
import { C, S } from '../theme';
import { CATEGORY_ICON } from './Icon';
import { T, tabular } from './ui';

/** One line of the statement, the way KBC Mobile shows it. */
export function TxRow({ tx, last, showDate = true }: { tx: EnrichedTransaction; last?: boolean; showDate?: boolean }) {
  const router = useRouter();
  const { lang, freshTxId } = useApp();
  const Icon = CATEGORY_ICON[tx.category];
  const fresh = tx.id === freshTxId;
  const credit = tx.amount > 0;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/verrichting/${encodeURIComponent(tx.id)}`)}
      style={({ pressed }) => [styles.row, !last && styles.line, fresh && styles.fresh, pressed && { backgroundColor: C.bg }]}
    >
      <View style={styles.icon}>
        <Icon size={18} color={C.navy} strokeWidth={2} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <T v="body" numberOfLines={1} style={{ fontFamily: 'Inter_500Medium' }}>
          {prettyName(tx)}
        </T>
        <T v="small" color={C.muted} numberOfLines={1}>
          {showDate ? `${formatDate(tx.date, lang)} · ` : ''}
          {CATEGORIES[tx.category].label[lang]}
        </T>
      </View>
      <T v="body" color={credit ? C.positive : C.ink} style={[tabular, { fontFamily: 'Inter_600SemiBold' }]}>
        {formatMoney(tx.amount, lang, { signed: true })}
      </T>
    </Pressable>
  );
}

/** Statement counterparties are shouty; show them the way people say them. */
export function prettyName(tx: EnrichedTransaction): string {
  const known = tx.merchantName && tx.merchantName !== tx.counterparty;
  if (known && !['Restaurant', 'Garage', 'Verzekering', 'Huur', 'Spaarrekening', 'Belastingen'].includes(tx.merchantName)) {
    return tx.merchantName;
  }
  return tx.counterparty
    .toLowerCase()
    .replace(/(^|\s|[-/(])([a-zà-ÿ])/g, (_m, p: string, c: string) => p + c.toUpperCase())
    .replace(/\b(Nv|Bv|Vzw|Sa)\b/g, (s) => s.toUpperCase())
    .replace(/\bKbc\b/g, 'KBC');
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    paddingVertical: S.md,
    paddingHorizontal: S.lg,
  },
  line: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  fresh: { backgroundColor: C.kateBg },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
