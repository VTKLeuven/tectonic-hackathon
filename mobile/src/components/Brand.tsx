import { Sparkles } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { C, F } from '../theme';

/**
 * A stylised KBC wordmark: the round "head" above the letters. Drawn with
 * views so it renders the same on iOS, Android and web.
 */
export function KbcLogo({ size = 28, color = '#FFFFFF', accent = C.cyan }: { size?: number; color?: string; accent?: string }) {
  return (
    <View style={{ alignItems: 'center' }} accessibilityLabel="KBC">
      <View style={{ width: size * 0.38, height: size * 0.38, borderRadius: size, backgroundColor: accent, marginBottom: size * 0.04 }} />
      <Text style={{ fontFamily: F.bold, fontSize: size * 0.62, lineHeight: size * 0.66, letterSpacing: size * 0.02, color }}>KBC</Text>
    </View>
  );
}

/** Kate's avatar: the assistant that already lives in KBC Mobile. */
export function KateMark({ size = 36, ring = false }: { size?: number; ring?: boolean }) {
  return (
    <View
      style={[
        styles.kate,
        { width: size, height: size, borderRadius: size / 2 },
        ring && { borderWidth: 2, borderColor: '#FFFFFF' },
      ]}
    >
      <Sparkles size={size * 0.5} color="#FFFFFF" strokeWidth={2.2} />
    </View>
  );
}

const styles = StyleSheet.create({
  kate: {
    backgroundColor: C.cyan,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
