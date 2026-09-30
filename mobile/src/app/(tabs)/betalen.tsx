import { ArrowLeftRight, CalendarClock, CreditCard, FileText, QrCode, Repeat, Send, type LucideIcon } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, ListRow, T } from '../../components/ui';
import { useApp } from '../../state/AppState';
import { C, R, S, shadow } from '../../theme';

/** A faithful-enough "Betalen" tab. It is here so the app feels like the real one; nothing in it is part of the concept. */
export default function Betalen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { lang, showToast } = useApp();
  const soon = () => showToast(lang === 'nl' ? 'Niet beschikbaar in dit prototype.' : 'Not available in this prototype.');

  const quick: { icon: LucideIcon; nl: string; en: string }[] = [
    { icon: Send, nl: 'Overschrijven', en: 'Transfer' },
    { icon: QrCode, nl: 'Payconiq', en: 'Payconiq' },
    { icon: ArrowLeftRight, nl: 'Eigen rekening', en: 'Own account' },
    { icon: CreditCard, nl: 'Kaarten', en: 'Cards' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={[styles.head, { paddingTop: insets.top + S.lg }]}>
        <T v="h1" color={C.onNavy}>
          {lang === 'nl' ? 'Betalen' : 'Pay'}
        </T>
      </View>
      <ScrollView contentContainerStyle={{ padding: S.lg, paddingBottom: S.xxl * 2 }}>
        <View style={styles.grid}>
          {quick.map((q) => (
            <Pressable key={q.nl} onPress={soon} style={styles.quick}>
              <View style={styles.quickIcon}>
                <q.icon size={22} color={C.navy} />
              </View>
              <T v="tiny" color={C.ink} style={{ textAlign: 'center' }}>
                {q[lang]}
              </T>
            </Pressable>
          ))}
        </View>
        <Card padded={false} style={{ marginTop: S.xl }}>
          <ListRow icon={Repeat} title={lang === 'nl' ? 'Vaste kosten en domiciliëringen' : 'Fixed costs and direct debits'} onPress={() => router.push('/abonnementen')} />
          <ListRow icon={CalendarClock} title={lang === 'nl' ? 'Doorlopende opdrachten' : 'Standing orders'} onPress={soon} />
          <ListRow icon={FileText} title={lang === 'nl' ? 'Te betalen facturen' : 'Bills to pay'} onPress={soon} last />
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { backgroundColor: C.navy, paddingHorizontal: S.lg, paddingBottom: S.xl },
  grid: { flexDirection: 'row', justifyContent: 'space-between' },
  quick: { width: '23%', alignItems: 'center', gap: S.sm },
  quickIcon: {
    width: 56,
    height: 56,
    borderRadius: R.lg,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
});
