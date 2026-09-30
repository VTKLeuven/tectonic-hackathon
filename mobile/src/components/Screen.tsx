import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C, S } from '../theme';
import { T } from './ui';

/** The navy bar on top of every pushed screen, with a back button. */
export function Header({ title, back = true, right }: { title: string; back?: boolean; right?: ReactNode }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View style={[styles.header, { paddingTop: insets.top + S.sm }]}>
      <View style={styles.side}>
        {back && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Terug"
            hitSlop={12}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            style={styles.back}
          >
            <ChevronLeft size={26} color={C.onNavy} />
          </Pressable>
        )}
      </View>
      <T v="h3" color={C.onNavy} numberOfLines={1} style={{ flex: 1, textAlign: 'center' }}>
        {title}
      </T>
      <View style={[styles.side, { alignItems: 'flex-end' }]}>{right}</View>
    </View>
  );
}

/** A scrolling page on the grey KBC background. */
export function Page({
  children,
  header,
  contentStyle,
  bottomInset = true,
}: {
  children: ReactNode;
  header?: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  bottomInset?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {header}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[{ padding: S.lg, paddingBottom: (bottomInset ? insets.bottom : 0) + S.xxl * 2 }, contentStyle]}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: C.navy,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: S.sm,
    paddingBottom: S.md,
  },
  side: { width: 56, justifyContent: 'center' },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
