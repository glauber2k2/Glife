import { DMMono_400Regular } from '@expo-google-fonts/dm-mono';
import { Outfit_200ExtraLight, Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold } from '@expo-google-fonts/outfit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider as NavigationThemeProvider, Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, type ReactNode } from 'react';
import type { LocalDb } from '@glife/domain/core';
import { Alert } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AiToolsProvider, aiLocalTables } from '@/features/ai';
import { AppLockGate, AppLockProvider, createDeviceAppLock, deviceBiometrics, useAppLock } from '@/features/app-lock';
import { AuthProvider, createSupabaseAuthService, useAuth } from '@/features/auth';
import { AgendaProvider, useAgendaAiTools, agendaTableLabels, agendaTables, useAgendaTargetSources } from '@/features/agenda';
import { BibleProvider, bibleHref, bibleLocalTables, bibleTableLabels, bibleTables } from '@/features/bible';
import { DietProvider, dietTableLabels, dietTables, useDietTargetSources } from '@/features/diet';
import {
  FinanceProvider,
  createEdgeQuoteClient,
  financeTableLabels,
  financeTables,
  useFinanceTaggedSource,
  useFinanceTargetSources,
} from '@/features/finance';
import { LinksProvider, NoteLinkerProvider, TaggedItemsProvider, TargetsProvider, linksTableLabels, linksTables, useLinksSearchSources } from '@/features/links';
import {
  NotesProvider,
  useNotesAiTools,
  notesSearchIndex,
  notesTableLabels,
  notesTables,
  useNotesSearchSources,
  useNotesTaggedSource,
  useNotesLinkerPort,
  useNotesTargetSource,
} from '@/features/notes';
import { SearchProvider, useSearchShortcut } from '@/features/search';
import { FirstSyncGate, NoticesSync, NotificationsProvider } from '@/features/today';
import { installIdGenerator } from '@/shared/lib/ids';
import { MoneyVisibilityProvider } from '@/shared/lib/MoneyVisibility';
import { createMoneyVisibilityStore } from '@/shared/lib/moneyVisibilityStore';
import { installCrashReport, takeCrashReport, type GlobalErrorUtils } from '@/shared/lib/crashReport';
import { createSeenStore } from '@/shared/lib/seenStore';
import { SyncStatusProvider, createLocalSync } from '@/shared/lib/powersync';
import { createNoticeScheduler } from '@/shared/lib/notices';
import { getSupabase } from '@/shared/lib/supabase';
import { toNavigationTheme } from '@/shared/navigation/navigationTheme';
import { isBackParams, replaceAnimationFor, resolveNavigationMotion } from '@/shared/navigation/navigationMotion';
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
const localSync = createLocalSync({ ...notesTables, ...linksTables, ...financeTables, ...agendaTables, ...dietTables, ...bibleTables, ...bibleLocalTables, ...aiLocalTables }, [notesSearchIndex]);
/** Nome de cada tabela (fila de envio e contagens de Ajustes › Sincronização), entregue por cada módulo. */
const syncLabels = { ...notesTableLabels, ...linksTableLabels, ...financeTableLabels, ...agendaTableLabels, ...dietTableLabels, ...bibleTableLabels };
/** Avisos locais do aparelho (agenda e dieta); no web não faz nada. */
const noticeScheduler = createNoticeScheduler();
/** "Visto até" da central de notificações (preferência do aparelho). */
const seenStore = createSeenStore(AsyncStorage);
void SplashScreen.preventAutoHideAsync();
// Erro que fechar o app fica guardado no aparelho e aparece uma vez na próxima abertura (nada é enviado).
installCrashReport(AsyncStorage, (globalThis as { ErrorUtils?: GlobalErrorUtils }).ErrorUtils);

