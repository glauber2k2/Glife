import type { NoteListQuery } from '@glife/domain/notes';
import { router, useLocalSearchParams } from 'expo-router';
import { Folder, Folders, SquarePen, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { useLinksData } from '@/features/links';
import { Alert, Button, Chip, EmptyState, IconButton, Screen, SearchField, Section, makeStyles } from '@/shared/ui';

import { NoteRows } from '../components/NoteRows';
import { PinnedNoteCard } from '../components/PinnedNoteCard';
import { useNoteQuickActions } from '../components/NoteQuickActions';
import { useNotesData } from '../hooks/NotesData';
import { useFocusData } from '../hooks/useFocusData';
import { useNoteList } from '../hooks/useNoteList';
import { openNote, useCreateNote } from '../hooks/useNoteActions';

type KindFilter = 'all' | 'pinned' | 'journal' | 'devotional';

const KIND_FILTERS: { value: KindFilter; label: string; query: NoteListQuery }[] = [
  { value: 'all', label: 'Todas', query: {} },
  { value: 'pinned', label: 'Fixadas', query: { pinned: true } },
  { value: 'journal', label: 'Diário', query: { kind: 'journal' } },
  { value: 'devotional', label: 'Devocional', query: { kind: 'devotional' } },
];

const LIST_LIMIT = 200;

/** Notas do aparelho (funciona sem internet), com acesso a Pastas e à Lixeira. */
export function NoteListScreen() {
  const s = useStyles();
  const quick = useNoteQuickActions();
  const { notes, folders } = useNotesData();
  const { tags } = useLinksData();
  const [kind, setKind] = useState<KindFilter>('all');
  const [tagId, setTagId] = useState<string | null>(null);
  // `/notas?tag=<id>` (ex.: tag escolhida na busca universal) aplica o filtro.
  // Ajuste durante a renderização (padrão do React para reagir a uma prop nova), sem efeito em cascata.
  const { tag } = useLocalSearchParams<{ tag?: string }>();
  const [appliedTag, setAppliedTag] = useState<string | undefined>(undefined);
  if (typeof tag === 'string' && tag && tag !== appliedTag) {
    setAppliedTag(tag);
    setKind('all');
    setTagId(tag);
  }
  const [search, setSearch] = useState('');
  const query = KIND_FILTERS.find((f) => f.value === kind)!.query;
  const { items, failed } = useNoteList({ ...query, search: search.trim(), limit: LIST_LIMIT });
  const create = useCreateNote();

  const { data: side } = useFocusData(
    async () => {
      const [allFolders, allTags, trash] = await Promise.all([folders.list(), tags.list(), notes.countTrash()]);
      return { folders: allFolders, tags: allTags, trash };
    },
  );
  const [tagged, setTagged] = useState<Set<string> | null>(null);
  useEffect(() => {
    let active = true;
    if (!tagId) return;
    void tags.entitiesWithTag(tagId, 'note').then((ids) => active && setTagged(new Set(ids)));
    return () => {
      active = false;
    };
  }, [tags, tagId, items]);

  const visible = items && tagId && tagged ? items.filter((n) => tagged.has(n.id)) : items;
  const filtered = kind !== 'all' || !!tagId || search.trim() !== '';
  const total = items?.length ?? 0;
  const pinned = !filtered && visible ? visible.filter((n) => n.pinned) : [];
  const rest = !filtered && visible ? visible.filter((n) => !n.pinned) : visible;

  return (
    <Screen
      title="Notas"
      eyebrow={filtered || !items ? ' ' : `${total}${total === LIST_LIMIT ? '+' : ''} ${total === 1 ? 'nota' : 'notas'}`}
      tabBar
      action={
        <View style={s.actions}>
          <IconButton icon={Folder} label="Pastas" onPress={() => router.push('/pastas')} />
          <IconButton icon={SquarePen} label="Nova nota" onPress={() => void create({})} />
        </View>
      }
    >
      <View style={s.controls}>
        <SearchField value={search} onChangeText={setSearch} placeholder="Buscar notas" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.bleed} contentContainerStyle={s.chips}>
          {KIND_FILTERS.map((f) => (
            <Chip
              key={f.value}
              size="sm"
              label={f.label}
              selected={kind === f.value && !tagId}
              onPress={() => {
                setKind(f.value);
                setTagId(null);
              }}
            />
          ))}
          {side?.tags.map((tag) => (
            <Chip
              key={tag.id}
              size="sm"
              label={`#${tag.name}`}
              selected={tagId === tag.id}
              onPress={() => setTagId(tagId === tag.id ? null : tag.id)}
            />
          ))}
        </ScrollView>
        {side && side.folders.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.bleed} contentContainerStyle={s.chips}>
            {side.folders.map((f) => (
              <Chip key={f.id} size="sm" icon={Folder} label={f.name} onPress={() => router.push({ pathname: '/pasta/[id]', params: { id: f.id } })} />
            ))}
            <Chip size="sm" icon={Folders} label="Todas" onPress={() => router.push('/pastas')} />
          </ScrollView>
        )}
      </View>

      {failed ? (
        <Alert tone="danger">Não foi possível ler as notas deste aparelho.</Alert>
      ) : visible === null ? null : visible.length === 0 ? (
        filtered ? (
          <EmptyState compact message="Nenhuma nota aqui ainda." />
        ) : (
          <EmptyState
            title="Sua primeira nota"
            message="Crie sua primeira anotação e eu guardo pra você. Funciona sem internet."
            actionLabel="Escrever nota"
            onAction={() => void create({})}
          />
        )
      ) : (
        <>
          {pinned.length > 0 && (
            <Section title="Fixadas">
              <View style={s.grid}>
                {pinned.map((n) => (
                  <PinnedNoteCard key={n.id} note={n} onPress={() => openNote(n.id)} />
                ))}
              </View>
            </Section>
          )}
          {rest && rest.length > 0 && (
            <Section title={filtered ? 'Notas' : 'Recentes'}>
              <NoteRows notes={rest} onOpen={(n) => openNote(n.id)} onLongPress={quick.open} />
            </Section>
          )}
        </>
      )}
      <View style={s.footer}>
        <Button
          label={side ? `Lixeira · ${side.trash}` : 'Lixeira'}
          icon={Trash2}
          variant="subtle"
          size="sm"
          onPress={() => router.push('/lixeira')}
        />
      </View>
      {quick.element}
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  controls: { gap: t.space[3] },
  actions: { flexDirection: 'row', gap: t.space[2] },
  bleed: { marginHorizontal: -t.layout.gutter },
  chips: { gap: t.space[2], paddingHorizontal: t.layout.gutter },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space[3] },
  footer: { alignItems: 'center' },
}));
