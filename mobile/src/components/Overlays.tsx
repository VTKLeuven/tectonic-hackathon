import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useApp, useT } from '../state/AppState';
import { C, R, S } from '../theme';
import { KbcLogo } from './Brand';
import { tipHref } from './InsightCard';
import { T } from './ui';

/**
 * What a push notification from Kate looks like. Only fires when a new
 * transaction creates a new, important enough tip, and only if the customer
 * left notifications on.
 */
export function KateBanner() {
  const { banner, dismissBanner, lang } = useApp();
  const t = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [y] = useState(() => new Animated.Value(-220));

  useEffect(() => {
    if (!banner) return;
    y.setValue(-220);
    Animated.spring(y, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 160 }).start();
    const timer = setTimeout(() => hide(), 9_000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [banner?.id]);

  function hide(then?: () => void) {
    Animated.timing(y, { toValue: -220, duration: 220, useNativeDriver: true }).start(() => {
      dismissBanner();
      then?.();
    });
  }

  if (!banner) return null;
  return (
    <Animated.View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + S.sm, transform: [{ translateY: y }] }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(banner.title)}
        onPress={() => hide(() => router.push(tipHref(banner.id)))}
        style={styles.banner}
      >
        <View style={styles.appIcon}>
          <KbcLogo size={20} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <T v="tiny" color={C.muted}>
              KBC Mobile · Kate
            </T>
            <T v="tiny" color={C.muted}>
              {lang === 'nl' ? 'nu' : 'now'}
            </T>
          </View>
          <T v="label" style={{ marginTop: 2 }} numberOfLines={1}>
            {t(banner.title)}
          </T>
          <T v="small" color={C.body} numberOfLines={2}>
            {t(banner.teaser)}
          </T>
        </View>
        <Pressable accessibilityLabel={lang === 'nl' ? 'Sluiten' : 'Close'} hitSlop={10} onPress={() => hide()}>
          <X size={16} color={C.faint} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

export function Toast() {
  const { toast } = useApp();
  const insets = useSafeAreaInsets();
  const [opacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!toast) return;
    opacity.setValue(0);
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }),
      Animated.delay(2_600),
      Animated.timing(opacity, { toValue: 0, duration: 240, useNativeDriver: true }),
    ]).start();
  }, [toast, opacity]);

  if (!toast) return null;
  return (
    <Animated.View pointerEvents="none" style={[styles.toastWrap, { bottom: insets.bottom + 96, opacity }]}>
      <View style={styles.toast}>
        <T v="small" color="#FFFFFF" style={{ textAlign: 'center' }}>
          {toast.text}
        </T>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: S.md, right: S.md, zIndex: 50 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    padding: S.md,
    borderRadius: R.xl,
    backgroundColor: 'rgba(255,255,255,0.98)',
    shadowColor: '#0B2239',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  appIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: C.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastWrap: { position: 'absolute', left: S.xl, right: S.xl, alignItems: 'center', zIndex: 40 },
  toast: {
    backgroundColor: C.ink,
    borderRadius: R.pill,
    paddingHorizontal: S.lg,
    paddingVertical: S.md,
    maxWidth: 360,
  },
});
