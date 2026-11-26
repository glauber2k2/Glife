import type { Note } from '@glife/domain/notes';
import { Pin } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { shortStamp } from '@/shared/lib/dates';
import { Checkbox, Icon, Tag, Text, makeStyles, usePress, useReduceMotion, useTheme } from '@/shared/ui';

import { noteExcerpt } from './excerpt';
import { KIND_LABEL } from './kinds';

/**
 * Linha da lista (Cobalto, dentro de um ListGroup): título, trecho de uma linha, data e o tipo quando não é nota.
 * Na seleção múltipla (`selecting`) ganha o check à esquerda; marcar só muda o check, nunca o tamanho da linha.
 */
export function NoteRow({
  note,
  onPress,
  onLongPress,
  selecting,
  selected,
}: {
  note: Note;
  onPress: () => void;
  onLongPress?: () => void;
  selecting?: boolean;
  selected?: boolean;
}) {
  const s = useStyles();
  const t = useTheme();
  const reduceMotion = useReduceMotion();
  const press = usePress();
  const excerpt = noteExcerpt(note.body_md);
  return (
    <Pressable
      accessibilityRole={selecting ? 'checkbox' : 'button'}
      accessibilityState={selecting ? { checked: !!selected } : undefined}
      accessibilityLabel={note.title || 'Sem título'}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      accessibilityHint={!selecting && onLongPress ? 'Toque longo para selecionar' : undefined}
    >
      <Animated.View style={[s.row, press.style]}>
        {selecting && (
          <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(t.motion.tap)}>
            <Checkbox checked={!!selected} square />
          </Animated.View>
        )}
        <View style={s.texts}>
          <Text variant="item" numberOfLines={1} tone={note.title ? 'primary' : 'tertiary'}>
            {note.title || 'Sem título'}
          </Text>
          {!!excerpt && (
            <Text variant="caption" tone="tertiary" numberOfLines={1}>
              {excerpt}
            </Text>
          )}
        </View>
        <View style={s.end}>
          <View style={s.date}>
            {note.pinned && <Icon icon={Pin} size={t.icon.tiny - t.hairline} color="textTertiary" />}
            <Text variant="micro" tone="tertiary" numeric>
              {shortStamp(note.updated_at)}
            </Text>
          </View>
          {note.kind !== 'note' && <Tag label={KIND_LABEL[note.kind]} />}
        </View>
      </Animated.View>
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: t.space[3], minHeight: t.size.navRow, paddingVertical: t.space[3] },
  texts: { flex: 1, minWidth: 0, gap: t.space[0.5] },
  end: { alignItems: 'flex-end', gap: t.space[1], flexShrink: 0 },
  date: { flexDirection: 'row', alignItems: 'center', gap: t.space[1] },
}));
