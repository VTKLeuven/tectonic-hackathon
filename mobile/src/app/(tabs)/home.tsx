import { useRouter } from 'expo-router';
import { ArrowLeftRight, ChevronRight, PiggyBank, Sparkles } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KbcLogo } from '../../components/Brand';
import { FeaturedTip } from '../../components/InsightCard';
import { TxRow } from '../../components/TxRow';
import { Card, T, tabular } from '../../components/ui';
import { formatMoney } from '../../engine';
import { useApp } from '../../state/AppState';
import { C, F, R, S, shadow } from '../../theme';

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, balance, analysis, lang, showToast, openVoice } = useApp();
  const persona = data.persona;
  const recent = [...analysis.transactions].reverse().slice(0, 5);
  const hour = new Date().getHours();
  const greeting = lang === 'nl' ? (hour < 12 ? 'Goeiemorgen' : hour < 18 ? 'Goeiemiddag' : 'Goeienavond') : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const soon = () => showToast(lang === 'nl' ? 'Niet beschikbaar in dit prototype.' : 'Not available in this prototype.');

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingBottom: S.xxl * 2 }} showsVerticalScrollIndicator={false}>
      <View style={[styles.head, { paddingTop: insets.top + S.md }]}>
        <View style={styles.headRow}>
          <KbcLogo size={30} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={persona.name}
            onPress={() => router.push('/meer')}
            onLongPress={() => router.push('/demo')}
            delayLongPress={500}
            style={styles.avatar}
          >
            <T v="label" color={C.navy}>
              {persona.initials}
            </T>
          </Pressable>
        </View>
        <T v="h1" color={C.onNavy} style={{ marginTop: S.xl }}>
          {greeting} {persona.firstName}
        </T>
      </View>

      <View style={{ paddingHorizontal: S.lg, marginTop: -56 }}>
        <Pressable onPress={() => router.push('/verrichtingen')} style={({ pressed }) => [styles.account, pressed && { opacity: 0.95 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View>
              <T v="label">{persona.accountName}</T>
              <T v="small" color={C.muted} style={tabular}>
                {persona.iban}
              </T>
            </View>
            <ChevronRight size={20} color={C.faint} />
          </View>
          <T v="display" style={[tabular, { marginTop: S.lg }]}>
            {formatMoney(balance, lang)}
          </T>
          <View style={styles.actions}>
            <Pressable onPress={soon} style={styles.action}>
              <ArrowLeftRight size={16} color={C.blue} />
              <T v="label" color={C.blue}>
                {lang === 'nl' ? 'Overschrijven' : 'Transfer'}
              </T>
            </Pressable>
          </View>
        </Pressable>

        <Card padded={false} style={{ marginTop: S.md }}>
          <Pressable onPress={soon} style={styles.savings}>
            <View style={styles.savingsIcon}>
              <PiggyBank size={18} color={C.navy} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <T v="body" style={{ fontFamily: F.medium }} numberOfLines={1}>
                {lang === 'nl' ? 'Spaarrekening' : 'Savings account'}
              </T>
              <T v="small" color={C.muted} style={tabular} numberOfLines={1}>
                {persona.savingsIban}
              </T>
            </View>
            <T v="body" style={[tabular, { fontFamily: F.semibold }]}>
              {formatMoney(persona.savingsBalance, lang)}
            </T>
          </Pressable>
        </Card>

        {analysis.featured && (
          <View style={{ marginTop: S.xl }}>
            <FeaturedTip insight={analysis.featured} />
            <Pressable
              onPress={() => openVoice(analysis.featured ?? undefined)}
              style={({ pressed }) => [styles.voiceBtn, pressed && { opacity: 0.85 }]}
            >
              <Sparkles size={16} color={C.blue} />
              <T v="label" color={C.blue}>
                {lang === 'nl' ? 'Beluister advies met Kate Voice' : 'Listen to Kate Voice advice'}
              </T>
            </Pressable>
          </View>
        )}

        <View style={styles.sectionHead}>
          <T v="h3">{lang === 'nl' ? 'Recente verrichtingen' : 'Recent transactions'}</T>
          <Pressable onPress={() => router.push('/verrichtingen')} hitSlop={8}>
            <T v="label" color={C.blue}>
              {lang === 'nl' ? 'Alles' : 'All'}
            </T>
          </Pressable>
        </View>
        <Card padded={false}>
          {recent.map((tx, i) => (
            <TxRow key={tx.id} tx={tx} last={i === recent.length - 1} />
          ))}
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  head: { backgroundColor: C.navy, paddingHorizontal: S.lg, paddingBottom: 56 + S.xl },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  account: { backgroundColor: C.card, borderRadius: R.lg, padding: S.lg, ...shadow },
  actions: { flexDirection: 'row', marginTop: S.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line, paddingTop: S.md },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  savings: { flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.lg },
  savingsIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: S.xl, marginBottom: S.sm, paddingHorizontal: S.xs },
  voiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: S.sm,
    paddingVertical: 10,
    paddingHorizontal: S.md,
    backgroundColor: C.card,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.kateBg,
    ...shadow,
  },
});
