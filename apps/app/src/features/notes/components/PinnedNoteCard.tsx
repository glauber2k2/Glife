import type { Note } from '@glife/domain/notes';
import { Pin } from 'lucide-react-native';
import { Pressable } from 'react-native';
import Animated from 'react-native-reanimated';

import { relativeDay } from '@/shared/lib/dates';
import { Icon, Text, makeStyles, moduleColors, moduleHue, usePress, useTheme, type useExpandRows } from '@/shared/ui';

import { noteExcerpt } from './excerpt';

/** Nota fixada em cartão no tom das notas: título, trecho de 3 linhas e data. Cresce até virar a nota. */
export function PinnedNoteCard({ note, onPress, rowRef }: { note: Note; onPress: () => void; rowRef?: ReturnType<ReturnType<typeof useExpandRows>['rowRef']> }) {
  const s = useStyles();
  const t = useTheme();
  const press = usePress();
  const colors = moduleColors(moduleHue.notes, t.scheme);
  const excerpt = noteExcerpt(note.body_md);
  return (
    <Pressable
      ref={rowRef}
      accessibilityRole="button"
      accessibilityLabel={`${note.title || 'Sem título'}, fixada`}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={s.cell}
    >
      <Animated.View style={[s.pinned, { backgroundColor: colors.soft }, press.style]}>
        <Icon icon={Pin} size={t.icon.small + t.space[0.5]} rawColor={colors.strong} />
        <Text variant="item" numberOfLines={2} style={s.pinnedTitle}>
          {note.title || 'Sem título'}
        </Text>
        {!!excerpt && (
          <Text variant="caption" tone="secondary" numberOfLines={3}>
            {excerpt}
          </Text>
        )}
        <Text variant="micro" tone="tertiary" numeric>
          {relativeDay(note.updated_at)}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  cell: { flexBasis: '45%', flexGrow: 1 },
  pinned: { borderRadius: t.radius.card - t.space[0.5], padding: t.space[3.5], gap: t.space[2], alignItems: 'flex-start' },
  pinnedTitle: { fontFamily: t.type.emphasis.font },
}));
