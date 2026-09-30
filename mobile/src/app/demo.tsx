import { useRouter } from 'expo-router';
import { Check, Play, RotateCcw, X } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, T } from '../components/ui';
import { PERSONA_IDS, PERSONAS } from '../engine';
import { useApp, useT } from '../state/AppState';
import { C, R, S } from '../theme';

/**
 * The presenter's control panel. Hidden behind a long press on the KBC logo
 * (login) or the avatar (home), and listed under Meer.
 */
export default function Demo() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { personaId, switchPersona, liveEvents, triggerLive, resetPersona, lang, loggedIn, login } = useApp();
  const t = useT();

  function trigger(id: string) {
    triggerLive(id);
    if (!loggedIn) login();
    router.dismissTo('/home');
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={[styles.head, { paddingTop: S.lg }]}>
        <T v="h2">{lang === 'nl' ? 'Demo' : 'Demo'}</T>
        <Pressable accessibilityLabel={lang === 'nl' ? 'Sluiten' : 'Close'} onPress={() => router.back()} hitSlop={10}>
          <X size={24} color={C.ink} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: S.lg, paddingBottom: insets.bottom + S.xxl }}>
        <T v="h3" style={styles.title}>
          {lang === 'nl' ? 'Klant' : 'Customer'}
        </T>
        <Card padded={false}>
          {PERSONA_IDS.map((id, i) => {
            const p = PERSONAS[id];
            const on = id === personaId;
            return (
              <Pressable
                key={id}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                onPress={() => switchPersona(id)}
                style={[styles.persona, i < PERSONA_IDS.length - 1 && styles.line]}
              >
                <View style={[styles.avatar, on && { backgroundColor: C.navy }]}>
                  <T v="label" color={on ? '#FFFFFF' : C.navy}>
                    {p.initials}
                  </T>
                </View>
                <View style={{ flex: 1 }}>
                  <T v="h3">
                    {p.name}, {p.age}
                  </T>
                  <T v="small" color={C.muted}>
                    {t(p.tagline)}
                  </T>
                </View>
                {on && <Check size={20} color={C.blue} />}
              </Pressable>
            );
          })}
        </Card>

        <T v="h3" style={styles.title}>
          {lang === 'nl' ? 'Laat iets gebeuren' : 'Make something happen'}
        </T>
        {liveEvents.map(({ event, booked }) => (
          <Card key={event.id} style={{ marginBottom: S.md }}>
            <T v="h3">{t(event.label)}</T>
            <T v="small" color={C.muted} style={{ marginTop: 4 }}>
              {t(event.hint)}
            </T>
            <Button
              style={{ marginTop: S.md }}
              icon={booked ? Check : Play}
              kind={booked ? 'secondary' : 'primary'}
              disabled={booked}
              label={booked ? (lang === 'nl' ? 'Gebeurd vandaag' : 'Happened today') : lang === 'nl' ? 'Boek deze verrichting' : 'Book this transaction'}
              onPress={() => trigger(event.id)}
            />
          </Card>
        ))}

        <Button
          kind="ghost"
          icon={RotateCcw}
          label={lang === 'nl' ? 'Zet deze klant terug naar het begin' : 'Reset this customer'}
          onPress={() => resetPersona()}
        />
        <T v="small" color={C.muted} style={{ marginTop: S.md, textAlign: 'center' }}>
          {lang === 'nl'
            ? 'De geschiedenis van elke klant wordt berekend tegenover vandaag, dus de demo is altijd actueel.'
            : 'Each customer\'s history is computed relative to today, so the demo is always current.'}
        </T>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: S.lg,
    paddingBottom: S.md,
    backgroundColor: C.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.line,
  },
  title: { marginTop: S.lg, marginBottom: S.sm, paddingHorizontal: S.xs },
  persona: { flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.lg },
  line: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  pill: { borderRadius: R.pill },
});
