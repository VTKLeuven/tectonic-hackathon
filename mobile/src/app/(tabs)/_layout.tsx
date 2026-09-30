import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '../../components/TabBar';
import { useApp } from '../../state/AppState';
import { C } from '../../theme';

export default function TabsLayout() {
  const { loggedIn } = useApp();
  if (!loggedIn) return <Redirect href="/login" />;
  return (
    <Tabs
      backBehavior="history"
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: C.bg } }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="betalen" />
      <Tabs.Screen name="kate" />
      <Tabs.Screen name="inzicht" />
      <Tabs.Screen name="meer" />
    </Tabs>
  );
}
