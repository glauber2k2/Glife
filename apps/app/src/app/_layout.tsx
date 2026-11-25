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
import { useEffect, useMemo, type ReactNode } from 'react';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppLockGate, AppLockProvider, createDeviceAppLock, deviceBiometrics, useAppLock } from '@/features/app-lock';
import { AuthProvider, createSupabaseAuthService, useAuth } from '@/features/auth';
import { AgendaProvider, agendaTables } from '@/features/agenda';
import { DietProvider, dietTables } from '@/features/diet';
import { FinanceProvider, createEdgeQuoteClient, financeTables } from '@/features/finance';
import { LinksProvider, linksTables, useLinksSearchSources } from '@/features/links';
import { NotesProvider, notesSearchIndex, notesTables, useNotesSearchSources } from '@/features/notes';
import { SearchProvider, useSearchShortcut } from '@/features/search';
import { NoticesSync } from '@/features/today';
import { installIdGenerator } from '@/shared/lib/ids';
import { SyncStatusProvider, createLocalSync } from '@/shared/lib/powersync';
import { createNoticeScheduler } from '@/shared/lib/notices';
import { getSupabase } from '@/shared/lib/supabase';
import { toNavigationTheme } from '@/shared/navigation/navigationTheme';
import { resolveNavigationMotion } from '@/shared/navigation/navigationMotion';
import { SEARCH_ACTIONS } from '@/shared/navigation/searchActions';
import { ExpandProvider, ThemeProvider, ToastProvider, createThemePreferenceStore, useReduceMotion, useTheme } from '@/shared/ui';

installIdGenerator();
// Raiz de composição: aqui as interfaces recebem as implementações concretas.
const themePreferenceStore = createThemePreferenceStore(AsyncStorage);
const authService = createSupabaseAuthService(getSupabase());
// Cotações de ações, FIIs e cripto pela Edge Function `quotes` (chaves das APIs só no servidor).
const quoteClient = createEdgeQuoteClient(getSupabase());
// Bloqueio local: senha do app (scrypt no armazenamento seguro) e biometria forte do aparelho.
const appLock = createDeviceAppLock();
const signOut = () => authService.signOut();
// Banco local com as tabelas das features; sincroniza com o Supabase via PowerSync.
const localSync = createLocalSync({ ...notesTables, ...linksTables, ...financeTables, ...agendaTables, ...dietTables }, [notesSearchIndex]);
/** Avisos locais do aparelho (agenda e dieta); no web não faz nada. */
const noticeScheduler = createNoticeScheduler();
void SplashScreen.preventAutoHideAsync();

/** Busca universal: cada feature entrega as suas fontes; Ctrl+K só com acesso completo e app desbloqueado. */
function SearchComposition({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const notes = useNotesSearchSources();
  const links = useLinksSearchSources();
  const sources = useMemo(() => [...notes, ...links], [notes, links]);
  const { locked } = useAppLock();
  useSearchShortcut(enabled && !locked);
  return (
    <SearchProvider sources={sources} actions={SEARCH_ACTIONS}>
      {children}
    </SearchProvider>
  );
}

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
    <AppLockProvider lock={appLock} bio={deviceBiometrics} signedOut={stage === 'signed_out'} signOut={signOut}>
    <SyncStatusProvider subscribe={localSync.onConnectedChange}>
      <NotesProvider db={localSync.db} userId={userId}>
        <LinksProvider db={localSync.db} userId={userId}>
          <FinanceProvider db={localSync.db} userId={userId} quotes={quoteClient}>
          <AgendaProvider db={localSync.db} userId={userId}>
          <DietProvider db={localSync.db} userId={userId}>
          <NoticesSync scheduler={noticeScheduler} />
          <SearchComposition enabled={stage === 'ready'}>
          <ToastProvider>
            <NavigationThemeProvider value={navigationTheme}>
              <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
              {/* Com sessão pronta, nada do app aparece sem a senha do app ou a biometria. */}
              <AppLockGate active={stage === 'ready'}>
              <ExpandProvider>
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
                  <Stack.Screen name="busca" options={{ presentation: 'modal', animation: animation.modal }} />
                  <Stack.Screen name="nota/nova" options={{ animation: 'none' }} />
                  {/* Aberta pela linha que se expande (Hoje): sem animação própria, o contêiner faz a transição. */}
                  <Stack.Screen
                    name="nota/[id]"
                    options={({ route }) => ({
                      animation: (route.params as { entrada?: string } | undefined)?.entrada === 'expandir' ? 'none' : animation.detail,
                    })}
                  />
                  <Stack.Screen name="pastas" options={{ animation: animation.detail }} />
                  <Stack.Screen name="pasta/[id]" options={{ animation: animation.detail }} />
                  <Stack.Screen name="lixeira" options={{ animation: animation.detail }} />
                  <Stack.Screen name="financas/fatura/[id]" options={{ animation: animation.detail }} />
                  <Stack.Screen name="financas/conta/[id]" options={{ animation: animation.detail }} />
                  <Stack.Screen name="financas/nova-conta" options={{ animation: animation.detail }} />
                  <Stack.Screen name="financas/recorrentes" options={{ animation: animation.detail }} />
                  <Stack.Screen name="financas/recorrente/[id]" options={{ animation: animation.detail }} />
                  <Stack.Screen name="financas/orcamentos" options={{ animation: animation.detail }} />
                  <Stack.Screen name="financas/graficos" options={{ animation: animation.detail }} />
                  <Stack.Screen name="financas/grafico/[categoria]" options={{ animation: animation.detail }} />
                  <Stack.Screen name="agenda" options={{ animation: animation.detail }} />
                  <Stack.Screen name="agenda/evento/novo" options={{ animation: animation.detail }} />
                  <Stack.Screen name="agenda/evento/[id]" options={{ animation: animation.detail }} />
                  <Stack.Screen name="agenda/lembrete/novo" options={{ animation: animation.detail }} />
                  <Stack.Screen name="agenda/lembrete/[id]" options={{ animation: animation.detail }} />
                  <Stack.Screen name="dieta" options={{ animation: animation.detail }} />
                  <Stack.Screen name="dieta/refeicao/novo" options={{ animation: animation.detail }} />
                  <Stack.Screen name="dieta/refeicao/[id]" options={{ animation: animation.detail }} />
                  <Stack.Screen name="dieta/registro/novo" options={{ animation: animation.detail }} />
                  <Stack.Screen name="dieta/registro/[id]" options={{ animation: animation.detail }} />
                  <Stack.Screen name="seguranca" options={{ animation: animation.detail }} />
                  <Stack.Screen name="trocar-senha" options={{ animation: animation.detail }} />
                </Stack.Protected>
                <Stack.Protected guard={stage === 'signed_out'}>
                  <Stack.Screen name="entrar" />
                </Stack.Protected>
                <Stack.Protected guard={stage === 'enroll_mfa' || stage === 'verify_mfa'}>
                  <Stack.Screen name="verificacao" />
                </Stack.Protected>
              </Stack>
              </ExpandProvider>
              </AppLockGate>
            </NavigationThemeProvider>
          </ToastProvider>
          </SearchComposition>
          </DietProvider>
          </AgendaProvider>
          </FinanceProvider>
        </LinksProvider>
      </NotesProvider>
    </SyncStatusProvider>
    </AppLockProvider>
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
      {/* Teclado: telas e folhas sobem para o campo focado não ficar escondido (Android edge-to-edge incluso). */}
      <KeyboardProvider>
        <ThemeProvider store={themePreferenceStore}>
          <AuthProvider service={authService}>
            <RootStack />
          </AuthProvider>
        </ThemeProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}
