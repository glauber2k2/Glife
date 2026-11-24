import type { Note } from '@glife/domain/notes';
import { Pin } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { shortStamp } from '@/shared/lib/dates';
import { Icon, Text, makeStyles, useTheme } from '@/shared/ui';

import { noteExcerpt } from './excerpt';
import { KIND_LABEL } from './kinds';

/** Linha da lista: título e data, prévia de 2 linhas e o tipo. Separada por linha fina, nunca uma caixa. */
export function NoteRow({ note, onPress, onLongPress }: { note: Note; onPress: () => void; onLongPress?: () => void }) {
  const s = useStyles();
  const t = useTheme();
  const excerpt = noteExcerpt(note.body_md);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={note.title || 'Sem título'}
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityHint={onLongPress ? 'Toque longo para mais ações' : undefined}
      style={({ pressed }) => [s.row, pressed && s.pressed]}
    >
      <View style={s.head}>
        <Text variant="item" numberOfLines={1} style={s.title} tone={note.title ? 'primary' : 'tertiary'}>
          {note.title || 'Sem título'}
        </Text>
        <View style={s.date}>
          {note.pinned && <Icon icon={Pin} size={t.icon.tiny - 1} color="textTertiary" />}
          <Text variant="caption" tone="tertiary" numeric>
            {shortStamp(note.updated_at)}
          </Text>
        </View>
      </View>
      {!!excerpt && (
        <Text variant="small" tone="secondary" numberOfLines={2}>
          {excerpt}
        </Text>
      )}
      <Text variant="label" tone="tertiary">
        {KIND_LABEL[note.kind]}
      </Text>
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  row: {
    gap: t.space[1.5],
    paddingVertical: t.space[3] + t.space[0.5],
    borderTopWidth: t.hairline,
    borderTopColor: t.colors.hairline,
  },
  pressed: { backgroundColor: t.colors.soft },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: t.space[2] + t.space[0.5] },
  title: { flex: 1 },
  date: { flexDirection: 'row', alignItems: 'center', gap: t.space[1] },
}));
