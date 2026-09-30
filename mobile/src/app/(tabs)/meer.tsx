import { useRouter } from 'expo-router';
import { Bell, FlaskConical, Globe, Info, LogOut, PiggyBank, Tv, Zap, type LucideIcon } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, ListRow, T } from '../../components/ui';
import type { Domain } from '../../engine';
import { useApp } from '../../state/AppState';
import { C, R, S } from '../../theme';

const DOMAINS: { id: Domain; icon: LucideIcon; nl: string; en: string; hintNl: string; hintEn: string }[] = [
  { id: 'energy', icon: Zap, nl: 'Energie en mobiliteit', en: 'Energy and mobility', hintNl: 'Zonnepanelen, verwarming, laden, contracten', hintEn: 'Solar, heating, charging, contracts' },
  { id: 'subscriptions', icon: Tv, nl: 'Abonnementen', en: 'Subscriptions', hintNl: 'Prijsstijgingen, proefperiodes, overlap', hintEn: 'Price rises, trials, overlap' },
  { id: 'savings', icon: PiggyBank, nl: 'Sparen', en: 'Savings', hintNl: 'Belastingvoordeel, geld dat stilstaat', hintEn: 'Tax benefits, idle money' },
];

export default function Meer() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data, lang, setLang, prefs, toggleDomain, notify, setNotify, logout } = useApp();
  const persona = data.persona;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={[styles.head, { paddingTop: insets.top + S.lg }]}>
        <View style={styles.avatar}>
          <T v="h2" color={C.navy}>
            {persona.initials}
          </T>
        </View>
        <View>
          <T v="h2" color={C.onNavy}>
            {persona.name}
          </T>
          <T v="small" color={C.onNavyMuted}>
            {persona.city}
          </T>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ padding: S.lg, paddingBottom: S.xxl * 2 }} showsVerticalScrollIndicator={false}>
        <T v="h3" style={styles.title}>
          {lang === 'nl' ? 'Tips van Kate' : 'Tips from Kate'}
        </T>
        <Card padded={false}>
          {DOMAINS.map((d) => (
            <ListRow
              key={d.id}
              icon={d.icon}
              title={d[lang]}
              subtitle={lang === 'nl' ? d.hintNl : d.hintEn}
              right={<Switch value={prefs.domains[d.id]} onValueChange={() => toggleDomain(d.id)} trackColor={{ true: C.blue, false: C.lineStrong }} />}
            />
          ))}
          <ListRow
            icon={Bell}
            title={lang === 'nl' ? 'Melding bij een nieuwe tip' : 'Notify me of a new tip'}
            subtitle={lang === 'nl' ? 'Enkel als het echt de moeite is' : 'Only when it is really worth it'}
            right={<Switch value={notify} onValueChange={setNotify} trackColor={{ true: C.blue, false: C.lineStrong }} />}
          />
          <ListRow icon={Info} title={lang === 'nl' ? 'Hoe werkt Kate?' : 'How does Kate work?'} onPress={() => router.push('/hoe-werkt-kate')} last />
        </Card>

        <T v="h3" style={styles.title}>
          {lang === 'nl' ? 'Instellingen' : 'Settings'}
        </T>
        <Card padded={false}>
          <ListRow
            icon={Globe}
            title={lang === 'nl' ? 'Taal' : 'Language'}
            right={
              <View style={styles.segment}>
                {(['nl', 'en'] as const).map((l) => (
                  <Pressable key={l} onPress={() => setLang(l)} style={[styles.segmentItem, lang === l && styles.segmentOn]}>
                    <T v="label" color={lang === l ? '#FFFFFF' : C.navy}>
                      {l.toUpperCase()}
                    </T>
                  </Pressable>
                ))}
              </View>
            }
          />
          <ListRow
            icon={FlaskConical}
            title={lang === 'nl' ? 'Demo' : 'Demo'}
            subtitle={lang === 'nl' ? 'Wissel van klant of laat iets gebeuren' : 'Switch customer or make something happen'}
            onPress={() => router.push('/demo')}
          />
          <ListRow
            icon={LogOut}
            title={lang === 'nl' ? 'Afmelden' : 'Log out'}
            onPress={() => {
              logout();
              router.replace('/login');
            }}
            last
          />
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { backgroundColor: C.navy, paddingHorizontal: S.lg, paddingBottom: S.xl, flexDirection: 'row', alignItems: 'center', gap: S.md },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: S.xl, marginBottom: S.sm, paddingHorizontal: S.xs },
  segment: { flexDirection: 'row', backgroundColor: C.bg, borderRadius: R.pill, padding: 3 },
  segmentItem: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: R.pill },
  segmentOn: { backgroundColor: C.navy },
});
