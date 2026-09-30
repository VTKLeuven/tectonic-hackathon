import { useRouter } from 'expo-router';
import { Info, Sparkles } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KateMark } from '../../components/Brand';
import { DOMAIN_ICON } from '../../components/Icon';
import { InsightRow } from '../../components/InsightCard';
import { Card, T } from '../../components/ui';
import { euro, type Domain, type RankedInsight } from '../../engine';
import { useApp } from '../../state/AppState';
import { C, R, S, shadow } from '../../theme';

const FILTERS: { id: Domain | 'all'; nl: string; en: string }[] = [
  { id: 'all', nl: 'Alles', en: 'All' },
  { id: 'energy', nl: 'Energie', en: 'Energy' },
  { id: 'subscriptions', nl: 'Abonnementen', en: 'Subscriptions' },
  { id: 'savings', nl: 'Sparen', en: 'Savings' },
];

export default function Kate() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { analysis, lang, openVoice } = useApp();
  const [filter, setFilter] = useState<Domain | 'all'>('all');

  const visible = analysis.insights.filter((i) => filter === 'all' || i.domain === filter);
  const active = visible.filter((i) => i.status === 'new' || i.status === 'seen');
  const later = visible.filter((i) => i.status === 'snoozed');
  const done = visible.filter((i) => i.status === 'done');
  const total = active.reduce((s, i) => s + (i.type === 'renovation' ? 0 : (i.annualValue ?? 0)), 0);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={[styles.head, { paddingTop: insets.top + S.lg }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
          <KateMark size={44} />
          <View style={{ flex: 1 }}>
            <T v="h1" color={C.onNavy}>
              Kate
            </T>
            <T v="small" color={C.onNavyMuted}>
              {lang === 'nl' ? 'Tips uit je eigen verrichtingen. Zonder vragen.' : 'Tips from your own transactions. No questions asked.'}
            </T>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Spreek met Kate"
            onPress={() => openVoice()}
            style={({ pressed }) => [styles.voiceHeaderBtn, pressed && { opacity: 0.8 }]}
          >
            <Sparkles size={18} color="#FFFFFF" />
          </Pressable>
        </View>
        {total > 0 && (
          <View style={styles.total}>
            <T v="small" color={C.onNavyMuted}>
              {lang === 'nl' ? 'Samen goed voor zo\'n' : 'Together worth about'}
            </T>
            <T v="h2" color={C.onNavy}>
              {lang === 'nl' ? `${euro(total, lang)} per jaar` : `${euro(total, lang)} a year`}
            </T>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: S.lg, paddingBottom: S.xxl * 2 }} showsVerticalScrollIndicator={false}>
        <Pressable
          onPress={() => openVoice()}
          style={({ pressed }) => [styles.voiceBanner, pressed && { opacity: 0.9 }]}
        >
          <View style={styles.voiceBannerIcon}>
            <Sparkles size={20} color={C.blue} />
          </View>
          <View style={{ flex: 1 }}>
            <T v="label" color={C.navy}>
              {lang === 'nl' ? 'Spreek met Kate Voice' : 'Talk with Kate Voice'}
            </T>
            <T v="small" color={C.muted}>
              {lang === 'nl'
                ? 'Beluister je toelichting of stel een vraag over je opties.'
                : 'Listen to your briefing or ask questions about your options.'}
            </T>
          </View>
        </Pressable>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.sm }}>
          {FILTERS.map((f) => {
            const on = filter === f.id;
            const Icon = f.id === 'all' ? null : DOMAIN_ICON[f.id];
            return (
              <Pressable
                key={f.id}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => setFilter(f.id)}
                style={[styles.chip, on && styles.chipOn]}
              >
                {Icon && <Icon size={14} color={on ? '#FFFFFF' : C.navy} />}
                <T v="label" color={on ? '#FFFFFF' : C.navy}>
                  {f[lang]}
                </T>
              </Pressable>
            );
          })}
        </ScrollView>

        <Group title={lang === 'nl' ? 'Voor jou' : 'For you'} items={active} empty={lang === 'nl' ? 'Niets dat nu je aandacht verdient. Kate meldt zich pas als iets de moeite waard is.' : 'Nothing that deserves your attention right now. Kate only speaks up when something is worth it.'} />
        {later.length > 0 && <Group title={lang === 'nl' ? 'Later' : 'Later'} items={later} />}
        {done.length > 0 && <Group title={lang === 'nl' ? 'Opgevolgd' : 'Followed up'} items={done} />}

        <Pressable onPress={() => router.push('/hoe-werkt-kate')} style={styles.how}>
          <Info size={18} color={C.blue} />
          <View style={{ flex: 1 }}>
            <T v="label" color={C.navy}>
              {lang === 'nl' ? 'Hoe kiest Kate wat ze toont?' : 'How does Kate choose what to show?'}
            </T>
            <T v="small" color={C.muted}>
              {lang === 'nl'
                ? `${analysis.suppressed.length} mogelijke tips hield ze bewust voor zich.`
                : `She deliberately held back ${analysis.suppressed.length} possible tips.`}
            </T>
          </View>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Group({ title, items, empty }: { title: string; items: RankedInsight[]; empty?: string }) {
  if (!items.length && !empty) return null;
  return (
    <View style={{ marginTop: S.xl }}>
      <T v="h3" style={{ marginBottom: S.sm, paddingHorizontal: S.xs }}>
        {title}
      </T>
      <Card padded={false}>
        {items.length ? (
          items.map((i, idx) => <InsightRow key={i.id} insight={i} last={idx === items.length - 1} />)
        ) : (
          <T v="body" color={C.muted} style={{ padding: S.lg }}>
            {empty}
          </T>
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { backgroundColor: C.navy, paddingHorizontal: S.lg, paddingBottom: S.xl },
  total: {
    marginTop: S.lg,
    padding: S.md,
    borderRadius: R.md,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: S.md,
    paddingVertical: 8,
    borderRadius: R.pill,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
  },
  chipOn: { backgroundColor: C.navy, borderColor: C.navy },
  how: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    marginTop: S.xl,
    padding: S.lg,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.lineStrong,
    borderStyle: 'dashed',
  },
  voiceHeaderBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    backgroundColor: C.card,
    borderRadius: R.lg,
    padding: S.md,
    marginBottom: S.lg,
    borderWidth: 1,
    borderColor: C.line,
    ...shadow,
  },
  voiceBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: R.md,
    backgroundColor: C.kateBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

