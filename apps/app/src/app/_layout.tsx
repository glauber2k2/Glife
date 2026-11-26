import { DMMono_400Regular } from '@expo-google-fonts/dm-mono';
import { Literata_400Regular, Literata_400Regular_Italic, Literata_500Medium } from '@expo-google-fonts/literata';
import { Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold } from '@expo-google-fonts/outfit';
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
import { AgendaProvider, DayMarksProvider, agendaTableLabels, agendaTables, useAgendaTargetSources } from '@/features/agenda';
import { DietProvider, dietTableLabels, dietTables, useDietDayMarks, useDietTargetSource } from '@/features/diet';
import {
  FinanceProvider,
  createEdgeQuoteClient,
  financeTableLabels,
  financeTables,
  useFinanceTaggedSource,
  useFinanceTargetSource,
} from '@/features/finance';
import { LinksProvider, TaggedItemsProvider, TargetsProvider, linksTableLabels, linksTables, useLinksSearchSources } from '@/features/links';
import {
  NotesProvider,
  notesSearchIndex,
  notesTableLabels,
  notesTables,
  useNotesSearchSources,
  useNotesTaggedSource,
  useNotesTargetSource,
} from '@/features/notes';
import { SearchProvider, useSearchShortcut } from '@/features/search';
import { FirstSyncGate, NoticesSync, NotificationsProvider } from '@/features/today';
import { installIdGenerator } from '@/shared/lib/ids';
import { MoneyVisibilityProvider } from '@/shared/lib/MoneyVisibility';
import { createMoneyVisibilityStore } from '@/shared/lib/moneyVisibilityStore';
import { createSeenStore } from '@/shared/lib/seenStore';
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
// "Ocultar valores" (olhinho de Finanças): preferência do aparelho, lembrada ao fechar e abrir o app.
const moneyVisibilityStore = createMoneyVisibilityStore(AsyncStorage);
const authService = createSupabaseAuthService(getSupabase());
// Cotações de ações, FIIs e cripto pela Edge Function `quotes` (chaves das APIs só no servidor).
const quoteClient = createEdgeQuoteClient(getSupabase());
// Bloqueio local: senha do app (scrypt no armazenamento seguro) e biometria forte do aparelho.
const appLock = createDeviceAppLock();
const signOut = () => authService.signOut();
// Banco local com as tabelas das features; sincroniza com o Supabase via PowerSync.
const localSync = createLocalSync({ ...notesTables, ...linksTables, ...financeTables, ...agendaTables, ...dietTables }, [notesSearchIndex]);
/** Nome de cada tabela (fila de envio e contagens de Ajustes › Sincronização), entregue por cada módulo. */
const syncLabels = { ...notesTableLabels, ...linksTableLabels, ...financeTableLabels, ...agendaTableLabels, ...dietTableLabels };
/** Avisos locais do aparelho (agenda e dieta); no web não faz nada. */
const noticeScheduler = createNoticeScheduler();
/** "Visto até" da central de notificações (preferência do aparelho). */
const seenStore = createSeenStore(AsyncStorage);
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

/** Calendário da agenda: as refeições do plano (dieta) viram pontos no mês, sem a agenda conhecer a dieta. */
function DayMarksComposition({ children }: { children: ReactNode }) {
  const diet = useDietDayMarks();
  const sources = useMemo(() => [diet], [diet]);
  return <DayMarksProvider sources={sources}>{children}</DayMarksProvider>;
}

/** Tela de uma tag: cada feature diz como mostrar os seus itens com tag (registro aberto da feature links). */
function TaggedComposition({ children }: { children: ReactNode }) {
  const notes = useNotesTaggedSource();
  const finance = useFinanceTaggedSource();
  const sources = useMemo(() => [notes, finance].filter((s) => s !== null), [notes, finance]);
  return <TaggedItemsProvider sources={sources}>{children}</TaggedItemsProvider>;
}

