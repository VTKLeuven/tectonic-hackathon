import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, LogBox, Pressable, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router/stack';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { planNotification, SEVERITY_RANK, type Alert } from '../../engine';
import { checkHealth } from '../lib/api';
import { scheduleAlertNotification, setupNotifications } from '../lib/notifications';
import { haptic } from '../lib/haptics';
import { useAlerts, useToday } from '../store/derived';
import { useStore } from '../store/useStore';
import { colors, radius, severityColor, shadow } from '../theme/theme';
import { T } from '../components/ui';

// Expo Go prints a warning about limited notification support; the in-app banner is our primary path.
LogBox.ignoreLogs([/expo-notifications/]);

/** Watches the Waakhond: in-app banner for new alerts (always works), local notification when appropriate. */
function WaakhondWatcher() {
  const { active, more } = useAlerts();
  const today = useToday();
  const memory = useStore((s) => s.overlays[s.personaId].alertMemory);
  const personaId = useStore((s) => s.personaId);
  const markSeen = useStore((s) => s.markSeen);
  const noteNotification = useStore((s) => s.noteNotification);
  const [banner, setBanner] = React.useState<Alert | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const visible = [...active, ...more];
    const fresh = visible.filter((a) => !memory.firstSeen[a.id] && SEVERITY_RANK[a.severity] >= SEVERITY_RANK.let_op);
    if (fresh.length === 0) return;
    const top = fresh[0];
    // eslint-disable-next-line react-hooks/set-state-in-effect -- surfacing a new alert is an external event
    setBanner(top);
    haptic.warning();
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setBanner(null), 7000);
    const plan = planNotification(active, memory, new Date(), today);
    if (plan) {
      scheduleAlertNotification(plan).then((outcome) => {
        if (outcome !== 'skipped') noteNotification(`${outcome === 'sent' ? 'Melding verstuurd' : 'Melding ingepland voor 08:00'}: ${plan.alert.title}`);
        else noteNotification(`Geen pushmelding mogelijk in deze omgeving; in-app banner getoond: ${plan.alert.title}`);
      });
    }
    markSeen(visible.map((a) => a.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, more, personaId]);

  if (!banner) return null;
  return (
    <Pressable
      onPress={() => {
        const id = banner.id;
        setBanner(null);
        router.push({ pathname: '/alert/[id]', params: { id } });
      }}
      style={[styles.banner, { top: insets.top + 8, borderLeftColor: severityColor[banner.severity] }]}>
      <T variant="label" style={{ color: severityColor[banner.severity] }}>Waakhond</T>
      <T variant="subheading" numberOfLines={1}>{banner.title}</T>
      <T variant="caption" numberOfLines={2}>{banner.message}</T>
    </Pressable>
  );
}

function ServerProbe() {
  const setServerStatus = useStore((s) => s.setServerStatus);
  useEffect(() => {
    let alive = true;
    // Ask for notification permission once at startup, not in the middle of the demo.
    setupNotifications();
    const probe = () => checkHealth().then((s) => alive && setServerStatus(s));
    probe();
    const id = setInterval(probe, 20_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [setServerStatus]);
  return null;
}

export default function RootLayout() {
  const hydrated = useStore((s) => s.hydrated);
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {hydrated ? (
        <>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.background },
              headerTintColor: colors.navy,
              headerTitleStyle: { fontWeight: '700', color: colors.navy },
              headerShadowVisible: false,
              headerBackTitle: 'Terug',
              contentStyle: { backgroundColor: colors.background },
            }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="alert/[id]" options={{ title: 'Waarom zie ik dit?' }} />
            <Stack.Screen name="aannames" options={{ title: 'Aannames' }} />
            <Stack.Screen name="gegevens" options={{ title: 'Welke gegevens?' }} />
            <Stack.Screen name="schaal" options={{ title: 'Hoe schaalt dit?' }} />
            <Stack.Screen name="demo" options={{ title: 'Demo-paneel' }} />
          </Stack>
          <WaakhondWatcher />
          <ServerProbe />
        </>
      ) : (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.navy} />
          <T variant="caption" style={{ marginTop: 12 }}>Je twin wordt geladen…</T>
        </View>
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  banner: { position: 'absolute', left: 12, right: 12, backgroundColor: colors.card, borderRadius: radius.md, padding: 12, borderLeftWidth: 4, ...shadow, elevation: 6 },
});
