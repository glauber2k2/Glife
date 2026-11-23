import {
  CrimsonPro_400Regular,
  CrimsonPro_400Regular_Italic,
  CrimsonPro_500Medium,
} from '@expo-google-fonts/crimson-pro';
import {
  HankenGrotesk_300Light,
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
} from '@expo-google-fonts/hanken-grotesk';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider as NavigationThemeProvider, Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, createSupabaseAuthService, useAuth } from '@/features/auth';
import { LinksProvider, linksTables } from '@/features/links';
import { NotesProvider, notesTables } from '@/features/notes';
import { installIdGenerator } from '@/shared/lib/ids';
import { SyncStatusProvider, createLocalSync } from '@/shared/lib/powersync';
import { getSupabase } from '@/shared/lib/supabase';
import { toNavigationTheme } from '@/shared/navigation/navigationTheme';
import { resolveNavigationMotion } from '@/shared/navigation/navigationMotion';
import { ThemeProvider, ToastProvider, createThemePreferenceStore, useReduceMotion, useTheme } from '@/shared/ui';

installIdGenerator();
// Raiz de composição: aqui as interfaces recebem as implementações concretas.
const themePreferenceStore = createThemePreferenceStore(AsyncStorage);
const authService = createSupabaseAuthService(getSupabase());
// Banco local com as tabelas das features; sincroniza com o Supabase via PowerSync.
const localSync = createLocalSync({ ...notesTables, ...linksTables });
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
  // Sincroniza só com MFA concluído; ao sair, apaga o banco local.
  useEffect(() => {
    if (stage) void localSync.apply(stage);
  }, [stage]);
  if (!stage) return null;

  // Dados locais só com sessão aal2; ao sair, os provedores ficam sem repositório.
  const userId = stage === 'ready' ? (state?.userId ?? null) : null;
  return (
    <SyncStatusProvider subscribe={localSync.onConnectedChange}>
      <NotesProvider db={localSync.db} userId={userId}>
        <LinksProvider db={localSync.db} userId={userId}>
          <ToastProvider>
            <NavigationThemeProvider value={navigationTheme}>
              <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: t.colors.bg },
                  animation: animation.stack,
                  animationDuration: t.motion.standard,
                }}
              >
                {/* O app só abre com sessão aal2; o banco também recusa qualquer outra (RLS). */}
                <Stack.Protected guard={stage === 'ready'}>
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen
                    name="caixa-de-entrada"
                    options={{ presentation: 'modal', animation: animation.modal }}
                  />
                  <Stack.Screen name="ajustes" options={{ animation: animation.detail }} />
                  <Stack.Screen name="nota/[id]" options={{ animation: animation.detail }} />
                  <Stack.Screen name="pastas" options={{ animation: animation.detail }} />
                  <Stack.Screen name="pasta/[id]" options={{ animation: animation.detail }} />
                  <Stack.Screen name="lixeira" options={{ animation: animation.detail }} />
                </Stack.Protected>
                <Stack.Protected guard={stage === 'signed_out'}>
                  <Stack.Screen name="entrar" />
                </Stack.Protected>
                <Stack.Protected guard={stage === 'enroll_mfa' || stage === 'verify_mfa'}>
                  <Stack.Screen name="verificacao" />
                </Stack.Protected>
              </Stack>
            </NavigationThemeProvider>
          </ToastProvider>
        </LinksProvider>
      </NotesProvider>
    </SyncStatusProvider>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    HankenGrotesk_300Light,
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
    CrimsonPro_400Regular,
    CrimsonPro_400Regular_Italic,
    CrimsonPro_500Medium,
    JetBrainsMono_400Regular,
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
