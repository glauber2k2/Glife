// Central de notificações (protótipo "notificacoes"): tudo o que o app avisou num lugar só, em Hoje/Ontem/Antes, com a
// ação direto na linha (Pagar, Confirmar, Registrar, Feito). "Marcar lidas" faz os pontos encolherem em cascata;
// resolver na linha recolhe a linha e sobe o aviso de confirmação. Os avisos de Bíblia e IA chegam com os módulos.
import { relativeTime, type AppNotification, type FeedItem } from '@glife/domain/notifications';
import { router } from 'expo-router';
import { AlarmClock, Apple, Check, CheckCheck, CreditCard, Receipt, Settings2, type LucideIcon } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import Animated, { Easing, FadeOut, LinearTransition, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { useOpenRoute } from '@/features/links';
import { errorText } from '@/shared/lib/errorText';
import {
  BackHeader,
  Button,
  EmptyState,
  IconButton,
  ListGroup,
  ModuleIcon,
  Reveal,
  Screen,
  Text,
  makeStyles,
  usePress,
  useReduceMotion,
  useTheme,
  useToast,
  type ModuleKey,
} from '@/shared/ui';

import { useNotifications } from '../notifications/NotificationsData';
import { noticeForSnooze } from '../notifications/snooze';
import { SnoozeSheet } from '../components/SnoozeSheet';

const MODULE_KEY: Record<AppNotification['module'], ModuleKey> = { finance: 'finance', agenda: 'reminders', diet: 'diet' };

function iconOf(n: AppNotification): LucideIcon {
  if (n.module === 'agenda') return AlarmClock;
  if (n.module === 'diet') return Apple;
  return n.id.startsWith('invoice:') ? CreditCard : Receipt;
}

/** Mensagem do aviso de confirmação depois de resolver na linha. */
const resolvedText = (n: AppNotification) => (n.module === 'agenda' ? 'Lembrete concluído' : 'Previsto confirmado');

export function NotificationsScreen() {
  const s = useStyles();
  const toast = useToast();
  const { feed, ready, now, markAllRead, resolve, snooze } = useNotifications();
  const [snoozing, setSnoozing] = useState<AppNotification | null>(null);
  const openRoute = useOpenRoute();
  // Resolvidos na linha somem na hora (os dados chegam logo depois pelo watch).
  const [gone, setGone] = useState<ReadonlySet<string>>(new Set());
  const groups = useMemo(
    () => feed.groups.map((g) => ({ ...g, items: g.items.filter((i) => !gone.has(i.id)) })).filter((g) => g.items.length > 0),
    [feed, gone],
  );
  const empty = ready && groups.length === 0;

  const readAll = () => {
    if (feed.unread === 0) return;
    markAllRead();
    toast({ message: 'Tudo marcado como lido', icon: CheckCheck });
  };

  const act = async (n: FeedItem) => {
    if (!n.action) return;
    if (n.action.kind === 'open') {
      if (n.route) void openRoute(n.route);
      return;
    }
    setGone((g) => new Set(g).add(n.id));
    try {
      await resolve(n);
      toast({ message: resolvedText(n), icon: Check });
    } catch (e) {
      setGone((g) => {
        const next = new Set(g);
        next.delete(n.id);
        return next;
      });
      toast({ message: errorText(e) });
    }
  };

  // Posição de cada ponto não lido na tela, para a cascata ao marcar como lidas.
  let dotIndex = 0;

  return (
    <Screen
      header={
        <BackHeader
          title="Notificações"
          backLabel="Início"
          fallback="/"
          right={
            empty ? (
              <IconButton icon={Settings2} label="Ajustes" onPress={() => router.push('/ajustes')} />
            ) : (
              <Button label="Marcar lidas" variant="ghost" size="sm" selfAlign="center" disabled={feed.unread === 0} onPress={readAll} />
            )
          }
        />
      }
    >
      {empty ? (
        <EmptyState title="Nada novo por aqui" message="Quando algo pedir sua atenção, eu aviso aqui e no celular." mood="dormindo" />
      ) : (
        <Reveal>
          {groups.map((g) => (
            <View key={g.label} style={s.section}>
              <Text variant="label" tone="tertiary">
                {g.label}
              </Text>
              <ListGroup>
                {g.items.map((n) => (
                  <NotificationRow key={n.id} n={n} now={now} dotIndex={n.unread ? dotIndex++ : 0} onAction={() => void act(n)} onSnooze={() => setSnoozing(n)} />
                ))}
              </ListGroup>
            </View>
          ))}
        </Reveal>
      )}
      <SnoozeSheet notification={snoozing} onClose={() => setSnoozing(null)} onSnooze={snooze} />
    </Screen>
  );
}

function NotificationRow({ n, now, dotIndex, onAction, onSnooze }: { n: FeedItem; now: Date; dotIndex: number; onAction: () => void; onSnooze: () => void }) {
  const openRoute = useOpenRoute();
  const s = useStyles();
  const t = useTheme();
  const reduceMotion = useReduceMotion();
  const press = usePress(!n.route);
  // Recolhe ao sair (resolvido) e as de baixo sobem.
  const animations = useMemo(() => {
    if (reduceMotion) return { exiting: FadeOut.duration(t.motion.reduced) };
    const [a, b, c, d] = t.easing.standard;
    return {
      layout:
        Platform.OS === 'web'
          ? LinearTransition.duration(t.motion.standard).easing(Easing.bezier(a, b, c, d))
          : LinearTransition.springify(t.spring.gentle.duration).dampingRatio(t.spring.gentle.dampingRatio),
      exiting: FadeOut.duration(t.motion.tap),
    };
  }, [reduceMotion, t]);

  return (
    <Animated.View collapsable={false} layout={animations.layout} exiting={animations.exiting}>
      <Pressable
        accessibilityRole={n.route ? 'button' : undefined}
        accessibilityLabel={`${n.unread ? 'Novo: ' : ''}${n.title}`}
        disabled={!n.route}
        onPress={() => n.route && void openRoute(n.route)}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
      >
        <Animated.View style={[s.row, press.style]}>
          <ModuleIcon icon={iconOf(n)} module={MODULE_KEY[n.module]} />
          <View style={s.texts}>
            <View style={s.titleRow}>
              <Text variant="item" style={s.title}>
                {n.title}
              </Text>
              <UnreadDot unread={n.unread} index={dotIndex} />
            </View>
            {!!n.message && (
              <Text variant="caption" tone="secondary">
                {n.message}
              </Text>
            )}
            <Text variant="caption" tone="tertiary" numeric style={s.when}>
              {relativeTime(n.at, now)}
            </Text>
            {noticeForSnooze(n) && <Button label="Adiar" variant="ghost" size="sm" icon={AlarmClock} onPress={onSnooze} />}
          </View>
          {n.action && <Button label={n.action.label} variant="secondary" size="sm" selfAlign="center" haptic onPress={onAction} />}
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

/** Ponto de não lido: ao marcar como lidas, encolhe e some em cascata. O espaço fica (a linha não pula). */
function UnreadDot({ unread, index }: { unread: boolean; index: number }) {
  const s = useStyles();
  const t = useTheme();
  const reduceMotion = useReduceMotion();
  // Uma vez novo, o ponto fica montado (encolhido) para a linha não mudar de tamanho.
  const [shown, setShown] = useState(unread);
  if (unread && !shown) setShown(true);
  const k = useSharedValue(unread ? 1 : 0);
  useEffect(() => {
    if (unread) {
      k.set(1);
      return;
    }
    const [a, b, c, d] = t.easing.exit;
    const duration = reduceMotion ? t.motion.reduced : t.motion.standard;
    k.set(withDelay(reduceMotion ? 0 : index * t.motion.dotStagger, withTiming(0, { duration, easing: Easing.bezier(a, b, c, d) })));
  }, [unread, index, k, reduceMotion, t]);
  const style = useAnimatedStyle(() => ({ opacity: k.get(), transform: [{ scale: reduceMotion ? 1 : k.get() }] }));
  if (!shown) return null;
  return <Animated.View style={[s.dot, style]} />;
}

const useStyles = makeStyles((t) => ({
  section: { gap: t.space[2.5] },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: t.space[3],
    minHeight: t.size.navRow,
    paddingVertical: t.space[3.5],
  },
  texts: { flex: 1, minWidth: 0, gap: t.space[0.5] },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: t.space[1.5] },
  title: { flexShrink: 1 },
  when: { marginTop: t.space[0.5] },
  dot: { width: t.size.dot, height: t.size.dot, borderRadius: t.radius.full, backgroundColor: t.colors.accent, flexShrink: 0 },
}));
