import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { SourceSerif4_400Regular, SourceSerif4_600SemiBold } from '@expo-google-fonts/source-serif-4';
import { ThemeProvider as NavigationThemeProvider, Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { installIdGenerator } from '@/shared/lib/ids';
import { toNavigationTheme } from '@/shared/navigation/navigationTheme';
import { ThemeProvider, useTheme } from '@/shared/ui';

installIdGenerator();
void SplashScreen.preventAutoHideAsync();

function RootStack() {
  const t = useTheme();
  const navigationTheme = useMemo(() => toNavigationTheme(t), [t]);
  return (
    <NavigationThemeProvider value={navigationTheme}>
      <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: t.colors.bg },
          animation: 'fade',
          animationDuration: t.motion.base,
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="caixa-de-entrada" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="ajustes" options={{ animation: 'slide_from_right' }} />
      </Stack>
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    SourceSerif4_400Regular,
    SourceSerif4_600SemiBold,
  });

  useEffect(() => {
    if (loaded || error) void SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <RootStack />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
