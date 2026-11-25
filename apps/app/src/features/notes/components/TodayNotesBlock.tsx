import type { Note } from '@glife/domain/notes';
import { router } from 'expo-router';
import { Pin, Plus } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { relativeDay } from '@/shared/lib/dates';
import { Button, Icon, Section, Text, makeStyles, useExpandRows, useTheme } from '@/shared/ui';

import { openNote, useCreateNote } from '../hooks/useNoteActions';
import { noteExcerpt } from './excerpt';

/** Bloco "Notas" da tela Hoje: fixadas e recentes; sem notas, convida a criar. */
export function TodayNotesBlock({ notes }: { notes: Note[] }) {
  const s = useStyles();
  const t = useTheme();
  const create = useCreateNote();
  // Tocar numa nota: a linha vira um contêiner que se expande até a tela da nota (e volta até ela).
  const expand = useExpandRows();
  const empty = notes.length === 0;
  return (
    <Section
      title="Notas"
      action={
        empty ? (
          <Button label="Nova nota" icon={Plus} variant="ghost" size="sm" onPress={() => void create({})} />
        ) : (
          <Button label="Ver todas" variant="ghost" size="sm" onPress={() => router.navigate('/notas')} />
        )
      }
    >
      {empty ? (
        <Text tone="tertiary">Nenhuma nota ainda.</Text>
      ) : (
        notes.map((n) => {
          const excerpt = noteExcerpt(n.body_md);
          return (
            <Pressable
              key={n.id}
              ref={expand.rowRef(n.id)}
              accessibilityRole="button"
              accessibilityLabel={n.title || 'Sem título'}
              onPress={() => expand.open(n.id, () => openNote(n.id, { expanded: expand.enabled }))}
              style={({ pressed }) => [s.row, pressed && s.pressed]}
            >
              <View style={s.head}>
                <Text variant="item" numberOfLines={1} style={s.title} tone={n.title ? 'primary' : 'tertiary'}>
                  {n.title || 'Sem título'}
                </Text>
                <View style={s.date}>
                  {n.pinned && <Icon icon={Pin} size={t.icon.tiny - 1} color="textTertiary" />}
                  <Text variant="caption" tone="tertiary" numeric>
                    {relativeDay(n.updated_at)}
                  </Text>
                </View>
              </View>
              {!!excerpt && (
                <Text variant="small" tone="secondary" numberOfLines={1}>
                  {excerpt}
                </Text>
              )}
            </Pressable>
          );
        })
      )}
    </Section>
  );
}

const useStyles = makeStyles((t) => ({
  row: { gap: t.space[0.5] + t.space[0.5], paddingVertical: t.space[2] + t.space[0.5] },
  pressed: { backgroundColor: t.colors.soft },
  head: { flexDirection: 'row', alignItems: 'baseline', gap: t.space[2] },
  title: { flex: 1 },
  date: { flexDirection: 'row', alignItems: 'center', gap: t.space[1] },
}));
