import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { ArrowLeftRight, ChartColumn, House, LayoutGrid, type LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { useApp } from '../state/AppState';
import { C, F, S } from '../theme';
import { KateMark } from './Brand';
import { T } from './ui';

const TABS: Record<string, { icon?: LucideIcon; nl: string; en: string }> = {
  home: { icon: House, nl: 'Home', en: 'Home' },
  betalen: { icon: ArrowLeftRight, nl: 'Betalen', en: 'Pay' },
  kate: { nl: 'Kate', en: 'Kate' },
  inzicht: { icon: ChartColumn, nl: 'Inzicht', en: 'Insights' },
  meer: { icon: LayoutGrid, nl: 'Meer', en: 'More' },
};

/**
 * KBC Mobile's bottom bar, with Kate in the middle. A dot on Kate means
 * "there is something new"; never a number, because a counter is a nag.
 */
export function TabBar({ state, navigation, insets }: BottomTabBarProps) {
  const { lang, analysis } = useApp();
  const hasNew = analysis.insights.some((i) => i.status === 'new');

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, S.sm) }]}>
      {state.routes.map((route, index) => {
        const tab = TABS[route.name];
        if (!tab) return null;
        const focused = state.index === index;
        const color = focused ? C.navy : C.faint;
        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };
        const Icon = tab.icon;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={tab[lang]}
            onPress={onPress}
            style={styles.tab}
          >
            {Icon ? (
              <Icon size={22} color={color} strokeWidth={focused ? 2.4 : 2} />
            ) : (
              <View style={styles.kate}>
                <KateMark size={44} ring />
                {hasNew && <View style={styles.dot} />}
              </View>
            )}
            <T v="tiny" color={color} style={{ fontFamily: focused ? F.semibold : F.medium, marginTop: Icon ? 4 : 2 }}>
              {tab[lang]}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: C.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.lineStrong,
    paddingTop: S.sm,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', minHeight: 48 },
  kate: { marginTop: -22 },
  dot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFB81C',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
