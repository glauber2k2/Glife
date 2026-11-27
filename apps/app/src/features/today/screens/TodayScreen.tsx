import { router, useFocusEffect } from 'expo-router';
import { Bell, BookOpen, CalendarCheck, Plus, Salad, Search, Settings, ShoppingBasket, StickyNote, TrendingUp, Wallet } from 'lucide-react-native';
import { useCallback, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { TodayAgendaBlock } from '@/features/agenda';
import { TodayDietBlock } from '@/features/diet';
import { TodayFinanceBlock } from '@/features/finance';
import { TodayNotesBlock, useTodayNotes } from '@/features/notes';
import { openSearch } from '@/features/search';
import { longDate } from '@/shared/lib/dates';
import {
  Icon,
  IconButton,
  Mascot,
  ModuleTile,
  ModuleTiles,
  Reveal,
  Screen,
  SectionHeader,
  Text,
  makeStyles,
  usePress,
  useTheme,
} from '@/shared/ui';

import { shouldReplayEntrance } from '../entrance';
import { useNotifications } from '../notifications/NotificationsData';
import { greeting } from './greeting';

/**
 * Início (protótipo do redesign Cobalto): um resumo calmo do dia. A única tela que compõe várias features — cada
 * bloco vem da feature dona. Blocos de módulos que ainda não existem (Galeria, IA) ficam de fora.
 */
export function TodayScreen() {
  const s = useStyles();
  const notes = useTodayNotes();
  const firstUse = notes !== null && notes.length === 0;
  const entrance = useEntranceReplay();

  return (
    <Screen
      eyebrow={longDate()}
      title={firstUse ? 'Boas-vindas' : greeting(new Date().getHours())}
      action={<HeaderActions />}
      tabBar
    >
      {notes && (
        <View key={entrance} style={s.blocks}>
          <Reveal>
            <AskBar key="ask" />
            <TodayAgendaBlock key="agenda" />
            <TodayFinanceBlock key="finance" />
            <TodayDietBlock key="diet" />
            <TodayNotesBlock key="notes" notes={notes} />
            <Spaces key="spaces" />
          </Reveal>
        </View>
      )}
    </Screen>
  );
}

function HeaderActions() {
  const s = useStyles();
  const { hasUnread } = useNotifications();
  return (
    <View style={s.actions}>
      <IconButton icon={Search} label="Buscar" onPress={openSearch} />
      <IconButton
        icon={Bell}
        label={hasUnread ? 'Notificações, há novidades' : 'Notificações'}
        badge={hasUnread}
        onPress={() => router.push('/notificacoes')}
      />
      <IconButton icon={Settings} label="Ajustes" onPress={() => router.push('/ajustes')} />
    </View>
  );
}

/** "Pergunte, anote ou lembre…": abre a captura (a conversa com a IA chega na Fase 6). */
function AskBar() {
  const s = useStyles();
  const t = useTheme();
  const press = usePress();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Anotar ou lembrar"
      onPress={() => router.push('/caixa-de-entrada')}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
    >
      <Animated.View style={[s.ask, press.style]}>
        <Mascot size={t.size.tabIndicatorHeight - t.space[0.5]} />
        <Text tone="tertiary" style={s.askText} numberOfLines={1}>
          Anote ou lembre…
        </Text>
        <View style={s.mic}>
          <Icon icon={Plus} />
        </View>
      </Animated.View>
    </Pressable>
  );
}

/** Atalhos dos módulos que já existem. */
function Spaces() {
  const s = useStyles();
  return (
    <View style={s.section}>
      <SectionHeader title="Seus espaços" />
      <ModuleTiles>
        <ModuleTile label="Notas" icon={StickyNote} module="notes" onPress={() => router.navigate('/notas')} />
        <ModuleTile label="Agenda" icon={CalendarCheck} module="agenda" onPress={() => router.navigate('/agenda')} />
        <ModuleTile label="Finanças" icon={Wallet} module="finance" onPress={() => router.navigate('/financas')} />
        <ModuleTile label="Investir" icon={TrendingUp} module="investments" onPress={() => router.push('/financas/investimentos')} />
        <ModuleTile label="Dieta" icon={Salad} module="diet" onPress={() => router.push('/dieta')} />
        <ModuleTile label="Compras" icon={ShoppingBasket} module="shopping" onPress={() => router.push('/financas/compras')} />
        <ModuleTile label="Bíblia" icon={BookOpen} module="bible" onPress={() => router.push('/biblia')} />
      </ModuleTiles>
    </View>
  );
}

/** Chave que muda ao voltar à aba depois de 30 min fora: os blocos refazem a cascata de entrada. */
function useEntranceReplay(): number {
  const [key, setKey] = useState(0);
  const leftAt = useRef<number | null>(null);
  useFocusEffect(
    useCallback(() => {
      if (shouldReplayEntrance(leftAt.current, Date.now())) setKey((k) => k + 1);
      return () => {
        leftAt.current = Date.now();
      };
    }, []),
  );
  return key;
}

const useStyles = makeStyles((t) => ({
  blocks: { gap: t.layout.blockGap },
  section: { gap: t.space[3] },
  actions: { flexDirection: 'row', alignItems: 'center', gap: t.space[2] },
  ask: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space[3],
    height: t.size.navRow,
    paddingLeft: t.space[3.5],
    paddingRight: t.space[2],
    borderRadius: t.radius.full,
    backgroundColor: t.colors.card,
  },
  askText: { flex: 1, fontSize: t.type.item.fontSize },
  mic: {
    width: t.size.iconButton - t.space[0.5],
    height: t.size.iconButton - t.space[0.5],
    borderRadius: t.radius.full,
    backgroundColor: t.colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
