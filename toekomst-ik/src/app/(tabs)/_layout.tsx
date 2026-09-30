import React from 'react';
import { Tabs } from 'expo-router/js-tabs';
import { Ionicons } from '@expo/vector-icons';
import type { ColorValue } from 'react-native';
import { colors } from '../../theme/theme';
import { useAlerts } from '../../store/derived';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function icon(name: IconName) {
  const TabIcon = ({ color, size }: { color: ColorValue; size: number }) => <Ionicons name={name} color={color as string} size={size} />;
  TabIcon.displayName = `TabIcon(${name})`;
  return TabIcon;
}

export default function TabLayout() {
  const { active } = useAlerts();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.navy,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        sceneStyle: { backgroundColor: colors.background },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Vandaag', tabBarIcon: icon('home-outline') }} />
      <Tabs.Screen
        name="waakhond"
        options={{ title: 'Waakhond', tabBarIcon: icon('shield-checkmark-outline'), tabBarBadge: active.length ? active.length : undefined, tabBarBadgeStyle: { backgroundColor: colors.red, fontSize: 10 } }}
      />
      <Tabs.Screen name="toekomst" options={{ title: 'Toekomst', tabBarIcon: icon('trending-up-outline') }} />
      <Tabs.Screen name="praat" options={{ title: 'Praat', tabBarIcon: icon('chatbubbles-outline') }} />
      <Tabs.Screen name="meer" options={{ title: 'Meer', tabBarIcon: icon('ellipsis-horizontal-circle-outline') }} />
    </Tabs>
  );
}
