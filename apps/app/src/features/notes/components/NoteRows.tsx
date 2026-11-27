import type { Note } from '@glife/domain/notes';
import { useMemo } from 'react';
import { Platform } from 'react-native';
import Animated, { Easing, FadeOut, LinearTransition } from 'react-native-reanimated';

import { ListGroup, riseIn, useReduceMotion, useTheme } from '@/shared/ui';

import { NoteRow } from './NoteRow';

/**
 * Linhas da lista com movimento: entram em cascata, a que sai esmaece e as de baixo sobem juntas
 * (mola suave). Com "reduzir movimento", nada anima.
 */
export function NoteRows({
  notes,
  onOpen,
  onLongPress,
  selection,
}: {
  notes: Note[];
  onOpen: (note: Note) => void;
  /** toque longo: ações da nota ou entrar na seleção */
  onLongPress?: (note: Note) => void;
  /** seleção múltipla: ids marcados (o toque marca em vez de abrir) */
  selection?: ReadonlySet<string>;
}) {
  const t = useTheme();
  const reduceMotion = useReduceMotion();
  const layout = useMemo(() => {
    if (reduceMotion) return undefined;
    return Platform.OS === 'web'
      ? LinearTransition.duration(t.spring.gentle.duration).easing(Easing.out(Easing.cubic))
      : LinearTransition.springify(t.spring.gentle.duration).dampingRatio(t.spring.gentle.dampingRatio);
  }, [reduceMotion, t]);

  return (
    <ListGroup>
      {notes.map((n, i) => (
        <Animated.View
          key={n.id}
          layout={layout}
          entering={reduceMotion ? undefined : riseIn(t.motion.enterOffset, t.motion.standard, Math.min(i, t.motion.staggerMax) * t.motion.stagger)}
          exiting={reduceMotion ? undefined : FadeOut.duration(t.motion.tap)}
        >
          <NoteRow
            note={n}
            onPress={() => onOpen(n)}
            onLongPress={onLongPress ? () => onLongPress(n) : undefined}
            selecting={!!selection}
            selected={selection?.has(n.id)}
          />
        </Animated.View>
      ))}
    </ListGroup>
  );
}
