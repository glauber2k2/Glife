import { folderBreadcrumbs, folderChildren, folderPath, type NoteFolder, type NoteFolderSummary } from '@glife/domain/notes';
import { router, useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import { Folder, FolderPlus } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { useLinksData } from '@/features/links';
import { Button, Chip, EmptyState, ListGroup, NavRow, Screen, Section, Text, makeStyles } from '@/shared/ui';

import { NoteRows } from '../components/NoteRows';
import { FolderNameSheet } from '../components/FolderNameSheet';
import { FolderMenu, useNoteQuickActions } from '../components/NoteQuickActions';
import { SubHeader } from '../components/SubHeader';
import { folderUpAction } from '../hooks/folderNavigation';
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
  const navigation = useNavigation();
  const { folders } = useNotesData();
  const { tags } = useLinksData();
  const [folder, setFolder] = useState<NoteFolder | null | undefined>(undefined);
  const [summaries, setSummaries] = useState<NoteFolderSummary[]>([]);
  const [creating, setCreating] = useState(false);
  const [version, setVersion] = useState(0);
  const reload = () => setVersion((v) => v + 1);
  const [tagIndex, setTagIndex] = useState<TagIndex[]>([]);
  const [tagId, setTagId] = useState<string | null>(null);
  const { items } = useNoteList({ folderId: id, limit: 200 });
  const create = useCreateNote();
  const quick = useNoteQuickActions();
  const [menu, setMenu] = useState(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    void folders.listSummaries().then((all) => {
      if (!active) return;
      setSummaries(all);
      setFolder(all.find((s) => s.folder.id === id)?.folder ?? null);
    });
    return () => {
      active = false;
    };
    // version força uma nova leitura após criar, mover ou renomear, sem trocar o repositório.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folders, id, version]));

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
  const allFolders = summaries.map((s) => s.folder);
  const subfolders = folderChildren(allFolders, id);
  const path = folderBreadcrumbs(allFolders, id);
  const parent = path.at(-2);
  // Volta quando a tela anterior já é a mãe (como goBack() das notas); senão troca, sem empilhar a mãe duas vezes.
  const goUp = () => {
    const state = navigation.getState() as Parameters<typeof folderUpAction>[0];
    if (folderUpAction(state, parent?.id ?? null) === 'back' && router.canGoBack()) router.back();
    else if (parent) router.replace({ pathname: '/pasta/[id]', params: { id: parent.id } });
    else router.replace('/pastas');
  };
  const notesInside = summaries.find((s) => s.folder.id === id)?.notes ?? items?.length ?? 0;

  if (folder === null) {
    return (
      <Screen header={<SubHeader title="Pasta" />}>
        <EmptyState title="Pasta não encontrada" message="Esta pasta não existe mais." mood="pensando" />
      </Screen>
    );
  }

  return (
    <Screen
      header={
        <SubHeader
          title={folder?.name ?? ' '}
          text={folder ? folderPath(allFolders, folder.id) : undefined}
          plusLabel="Nova nota nesta pasta"
          onPlus={newHere}
          moreLabel="Mais ações da pasta"
          onMore={folder ? () => setMenu(true) : undefined}
        />
      }
    >
      {folder && (
        <View style={s.actions}>
          <Button label={parent ? 'Pasta acima' : 'Todas as pastas'} size="sm" variant="secondary" selfAlign="center" onPress={goUp} />
          <Button label="Nova subpasta" size="sm" variant="secondary" icon={FolderPlus} selfAlign="center" onPress={() => setCreating(true)} />
        </View>
      )}
      {subfolders.length > 0 && (
        <Section title="Subpastas">
          <ListGroup>
            {subfolders.map((f) => (
              <NavRow key={f.id} label={f.name} icon={Folder} module="notes" onPress={() => router.push({ pathname: '/pasta/[id]', params: { id: f.id } })} />
            ))}
          </ListGroup>
        </Section>
      )}
      {folder && <Text variant="label" tone="tertiary">{notesInside === 1 ? '1 nota nesta pasta' : `${notesInside} notas nesta pasta`}</Text>}
      {tagIndex.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.bleed} contentContainerStyle={s.chips}>
          <Chip size="sm" label="Todas" selected={!tagId} onPress={() => setTagId(null)} />
          {tagIndex.map((tag) => (
            <Chip key={tag.id} size="sm" label={`#${tag.name}`} selected={tagId === tag.id} onPress={() => setTagId(tag.id)} />
          ))}
        </ScrollView>
      )}
      {visible === null ? null : visible.length === 0 && !selected ? (
        <EmptyState compact={subfolders.length > 0} title={subfolders.length ? 'Nenhuma nota aqui' : 'Pasta vazia'} message="Nenhuma nota diretamente nesta pasta ainda." actionLabel="Nova nota aqui" onAction={newHere} />
      ) : (
        <NoteRows notes={visible} onOpen={(n) => openNote(n.id)} onLongPress={quick.open} />
      )}
      {quick.element}
      {folder && (
        <FolderMenu
          folder={folder}
          open={menu}
          notesInside={notesInside}
          allFolders={allFolders}
          onClose={() => setMenu(false)}
          onRenamed={reload}
          onMoved={reload}
          onDeleted={goUp}
        />
      )}
      <FolderNameSheet visible={creating} parentId={id} onClose={() => setCreating(false)} onCreated={() => { setCreating(false); reload(); }} />
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: t.space[2] },
  bleed: { marginHorizontal: -t.layout.gutter },
  chips: { gap: t.space[2], paddingHorizontal: t.layout.gutter },
}));
