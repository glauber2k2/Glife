import type { Note } from '@glife/domain/notes';
import { Pin } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { shortStamp } from '@/shared/lib/dates';
import { Icon, Text, makeStyles, useTheme } from '@/shared/ui';

import { noteExcerpt } from './excerpt';

const KIND_LABEL: Record<Note['kind'], string | null> = { note: null, devotional: 'Devocional', journal: 'Diário' };

/** Linha da lista: título e data, prévia de 2 linhas e o tipo. Separada por linha fina, nunca uma caixa. */
export function NoteRow({ note, onPress }: { note: Note; onPress: () => void }) {
  const s = useStyles();
  const t = useTheme();
  const excerpt = noteExcerpt(note.body_md);
  const kind = KIND_LABEL[note.kind];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={note.title || 'Sem título'}
      onPress={onPress}
      style={({ pressed }) => [s.row, pressed && s.pressed]}
    >
      <View style={s.head}>
        <Text variant="item" numberOfLines={1} style={s.title} tone={note.title ? 'primary' : 'tertiary'}>
          {note.title || 'Sem título'}
        </Text>
        <Text variant="caption" tone="tertiary" numeric>
          {shortStamp(note.updated_at)}
        </Text>
      </View>
      {!!excerpt && (
        <Text variant="small" tone="secondary" numberOfLines={2}>
          {excerpt}
        </Text>
      )}
      {(kind || note.pinned) && (
        <View style={s.meta}>
          {note.pinned && <Icon icon={Pin} size={t.icon.tiny} color="textTertiary" />}
          {kind && (
            <Text variant="label" tone="tertiary">
              {kind}
            </Text>
          )}
        </View>
      )}
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
  meta: { flexDirection: 'row', alignItems: 'center', gap: t.space[1.5] },
}));
