import type { NoteFolder } from '@glife/domain/notes';
import { useLocalSearchParams } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { useLinksData } from '@/features/links';
import { Button, Chip, Screen, Text, makeStyles } from '@/shared/ui';

import { NoteRows } from '../components/NoteRows';
import { SubHeader } from '../components/SubHeader';
import { useNotesData } from '../hooks/NotesData';
import { useNoteList } from '../hooks/useNoteList';
import { openNote, useCreateNote } from '../hooks/useNoteActions';

interface TagIndex {
  id: string;
  name: string;
  notes: Set<string>;
}

/** Notas de uma pasta; as tags dessas notas viram filtros em chip. */
export function FolderScreen() {
  const s = useStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { folders } = useNotesData();
  const { tags } = useLinksData();
  const [folder, setFolder] = useState<NoteFolder | null | undefined>(undefined);
  const [tagIndex, setTagIndex] = useState<TagIndex[]>([]);
  const [tagId, setTagId] = useState<string | null>(null);
  const { items } = useNoteList({ folderId: id, limit: 200 });
  const create = useCreateNote();

  useEffect(() => {
    let active = true;
    void folders.list().then((all) => active && setFolder(all.find((f) => f.id === id) ?? null));
    return () => {
      active = false;
    };
  }, [folders, id]);

  // Tags presentes nas notas desta pasta.
  useEffect(() => {
    let active = true;
    if (!items) return;
    void (async () => {
      const all = await tags.list();
      const index = await Promise.all(
        all.map(async (tag) => ({ id: tag.id, name: tag.name, notes: new Set(await tags.entitiesWithTag(tag.id, 'note')) })),
      );
      if (active) setTagIndex(index.filter((tag) => items.some((n) => tag.notes.has(n.id))));
    })();
    return () => {
      active = false;
    };
  }, [tags, items]);

  const selected = tagIndex.find((tag) => tag.id === tagId);
  const visible = items && selected ? items.filter((n) => selected.notes.has(n.id)) : items;
  const newHere = () => void create({ folder_id: id });

  if (folder === null) {
    return (
      <Screen>
        <SubHeader eyebrow="Pastas" title="Pasta" />
        <Text tone="secondary">Esta pasta não existe mais.</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <SubHeader eyebrow="Pastas" title={folder?.name ?? ' '} plusLabel="Nova nota nesta pasta" onPlus={newHere} />
      {tagIndex.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
          <Chip size="sm" label="Todas" selected={!tagId} onPress={() => setTagId(null)} />
          {tagIndex.map((tag) => (
            <Chip key={tag.id} size="sm" label={`#${tag.name}`} selected={tagId === tag.id} onPress={() => setTagId(tag.id)} />
          ))}
        </ScrollView>
      )}
      {visible === null ? null : visible.length === 0 && !selected ? (
        <View style={s.empty}>
          <Text tone="secondary">Nenhuma nota nesta pasta.</Text>
          <Button label="Nova nota aqui" size="sm" icon={Plus} onPress={newHere} />
        </View>
      ) : (
        <NoteRows notes={visible} onOpen={(n) => openNote(n.id)} />
      )}
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  chips: { gap: t.space[1.5] },
  empty: {
    gap: t.space[4],
    alignItems: 'flex-start',
    paddingTop: t.layout.blockGap,
    borderTopWidth: t.hairline,
    borderTopColor: t.colors.hairline,
  },
}));
