import { useRouter } from 'expo-router';
import { ChevronRight, Leaf } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { euro, type Lang, type RankedInsight } from '../engine';
import { useApp, useT } from '../state/AppState';
import { C, R, S, shadow } from '../theme';
import { KateMark } from './Brand';
import { INSIGHT_ICON } from './Icon';
import { Pill, T } from './ui';

export function valueLabel(insight: RankedInsight, lang: Lang): string | null {
  if (insight.annualValue === undefined) return null;
  const amount = euro(insight.annualValue, lang);
  if (insight.type === 'pension_saving') return lang === 'nl' ? `${amount} terug` : `${amount} back`;
  if (insight.type === 'trial_converted' || insight.type === 'price_increase') return lang === 'nl' ? `${amount}/jaar` : `${amount}/yr`;
  return lang === 'nl' ? `${amount}/jaar besparen` : `save ${amount}/yr`;
}

export function tipHref(id: string) {
  return `/tip/${encodeURIComponent(id)}` as const;
}

/** The one tip Kate puts on the home screen. Quiet: one card, no badge storm. */
export function FeaturedTip({ insight }: { insight: RankedInsight }) {
  const router = useRouter();
  const { lang } = useApp();
  const t = useT();
  const value = valueLabel(insight, lang);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(tipHref(insight.id))}
      style={({ pressed }) => [styles.featured, pressed && { opacity: 0.92 }]}
    >
      <View style={styles.featuredHead}>
        <KateMark size={28} />
        <T v="label" color={C.navy} style={{ flex: 1 }}>
          {lang === 'nl' ? 'Kate zag iets voor je' : 'Kate noticed something'}
        </T>
        {insight.status === 'new' && <View style={styles.dot} />}
      </View>
      <T v="h2" style={{ marginTop: S.md }}>
        {t(insight.title)}
      </T>
      <T v="body" color={C.body} style={{ marginTop: S.xs }} numberOfLines={3}>
        {t(insight.teaser)}
      </T>
      <View style={styles.featuredFoot}>
        {value && <Pill text={value} color={C.positive} bg={C.positiveBg} />}
        {insight.co2SavedKg && insight.co2SavedKg > 500 ? (
          <Pill text={`-${(insight.co2SavedKg / 1000).toFixed(1).replace('.', lang === 'nl' ? ',' : '.')} t CO₂`} color={C.positive} bg={C.positiveBg} icon={Leaf} />
        ) : null}
        <View style={{ flex: 1 }} />
        <T v="label" color={C.blue}>
          {lang === 'nl' ? 'Bekijk' : 'View'}
        </T>
        <ChevronRight size={16} color={C.blue} />
      </View>
    </Pressable>
  );
}

/** A tip in Kate's list. */
export function InsightRow({ insight, last }: { insight: RankedInsight; last?: boolean }) {
  const router = useRouter();
  const { lang } = useApp();
  const t = useT();
  const Icon = INSIGHT_ICON[insight.type];
  const value = valueLabel(insight, lang);
  const muted = insight.status === 'snoozed' || insight.status === 'done' || insight.status === 'dismissed';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(tipHref(insight.id))}
      style={({ pressed }) => [styles.row, !last && styles.rowLine, pressed && { backgroundColor: C.bg }]}
    >
      <View style={[styles.rowIcon, { backgroundColor: muted ? C.bg : C.kateBg }]}>
        <Icon size={20} color={muted ? C.muted : C.blue} strokeWidth={2} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <T v="h3" numberOfLines={2} style={{ flexShrink: 1 }} color={muted ? C.muted : C.ink}>
            {t(insight.title)}
          </T>
          {insight.status === 'new' && <View style={styles.dot} />}
        </View>
        <T v="small" color={C.muted} numberOfLines={2}>
          {t(insight.teaser)}
        </T>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
          {value && <Pill text={value} color={muted ? C.muted : C.positive} bg={muted ? C.bg : C.positiveBg} />}
          {insight.status === 'snoozed' && <Pill text={lang === 'nl' ? 'Later' : 'Later'} />}
          {insight.status === 'done' && <Pill text={lang === 'nl' ? 'Opgevolgd' : 'Followed up'} />}
        </View>
      </View>
      <ChevronRight size={18} color={C.faint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  featured: {
    backgroundColor: C.card,
    borderRadius: R.lg,
    padding: S.lg,
    borderWidth: 1,
    borderColor: C.kateLine,
    ...shadow,
  },
  featuredHead: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  featuredFoot: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: S.lg },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.cyan },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: S.md,
    padding: S.lg,
  },
  rowLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

