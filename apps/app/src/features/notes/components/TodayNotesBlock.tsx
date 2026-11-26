import type { Note } from '@glife/domain/notes';
import { router } from 'expo-router';
import { Pin, Plus } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { relativeDay } from '@/shared/lib/dates';
import {
  Button,
  Icon,
  ListGroup,
  SectionHeader,
  Text,
  makeStyles,
  moduleColors,
  moduleHue,
  usePress,
  useExpandRows,
  useTheme,
} from '@/shared/ui';

import { openNote, useCreateNote } from '../hooks/useNoteActions';
import { noteExcerpt } from './excerpt';

/** Bloco "Notas" do Início (Cobalto): fixadas em grade de cartões no tom das notas, recentes numa lista. */
export function TodayNotesBlock({ notes }: { notes: Note[] }) {
  const s = useStyles();
  const create = useCreateNote();
  // Tocar numa nota: o cartão/linha vira um contêiner que se expande até a tela da nota (e volta até ela).
  const expand = useExpandRows();
  const pinned = notes.filter((n) => n.pinned);
  const recent = notes.filter((n) => !n.pinned);
  const open = (id: string) => expand.open(id, () => openNote(id, { expanded: expand.enabled }));
  return (
    <View style={s.section}>
      <SectionHeader title="Notas" actionLabel={notes.length ? 'Ver todas' : undefined} onAction={() => router.navigate('/notas')} />
      {notes.length === 0 ? (
        <ListGroup>
          <View style={s.empty}>
            <Text variant="small" tone="tertiary" style={s.grow}>
              Nenhuma nota ainda.
            </Text>
            <Button label="Nova nota" icon={Plus} variant="secondary" size="sm" selfAlign="center" onPress={() => void create({})} />
          </View>
        </ListGroup>
      ) : (
        <>
          {pinned.length > 0 && (
            <View style={s.grid}>
              {pinned.map((n) => (
                <PinnedCard key={n.id} note={n} rowRef={expand.rowRef(n.id)} onPress={() => open(n.id)} />
              ))}
            </View>
          )}
          {recent.length > 0 && (
            <ListGroup>
              {recent.map((n) => (
                <Pressable
                  key={n.id}
                  ref={expand.rowRef(n.id)}
                  accessibilityRole="button"
                  accessibilityLabel={n.title || 'Sem título'}
                  onPress={() => open(n.id)}
                  style={s.row}
                >
                  <View style={s.texts}>
                    <Text variant="item" numberOfLines={1} tone={n.title ? 'primary' : 'tertiary'}>
                      {n.title || 'Sem título'}
                    </Text>
                    {!!noteExcerpt(n.body_md) && (
                      <Text variant="caption" tone="tertiary" numberOfLines={1}>
                        {noteExcerpt(n.body_md)}
                      </Text>
                    )}
                  </View>
                  <Text variant="micro" tone="tertiary" numeric>
                    {relativeDay(n.updated_at)}
                  </Text>
                </Pressable>
              ))}
            </ListGroup>
          )}
        </>
      )}
    </View>
  );
}

function PinnedCard({ note, onPress, rowRef }: { note: Note; onPress: () => void; rowRef: ReturnType<ReturnType<typeof useExpandRows>['rowRef']> }) {
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
  section: { gap: t.space[3] },
  empty: { flexDirection: 'row', alignItems: 'center', gap: t.space[3], minHeight: t.size.navRow, paddingVertical: t.space[2] },
  grow: { flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space[3] },
  cell: { flexBasis: '45%', flexGrow: 1 },
  pinned: { borderRadius: t.radius.card - t.space[0.5], padding: t.space[3.5], gap: t.space[2], alignItems: 'flex-start' },
  pinnedTitle: { fontFamily: t.type.emphasis.font },
  row: { flexDirection: 'row', alignItems: 'center', gap: t.space[3], minHeight: t.size.navRow, paddingVertical: t.space[2.5] },
  texts: { flex: 1, minWidth: 0, gap: t.space[0.5] },
}));
