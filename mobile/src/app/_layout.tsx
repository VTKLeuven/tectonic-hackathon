import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { KateBanner, Toast } from '../components/Overlays';
import { AppProvider, useApp } from '../state/AppState';
import { C } from '../theme';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: C.navy }} />;

  return (
    <SafeAreaProvider>
      <AppProvider>
        <Shell />
      </AppProvider>
    </SafeAreaProvider>
  );
}

function Shell() {
  const { ready } = useApp();
  if (!ready) return <View style={{ flex: 1, backgroundColor: C.navy }} />;
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg }, animation: 'slide_from_right' }}>
        <Stack.Screen name="login" options={{ animation: 'fade' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="demo" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      </Stack>
      <KateBanner />
      <Toast />
    </View>
  );
}
