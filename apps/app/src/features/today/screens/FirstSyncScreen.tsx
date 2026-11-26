// Abertura e primeira sincronização (protótipo "abertura"): só no primeiro acesso de um aparelho o app baixa os dados
// uma vez e já deixa usar o que chegou ("Começar a usar" assim que as notas chegam). Sem internet nesse primeiro acesso,
// explica que precisa de conexão uma única vez. Nas aberturas seguintes nada disso aparece (local-first, instantâneo).
import { Apple, Calendar, Check, StickyNote, Wallet, WifiOff, type LucideIcon } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

import {
  canStartUsing,
  firstSyncState,
  useLocalCounts,
  useSyncNow,
  useSyncState,
  type CountGroup,
} from '@/shared/lib/powersync';
import {
  Button,
  Icon,
  ListGroup,
  ListItem,
  Mascot,
  ModuleIcon,
  ProgressRing,
  Screen,
  Spinner,
  Text,
  makeStyles,
  statusHue,
  useReduceMotion,
  useTheme,
  type ModuleKey,
} from '@/shared/ui';

const ROWS: { group: CountGroup; label: string; icon: LucideIcon; module: ModuleKey }[] = [
  { group: 'notes', label: 'Notas', icon: StickyNote, module: 'notes' },
  { group: 'transactions', label: 'Finanças', icon: Wallet, module: 'finance' },
  { group: 'agenda', label: 'Agenda', icon: Calendar, module: 'agenda' },
  { group: 'diet', label: 'Dieta', icon: Apple, module: 'diet' },
];

/** 1240 → "1.240" */
const count = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/** Mostra a primeira sincronização no lugar do app enquanto `hasSynced` é falso (e o usuário não pediu para começar). */
export function FirstSyncGate({ active, children }: { active: boolean; children: ReactNode }) {
  const sync = useSyncState();
  const [dismissed, setDismissed] = useState(false);
  const state = active ? firstSyncState(sync, dismissed) : 'none';
  if (state === 'none') return children;
  return <FirstSyncScreen offline={state === 'offline'} onStart={() => setDismissed(true)} />;
}

function FirstSyncScreen({ offline, onStart }: { offline: boolean; onStart: () => void }) {
  const s = useStyles();
  const t = useTheme();
  const reduceMotion = useReduceMotion();
  const sync = useSyncState();
  const syncNow = useSyncNow();
  const counts = useLocalCounts();
  const [retrying, setRetrying] = useState(false);
  const fade = FadeIn.duration(reduceMotion ? t.motion.tap : t.motion.standard);

  if (offline) {
    const retry = async () => {
      setRetrying(true);
      try {
        await syncNow();
      } finally {
        setRetrying(false);
      }
    };
    return (
      <Screen>
        <Animated.View entering={fade} style={s.offline}>
          <ModuleIcon icon={WifiOff} size="lg" tone="tonal" />
          <Text variant="title" align="center" accessibilityRole="header">
            Precisa de internet uma vez
          </Text>
          <Text tone="tertiary" align="center" style={s.message}>
            No primeiro acesso deste aparelho eu baixo seus dados. Depois disso, o Glife funciona sem conexão.
          </Text>
          <Button label="Tentar de novo" selfAlign="center" loading={retrying} onPress={retry} />
        </Animated.View>
      </Screen>
    );
  }

  const done = sync.hasSynced === true;
  const progress = done ? 1 : (sync.progress ?? 0);
  const ready = canStartUsing(sync, counts?.notes ?? 0);

  return (
    <Screen footer={<Button label="Começar a usar" fullWidth haptic disabled={!ready} onPress={onStart} />}>
      <Animated.View entering={fade} style={s.top}>
        <Mascot size={t.size.mascot} eyes={t.colors.bg} mood={done ? 'feliz' : 'pensando'} float />
        <Text variant="title" align="center" accessibilityRole="header">
          Trazendo seus dados
        </Text>
        <Text variant="small" tone="tertiary" align="center">
          Só desta vez. Pode começar a usar enquanto isso.
        </Text>
        <View style={s.ring}>
          {done ? (
            // Terminou: o anel vira um visto com mola.
            <Animated.View entering={reduceMotion ? FadeIn.duration(t.motion.tap) : ZoomIn.springify()} style={s.doneMark}>
              <ModuleIcon icon={Check} size="lg" hue={statusHue.ok} />
            </Animated.View>
          ) : (
            <ProgressRing value={progress} size={t.size.ring} stroke={t.size.ringStroke}>
              <Text variant="heading" numeric>
                {`${Math.round(progress * 100)}%`}
              </Text>
            </ProgressRing>
          )}
        </View>
      </Animated.View>
      <ListGroup>
        {ROWS.map((r) => {
          const n = counts?.[r.group] ?? 0;
          return (
            <ListItem
              key={r.group}
              icon={r.icon}
              module={r.module}
              title={r.label}
              trailing={
                <View style={s.trailing}>
                  <Text variant="small" tone="tertiary" numeric>
                    {done ? count(n) : n > 0 ? `${count(n)} até agora` : 'Na fila'}
                  </Text>
                  <View style={s.mark}>{done ? <Icon icon={Check} size={t.icon.small} color="success" /> : <Spinner color="textTertiary" />}</View>
                </View>
              }
            />
          );
        })}
      </ListGroup>
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  offline: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: t.space[2.5], paddingTop: t.space[12] },
  message: { maxWidth: t.layout.emptyActionsMax, marginBottom: t.space[3] },
  top: { alignItems: 'center', gap: t.space[2], paddingTop: t.space[6] },
  ring: { marginTop: t.space[3], minHeight: t.size.ring, alignItems: 'center', justifyContent: 'center' },
  doneMark: { alignItems: 'center', justifyContent: 'center' },
  trailing: { flexDirection: 'row', alignItems: 'center', gap: t.space[2] },
  mark: { width: t.icon.size, alignItems: 'center' },
}));
