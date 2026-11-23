import type { NoteListQuery } from '@glife/domain/notes';
import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Chip, EmptyState, IconButton, Reveal, Screen, SearchField, Text, makeStyles } from '@/shared/ui';

import { NoteRow } from '../components/NoteRow';
import { useNotesData } from '../hooks/NotesData';
import { useNoteList } from '../hooks/useNoteList';

type Filter = 'all' | 'pinned' | 'journal' | 'devotional';

const FILTERS: { value: Filter; label: string; query: NoteListQuery }[] = [
  { value: 'all', label: 'Todas', query: {} },
  { value: 'pinned', label: 'Fixadas', query: { pinned: true } },
  { value: 'journal', label: 'Diário', query: { kind: 'journal' } },
  { value: 'devotional', label: 'Devocionais', query: { kind: 'devotional' } },
];

const LIST_LIMIT = 200;

/** Lista de notas lida do banco local (funciona sem internet). Pastas e tags: prototipagem pendente. */
export function NoteListScreen() {
  const s = useStyles();
  const { notes } = useNotesData();
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const query = FILTERS.find((f) => f.value === filter)!.query;
  const { items, failed } = useNoteList({ ...query, search: search.trim(), limit: LIST_LIMIT });
  const [creating, setCreating] = useState(false);

  const create = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const note = await notes.create({});
      router.push({ pathname: '/nota/[id]', params: { id: note.id } });
    } finally {
      setCreating(false);
    }
  };

  const filtered = filter !== 'all' || search.trim() !== '';
  const eyebrow = items ? `${items.length}${items.length === LIST_LIMIT ? '+' : ''} ${items.length === 1 ? 'nota' : 'notas'}` : ' ';

  return (
    <Screen
      title="Notas"
      eyebrow={filtered ? ' ' : eyebrow}
      action={<IconButton icon={Plus} label="Nova nota" onPress={() => void create()} disabled={creating} />}
    >
      <View style={s.controls}>
        <SearchField value={search} onChangeText={setSearch} placeholder="Buscar notas" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
          {FILTERS.map((f) => (
            <Chip key={f.value} size="sm" label={f.label} selected={filter === f.value} onPress={() => setFilter(f.value)} />
          ))}
        </ScrollView>
      </View>

      {failed ? (
        <Text tone="secondary">Não foi possível ler as notas deste aparelho.</Text>
      ) : items === null ? null : items.length === 0 ? (
        filtered ? (
          <Text variant="small" tone="tertiary">
            Nenhuma nota encontrada.
          </Text>
        ) : (
          <EmptyState message="Nenhuma nota ainda." actionLabel="Nova nota" onAction={() => void create()} />
        )
      ) : (
        <View>
          <Reveal key={`${filter}|${search.trim()}`}>
            {items.map((n) => (
              <NoteRow key={n.id} note={n} onPress={() => router.push({ pathname: '/nota/[id]', params: { id: n.id } })} />
            ))}
          </Reveal>
        </View>
      )}
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  controls: { gap: t.space[3] },
  chips: { gap: t.space[1.5] },
}));
