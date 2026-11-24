import type { NoteListQuery } from '@glife/domain/notes';
import { router, useLocalSearchParams } from 'expo-router';
import { Folder, Plus, Search, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { useLinksData } from '@/features/links';
import { Chip, EmptyState, IconButton, NavRow, Screen, SearchField, Text, makeStyles } from '@/shared/ui';

import { NoteRows } from '../components/NoteRows';
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
  const folderNames = side?.folders.map((f) => f.name) ?? [];
  const folderSummary =
    folderNames.length === 0
      ? 'Nenhuma'
      : folderNames.length <= 3
        ? folderNames.join(', ')
        : `${folderNames.slice(0, 3).join(', ')} +${folderNames.length - 3}`;

  return (
    <Screen
      title="Notas"
      eyebrow={filtered || !items ? ' ' : `${total}${total === LIST_LIMIT ? '+' : ''} ${total === 1 ? 'nota' : 'notas'}`}
      action={
        <View style={s.actions}>
          <IconButton icon={Search} label="Buscar em tudo" variant="ghost" onPress={() => router.push('/busca')} />
          <IconButton icon={Plus} label="Nova nota" onPress={() => void create({})} />
        </View>
      }
    >
      <View style={s.controls}>
        <SearchField value={search} onChangeText={setSearch} placeholder="Buscar notas" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
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
      </View>

      <View>
        <NavRow icon={Folder} label="Pastas" meta={folderSummary} onPress={() => router.push('/pastas')} />
        {failed ? (
          <Text tone="secondary" style={s.message}>
            Não foi possível ler as notas deste aparelho.
          </Text>
        ) : visible === null ? null : visible.length === 0 ? (
          filtered ? (
            <Text variant="small" tone="tertiary" style={s.message}>
              Nenhuma nota encontrada.
            </Text>
          ) : (
            <View style={s.empty}>
              <EmptyState message="Nenhuma nota ainda." actionLabel="Nova nota" onAction={() => void create({})} />
            </View>
          )
        ) : (
          <NoteRows notes={visible} onOpen={(n) => openNote(n.id)} onLongPress={quick.open} />
        )}
        <View style={s.trash}>
          <NavRow
            icon={Trash2}
            iconColor="textSecondary"
            label="Lixeira"
            meta={side ? String(side.trash) : undefined}
            onPress={() => router.push('/lixeira')}
          />
        </View>
      </View>
      {quick.element}
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  controls: { gap: t.space[3] },
  actions: { flexDirection: 'row', gap: t.space[2] },
  chips: { gap: t.space[1.5] },
  message: { paddingVertical: t.space[4], borderTopWidth: t.hairline, borderTopColor: t.colors.hairline },
  empty: { borderTopWidth: t.hairline, borderTopColor: t.colors.hairline },
  trash: { marginTop: t.layout.blockGap },
}));
