import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Delete, ScanFace } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KbcLogo } from '../components/Brand';
import { T } from '../components/ui';
import { useApp } from '../state/AppState';
import { C, F, S } from '../theme';

const PIN_LENGTH = 5;
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'face', '0', 'del'];

/** KBC Mobile's PIN screen. Any five digits work: this is a demo. */
export default function Login() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login, data, lang } = useApp();
  const [pin, setPin] = useState('');

  useEffect(() => {
    if (pin.length === PIN_LENGTH) {
      const id = setTimeout(() => enter(), 180);
      return () => clearTimeout(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  function enter() {
    login();
    router.replace('/home');
  }

  function press(key: string) {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    if (key === 'face') return enter();
    if (key === 'del') return setPin((p) => p.slice(0, -1));
    setPin((p) => (p.length < PIN_LENGTH ? p + key : p));
  }

  const hour = new Date().getHours();
  const greeting = lang === 'nl' ? (hour < 12 ? 'Goeiemorgen' : hour < 18 ? 'Goeiemiddag' : 'Goeienavond') : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <View style={[styles.page, { paddingTop: insets.top + S.xxl, paddingBottom: insets.bottom + S.lg }]}>
      <Pressable onLongPress={() => router.push('/demo')} delayLongPress={600} accessibilityLabel="KBC" style={{ alignSelf: 'center' }}>
        <KbcLogo size={52} />
      </Pressable>

      <View style={{ alignItems: 'center', marginTop: S.xxl * 1.5 }}>
        <T v="h1" color={C.onNavy}>
          {greeting} {data.persona.firstName}
        </T>
        <T v="body" color={C.onNavyMuted} style={{ marginTop: S.sm }}>
          {lang === 'nl' ? 'Geef je pincode in' : 'Enter your PIN'}
        </T>
        <View style={styles.dots}>
          {Array.from({ length: PIN_LENGTH }, (_, i) => (
            <View key={i} style={[styles.dot, i < pin.length && styles.dotFilled]} />
          ))}
        </View>
      </View>

      <View style={{ flex: 1 }} />

      <View style={styles.pad}>
        {KEYS.map((key) => (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityLabel={key === 'face' ? 'Face ID' : key === 'del' ? (lang === 'nl' ? 'Wissen' : 'Delete') : key}
            onPress={() => press(key)}
            style={({ pressed }) => [styles.key, pressed && { backgroundColor: 'rgba(255,255,255,0.12)' }]}
          >
            {key === 'face' ? (
              <ScanFace size={28} color={C.onNavy} />
            ) : key === 'del' ? (
              <Delete size={26} color={C.onNavy} />
            ) : (
              <T v="h1" color={C.onNavy} style={{ fontFamily: F.medium }}>
                {key}
              </T>
            )}
          </Pressable>
        ))}
      </View>

      <T v="tiny" color={C.onNavyMuted} style={{ textAlign: 'center', marginTop: S.lg }}>
        {lang === 'nl'
          ? 'Prototype voor de Tectonic Hackathon. Fictieve klant en gegevens.'
          : 'Prototype for the Tectonic Hackathon. Fictional customer and data.'}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.navy, paddingHorizontal: S.xl },
  dots: { flexDirection: 'row', gap: S.lg, marginTop: S.xl },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: C.onNavyMuted },
  dotFilled: { backgroundColor: C.cyan, borderColor: C.cyan },
  pad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: S.md, maxWidth: 320, alignSelf: 'center', width: '100%' },
  key: { width: '30%', height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
});
