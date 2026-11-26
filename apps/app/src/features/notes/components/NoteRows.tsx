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
}: {
  notes: Note[];
  onOpen: (note: Note) => void;
  /** toque longo: ações da nota (ex.: mover para a lixeira) */
  onLongPress?: (note: Note) => void;
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
          <NoteRow note={n} onPress={() => onOpen(n)} onLongPress={onLongPress ? () => onLongPress(n) : undefined} />
        </Animated.View>
      ))}
    </ListGroup>
  );
}