/** Busca universal: cada feature entrega as suas fontes; Ctrl+K só com acesso completo e app desbloqueado. */
/** Glife IA: cada feature entrega seu kit de ferramentas; o registro de ações fica no banco local. */
function AiComposition({ db, children }: { db: LocalDb | null; children: ReactNode }) {
  const notes = useNotesAiTools();
  const agenda = useAgendaAiTools();
  const kits = useMemo(() => [notes, agenda], [notes, agenda]);
  return (
    <AiToolsProvider db={db} kits={kits}>
      {children}
    </AiToolsProvider>
  );
}

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

/** Tela de uma tag: cada feature diz como mostrar os seus itens com tag (registro aberto da feature links). */
function TaggedComposition({ children }: { children: ReactNode }) {
  const notes = useNotesTaggedSource();
  const finance = useFinanceTaggedSource();
  const sources = useMemo(() => [notes, finance].filter((s) => s !== null), [notes, finance]);
  return <TaggedItemsProvider sources={sources}>{children}</TaggedItemsProvider>;
}

/** Endereços sem UUID que um módulo abre: a Bíblia pela referência OSIS. */
const ADDRESSES = [{ type: 'bible' as const, href: bibleHref }];

/** Alvos de vínculos e avisos: cada módulo diz a tabela, a tela e como restaurar ("item não encontrado"). */
function TargetsComposition({ children }: { children: ReactNode }) {
  const notes = useNotesTargetSource();
  const noteLinker = useNotesLinkerPort();
  const finance = useFinanceTargetSources();
  const agenda = useAgendaTargetSources();
  const diet = useDietTargetSources();
  const sources = useMemo(() => [notes, ...finance, ...diet, ...agenda].filter((s) => s !== null), [notes, finance, agenda, diet]);
  return (
    <TargetsProvider sources={sources} addresses={ADDRESSES}>
      <NoteLinkerProvider port={noteLinker}>{children}</NoteLinkerProvider>
    </TargetsProvider>
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
  // O app fechou por um erro na última vez: mostra o motivo uma vez (para fotografar e mandar).
  useEffect(() => {
    void takeCrashReport(AsyncStorage).then((r) => r && Alert.alert('O Glife fechou por um erro', `${r.at}\n\n${r.message}`));
  }, []);
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
          <BibleProvider db={localSync.db} userId={userId} storage={AsyncStorage}>
          <NotificationsProvider store={seenStore} scheduler={noticeScheduler}>
          <SearchComposition enabled={stage === 'ready'}>
          <TaggedComposition>
          <TargetsComposition>
          <AiComposition db={userId ? localSync.db : null}>
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
              {/* Toda tela empurra da direita (o voltar faz o inverso); troca marcada como "voltar" anima como voltar. */}
              <Stack
                screenOptions={({ route }) => ({
                  headerShown: false,
                  contentStyle: { backgroundColor: t.colors.bg },
                  animation: animation.detail,
                  animationDuration: t.motion.push,
                  animationTypeForReplace: replaceAnimationFor(isBackParams(route.params)),
                })}
              >
                {/* O app só abre com sessão aal2; o banco também recusa qualquer outra (RLS). */}
                <Stack.Protected guard={stage === 'ready'}>
                  <Stack.Screen name="(tabs)" options={{ animation: animation.stack }} />
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
                  <Stack.Screen name="financas" options={{ animation: animation.detail }} />
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
                  <Stack.Screen name="biblia/[livro]/[cap]" options={{ animation: animation.detail }} />
                  <Stack.Screen name="biblia/traducoes" options={{ animation: animation.detail }} />
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
                  <Stack.Screen name="entrar" options={{ animation: animation.stack }} />
                </Stack.Protected>
                <Stack.Protected guard={stage === 'enroll_mfa' || stage === 'verify_mfa'}>
                  <Stack.Screen name="verificacao" options={{ animation: animation.stack }} />
                </Stack.Protected>
              </Stack>
              </ExpandProvider>
              </FirstSyncGate>
              </AppLockGate>
            </NavigationThemeProvider>
          </ToastProvider>
          </AiComposition>
          </TargetsComposition>
          </TaggedComposition>
          </SearchComposition>
          </NotificationsProvider>
          </BibleProvider>
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
    Outfit_200ExtraLight,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
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
