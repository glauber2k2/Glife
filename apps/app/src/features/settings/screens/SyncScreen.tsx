// Sincronização e offline (protótipo "sincronizacao"): o estado em linguagem simples — Em dia (hora da última troca e
// "Sincronizar agora"), Sem internet (a fila do que espera para subir) e Sessão expirada (Entrar) — e o que existe neste
// aparelho por módulo. A fila mostra só o tipo de cada alteração, nunca o conteúdo.
import { Apple, Calendar, CloudCheck, CloudOff, FileText, KeyRound, RefreshCw, StickyNote, Wallet, type LucideIcon } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import {
  changeLabel,
  lastSyncText,
  syncScreenState,
  useLocalCounts,
  usePendingChanges,
  useSyncLabels,
  useSyncNow,
  useSyncState,
  type CountGroup,
  type SyncScreenState,
} from '@/shared/lib/powersync';
import {
  BackHeader,
  Button,
  Card,
  ListGroup,
  ListItem,
  ModuleIcon,
  Reveal,
  Screen,
  Section,
  Text,
  makeStyles,
  statusHue,
  useTheme,
  useToast,
  type ModuleKey,
} from '@/shared/ui';

const COUNT_ROWS: { group: CountGroup; label: string; icon: LucideIcon; module: ModuleKey }[] = [
  { group: 'notes', label: 'Notas', icon: StickyNote, module: 'notes' },
  { group: 'transactions', label: 'Lançamentos', icon: Wallet, module: 'finance' },
  { group: 'agenda', label: 'Eventos e lembretes', icon: Calendar, module: 'agenda' },
  { group: 'diet', label: 'Refeições registradas', icon: Apple, module: 'diet' },
];
const GROUP_ICON: Record<CountGroup, { icon: LucideIcon; module: ModuleKey }> = Object.fromEntries(
  COUNT_ROWS.map((r) => [r.group, { icon: r.icon, module: r.module }]),
) as Record<CountGroup, { icon: LucideIcon; module: ModuleKey }>;

const HERO: Record<SyncScreenState, { icon: LucideIcon; hue?: number; title: string; message?: string }> = {
  emdia: { icon: CloudCheck, hue: statusHue.ok, title: 'Tudo em dia' },
  offline: {
    icon: CloudOff,
    title: 'Sem internet',
    message: 'Pode continuar usando: tudo fica salvo neste aparelho e sobe quando a conexão voltar.',
  },
  sessao: {
    icon: KeyRound,
    hue: statusHue.attention,
    title: 'Entre de novo para sincronizar',
    message: 'Sua sessão expirou. Os dados continuam aqui; para enviar e receber, entre com e-mail, senha e código.',
  },
};

/** 1240 → "1.240" */
const count = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/** Relógio que avança a cada segundo enquanto a tela está aberta ("há 12 s"). */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function SyncScreen() {
  const s = useStyles();
  const t = useTheme();
  const toast = useToast();
  const sync = useSyncState();
  const syncNow = useSyncNow();
  const pending = usePendingChanges();
  const labels = useSyncLabels();
  const counts = useLocalCounts();
  const now = useNow();
  const [busy, setBusy] = useState(false);
  const state = syncScreenState(sync);
  const hero = HERO[state];
  const waiting = pending.reduce((n, c) => n + c.count, 0);

  const runSync = async () => {
    setBusy(true);
    try {
      await syncNow();
    } finally {
      setBusy(false);
    }
  };

  const syncAndTell = async () => {
    await runSync();
    toast({ message: 'Sincronizado agora', icon: CloudCheck });
  };

  return (
    <Screen header={<BackHeader title="Sincronização" fallback="/ajustes" />}>
      <Reveal>
        <Card style={s.hero}>
          <Animated.View key={state} entering={FadeIn.duration(t.motion.standard)} style={s.heroBody}>
            {state === 'offline' ? <ModuleIcon icon={hero.icon} size="lg" tone="tonal" /> : <ModuleIcon icon={hero.icon} size="lg" hue={hero.hue} />}
            <Text variant="heading" align="center" accessibilityRole="header">
              {hero.title}
            </Text>
            {state === 'emdia' ? (
              // A hora atualiza com um esmaecer quando a troca termina.
              <Animated.View key={sync.lastSyncedAt?.getTime() ?? 0} entering={FadeIn.duration(t.motion.gentle)}>
                <Text variant="small" tone="tertiary" align="center" style={s.message}>
                  {sync.connecting && !sync.connected ? 'Conectando com a nuvem…' : lastSyncText(sync.lastSyncedAt, now)}
                </Text>
              </Animated.View>
            ) : (
              <Text variant="small" tone="tertiary" align="center" style={s.message}>
                {hero.message}
              </Text>
            )}
            {state === 'emdia' && (
              <Button label="Sincronizar agora" variant="secondary" icon={RefreshCw} loading={busy} selfAlign="center" onPress={syncAndTell} />
            )}
            {/* Reconectar renova a sessão; se ela não vale mais, o app volta sozinho para a tela de entrar. */}
            {state === 'sessao' && <Button label="Entrar" loading={busy} selfAlign="center" onPress={runSync} />}
          </Animated.View>
        </Card>

        {state !== 'emdia' && waiting > 0 && (
          <Section title={`Esperando para enviar · ${count(waiting)}`}>
            <ListGroup>
              {pending.map((c) => {
                const label = labels[c.table];
                const look = label?.count ? GROUP_ICON[label.count] : null;
                return (
                  <ListItem
                    key={`${c.table}:${c.op}`}
                    icon={look?.icon ?? FileText}
                    module={look?.module}
                    title={changeLabel(c.op, label)}
                    subtitle={c.count === 1 ? '1 alteração' : `${count(c.count)} alterações`}
                    animated
                  />
                );
              })}
            </ListGroup>
          </Section>
        )}

        <Section title="Neste aparelho">
          <ListGroup>
            {COUNT_ROWS.map((r) => (
              <ListItem
                key={r.group}
                icon={r.icon}
                module={r.module}
                title={r.label}
                trailing={
                  <Text variant="small" numeric style={s.count}>
                    {counts ? count(counts[r.group]) : '–'}
                  </Text>
                }
              />
            ))}
          </ListGroup>
          <View style={s.footnote}>
            <Text variant="caption" tone="tertiary">
              Cópia completa neste aparelho; a nuvem guarda outra. Fotos sobem por uma fila própria, nunca pela
              sincronização dos dados.
            </Text>
          </View>
        </Section>
      </Reveal>
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  hero: { paddingVertical: t.space[6] },
  heroBody: { alignItems: 'center', gap: t.space[2.5] },
  message: { maxWidth: t.layout.emptyActionsMax },
  count: { fontFamily: t.type.button.font },
  footnote: { paddingHorizontal: t.space[1] },
}));
