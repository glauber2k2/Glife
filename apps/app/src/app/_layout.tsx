import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SourceSerif4_400Regular, SourceSerif4_600SemiBold } from '@expo-google-fonts/source-serif-4';
import { ThemeProvider as NavigationThemeProvider, Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, createSupabaseAuthService, useAuth } from '@/features/auth';
import { installIdGenerator } from '@/shared/lib/ids';
import { getSupabase } from '@/shared/lib/supabase';
import { toNavigationTheme } from '@/shared/navigation/navigationTheme';
import { resolveNavigationMotion } from '@/shared/navigation/navigationMotion';
import { ThemeProvider, createThemePreferenceStore, useReduceMotion, useTheme } from '@/shared/ui';

installIdGenerator();
// Raiz de composição: aqui as interfaces recebem as implementações concretas.
const themePreferenceStore = createThemePreferenceStore(AsyncStorage);
const authService = createSupabaseAuthService(getSupabase());
void SplashScreen.preventAutoHideAsync();

function RootStack() {
  const t = useTheme();
  const reduceMotion = useReduceMotion();
  const animation = resolveNavigationMotion(reduceMotion);
  const navigationTheme = useMemo(() => toNavigationTheme(t), [t]);
  const { state } = useAuth();
  const stage = state?.stage;
  // Enquanto a sessão guardada é lida, a splash continua na tela.
  useEffect(() => {
    if (stage) void SplashScreen.hideAsync();
  }, [stage]);
  if (!stage) return null;

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: t.colors.bg },
          animation: animation.stack,
          animationDuration: t.motion.base,
        }}
      >
        {/* O app só abre com sessão aal2; o banco também recusa qualquer outra (RLS). */}
        <Stack.Protected guard={stage === 'ready'}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="caixa-de-entrada" options={{ presentation: 'modal', animation: animation.modal }} />
          <Stack.Screen name="ajustes" options={{ animation: animation.detail }} />
        </Stack.Protected>
        <Stack.Protected guard={stage === 'signed_out'}>
          <Stack.Screen name="entrar" />
        </Stack.Protected>
        <Stack.Protected guard={stage === 'enroll_mfa' || stage === 'verify_mfa'}>
          <Stack.Screen name="verificacao" />
        </Stack.Protected>
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

  if (!loaded && !error) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider store={themePreferenceStore}>
        <AuthProvider service={authService}>
          <RootStack />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
