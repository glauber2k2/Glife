import { router, useFocusEffect } from 'expo-router';
import { ChevronRight, Search, Settings2 } from 'lucide-react-native';
import { useCallback, useRef, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';

import { TodayFinanceBlock } from '@/features/finance';
import { TodayInboxBlock } from '@/features/inbox';
import { TodayNotesBlock, useTodayNotes } from '@/features/notes';
import { openSearch } from '@/features/search';
import { longDate } from '@/shared/lib/dates';
import { Icon, IconButton, Reveal, Screen, Text, makeStyles, useTheme } from '@/shared/ui';

import { shouldReplayEntrance } from '../entrance';

/**
 * Tela Hoje (protótipo "Glife Hoje", variante 2a): a única que compõe várias features — cada bloco vem da
 * feature dona. Na Fase 1 só Caixa de entrada e Notas existem; os módulos ainda não configurados recolhem
 * numa linha no fim, que leva a Ajustes.
 */
export function TodayScreen() {
  const s = useStyles();
  const notes = useTodayNotes();
  const firstUse = notes !== null && notes.length === 0;
  const entrance = useEntranceReplay();

  return (
    <Screen eyebrow={longDate()} title="Hoje" action={<HeaderActions />}>
      {firstUse && (
        <Text tone="secondary" style={s.intro}>
          O resumo do dia se monta aqui conforme o app é usado.
        </Text>
      )}
      {notes && (
        <View key={entrance} style={s.blocks}>
          <Reveal>
            <TodayFinanceBlock key="finance" />
            <TodayInboxBlock key="inbox" firstUse={firstUse} />
            <TodayNotesBlock key="notes" notes={notes} />
            <ModulesRow key="modules" />
          </Reveal>
        </View>
      )}
    </Screen>
  );
}

/** Lupa e ajustes; no web a lupa vira a pílula "Buscar  Ctrl K". */
function HeaderActions() {
  const s = useStyles();
  const t = useTheme();
  return (
    <View style={s.actions}>
      {Platform.OS === 'web' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Buscar (Ctrl K)"
          onPress={openSearch}
          style={({ pressed }) => [s.searchPill, pressed && s.pressed]}
        >
          <Icon icon={Search} size={t.icon.small} color="textSecondary" />
          <Text variant="small" tone="secondary">
            Buscar
          </Text>
          <View style={s.kbd}>
            <Text variant="caption" tone="tertiary" style={s.kbdText}>
              Ctrl K
            </Text>
          </View>
        </Pressable>
      ) : (
        <IconButton icon={Search} label="Buscar" variant="ghost" onPress={openSearch} />
      )}
      <IconButton icon={Settings2} label="Ajustes" variant="ghost" onPress={() => router.push('/ajustes')} />
    </View>
  );
}

/** Módulos ainda não configurados: uma linha só, no fim. */
function ModulesRow() {
  const s = useStyles();
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Configurar módulos"
      onPress={() => router.push('/ajustes')}
      style={({ pressed }) => [s.modules, pressed && s.pressed]}
    >
      <Text variant="small" tone="tertiary" style={s.modulesText}>
        Agenda, refeições e devocional aparecem aqui quando forem configurados.
      </Text>
      <Icon icon={ChevronRight} size={t.icon.small} color="textTertiary" />
    </Pressable>
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
  intro: { marginTop: -t.space[3] },
  blocks: { gap: t.layout.blockGap },
  actions: { flexDirection: 'row', alignItems: 'center', gap: t.space[0.5], marginRight: -t.space[2] },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space[2],
    height: t.size.chipSmall,
    paddingLeft: t.space[3],
    paddingRight: t.space[1.5],
    marginRight: t.space[1.5],
    borderRadius: t.radius.full,
    borderWidth: t.hairline,
    borderColor: t.colors.hairline,
  },
  kbd: {
    height: t.size.pillSmall - t.space[1],
    paddingHorizontal: t.space[2],
    borderRadius: t.radius.full,
    backgroundColor: t.colors.soft,
    justifyContent: 'center',
  },
  kbdText: { fontFamily: t.type.label.font },
  pressed: { backgroundColor: t.colors.soft },
  modules: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space[3],
    paddingVertical: t.space[3] + t.space[0.5],
    borderTopWidth: t.hairline,
    borderTopColor: t.colors.hairline,
  },
  modulesText: { flex: 1 },
}));
