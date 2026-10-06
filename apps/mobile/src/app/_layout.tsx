import { CormorantGaramond_600SemiBold, CormorantGaramond_700Bold } from '@expo-google-fonts/cormorant-garamond';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, useFonts } from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { colors } from '../ui/theme';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, CormorantGaramond_600SemiBold, CormorantGaramond_700Bold });
  useEffect(() => {
    if (loaded) void SplashScreen.hideAsync();
  }, [loaded]);
  if (!loaded) return null;
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.night950 }, animation: 'fade', animationDuration: 200 }} />
    </>
  );
}