/** Alvos de vínculos e avisos: cada módulo diz a tabela, a tela e como restaurar ("item não encontrado"). */
function TargetsComposition({ children }: { children: ReactNode }) {
  const notes = useNotesTargetSource();
  const finance = useFinanceTargetSource();
  const agenda = useAgendaTargetSources();
  const diet = useDietTargetSource();
  const sources = useMemo(() => [notes, finance, diet, ...agenda].filter((s) => s !== null), [notes, finance, agenda, diet]);
  return <TargetsProvider sources={sources}>{children}</TargetsProvider>;
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
    <SyncStatusProvider sync={localSync} labels={syncLabels}>
      <NotesProvider db={localSync.db} userId={userId}>
        <LinksProvider db={localSync.db} userId={userId}>
          <FinanceProvider db={localSync.db} userId={userId} quotes={quoteClient}>
          <AgendaProvider db={localSync.db} userId={userId}>
          <DietProvider db={localSync.db} userId={userId}>
          <NotificationsProvider store={seenStore} scheduler={noticeScheduler}>
          <DayMarksComposition>
          <SearchComposition enabled={stage === 'ready'}>
          <TaggedComposition>
          <TargetsComposition>
          <ToastProvider>
            {/* Dentro do aviso (toast): um "Feito" do aviso que falhar diz o motivo. */}
            <NoticesSync scheduler={noticeScheduler} signedOut={stage === 'signed_out'} />
            <NavigationThemeProvider value={navigationTheme}>
              <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
              {/* Com sessão pronta, nada do app aparece sem a senha do app ou a biometria. */}
              <AppLockGate active={stage === 'ready'}>
              {/* Primeiro acesso do aparelho: traz os dados uma vez (depois do bloqueio); nas outras aberturas, nada. */}
              <FirstSyncGate active={stage === 'ready'}>
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
                  <Stack.Screen name="ajustes/sincronizacao" options={{ animation: animation.detail }} />
                  <Stack.Screen name="nao-encontrado" options={{ animation: animation.detail }} />
                  <Stack.Screen name="busca" options={{ presentation: 'modal', animation: animation.modal }} />
                  <Stack.Screen name="notificacoes" options={{ animation: animation.detail }} />
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
                  <Stack.Screen name="tags" options={{ animation: animation.detail }} />
                  <Stack.Screen name="tags/[id]" options={{ animation: animation.detail }} />
                  <Stack.Screen name="financas/fatura/[id]" options={{ animation: animation.detail }} />
                  <Stack.Screen name="financas/conta/[id]" options={{ animation: animation.detail }} />
                  <Stack.Screen name="financas/nova-conta" options={{ animation: animation.detail }} />
                  <Stack.Screen name="financas/recorrentes" options={{ animation: animation.detail }} />
                  <Stack.Screen name="financas/recorrente/[id]" options={{ animation: animation.detail }} />
                  <Stack.Screen name="financas/orcamentos" options={{ animation: animation.detail }} />
                  <Stack.Screen name="financas/categorias" options={{ animation: animation.detail }} />
                  <Stack.Screen name="financas/categoria/[id]" options={{ animation: animation.detail }} />
                  <Stack.Screen name="financas/contas" options={{ animation: animation.detail }} />
                  <Stack.Screen name="financas/graficos" options={{ animation: animation.detail }} />
                  <Stack.Screen name="financas/grafico/[categoria]" options={{ animation: animation.detail }} />
                  <Stack.Screen name="biblia" options={{ animation: animation.detail }} />
                  <Stack.Screen name="agenda/mes" options={{ animation: animation.detail }} />
                  <Stack.Screen name="agenda/evento/novo" options={{ animation: animation.detail }} />
                  <Stack.Screen name="agenda/evento/[id]" options={{ animation: animation.detail }} />
                  <Stack.Screen name="agenda/lembrete/novo" options={{ animation: animation.detail }} />
                  <Stack.Screen name="agenda/lembrete/[id]" options={{ animation: animation.detail }} />
                  <Stack.Screen name="dieta" options={{ animation: animation.detail }} />
                  <Stack.Screen name="dieta/historico" options={{ animation: animation.detail }} />
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
              </FirstSyncGate>
              </AppLockGate>
            </NavigationThemeProvider>
          </ToastProvider>
          </TargetsComposition>
          </TaggedComposition>
          </SearchComposition>
          </DayMarksComposition>
          </NotificationsProvider>
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
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Literata_400Regular,
    Literata_400Regular_Italic,
    Literata_500Medium,
    DMMono_400Regular,
  });

  if (!loaded && !error) return null;

  return (
    <SafeAreaProvider>
      {/* Teclado: telas e folhas sobem para o campo focado não ficar escondido (Android edge-to-edge incluso). */}
      <KeyboardProvider>
        <ThemeProvider store={themePreferenceStore}>
          <MoneyVisibilityProvider store={moneyVisibilityStore}>
            <AuthProvider service={authService}>
              <RootStack />
            </AuthProvider>
          </MoneyVisibilityProvider>
        </ThemeProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}
