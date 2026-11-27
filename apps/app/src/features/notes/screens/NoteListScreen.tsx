import type { NoteListQuery } from '@glife/domain/notes';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { Folder, Folders, Hash, ListChecks, SquarePen, Trash2 } from 'lucide-react-native';
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { BackHandler, ScrollView, View } from 'react-native';

import { useLinksData } from '@/features/links';
import { Alert, Button, Chip, EmptyState, IconButton, Screen, SearchField, Section, Text, makeStyles } from '@/shared/ui';

import { BulkTagsSheet, MoveNotesSheet } from '../components/BulkSheets';
import { NoteRows } from '../components/NoteRows';
import { PinnedNoteCard } from '../components/PinnedNoteCard';
import { SelectionBar, type BulkAction } from '../components/SelectionBar';
import { useNotesData } from '../hooks/NotesData';
import { bulkPinTarget, selectionKey, selectionLabel } from '../hooks/selection';
import { useFocusData } from '../hooks/useFocusData';
import { useNoteList } from '../hooks/useNoteList';
import { openNote, useCreateNote } from '../hooks/useNoteActions';
import { useBulkNoteActions, useNoteSelection } from '../hooks/useNoteSelection';

type ListFilter = 'all' | 'pinned';

const LIST_FILTERS: { value: ListFilter; label: string; query: NoteListQuery }[] = [
  { value: 'all', label: 'Todas', query: {} },
  { value: 'pinned', label: 'Fixadas', query: { pinned: true } },
];

const LIST_LIMIT = 200;
const HIDDEN_TAB_BAR = { display: 'none' } as const;

/**
 * Notas do aparelho (funciona sem internet), com acesso a Pastas, Tags e Lixeira.
 * Seleção múltipla: toque longo numa nota ou "Selecionar"; as abas somem e a barra de ações flutua no lugar.
 */
export function NoteListScreen() {
  const s = useStyles();
  const navigation = useNavigation();
  const selection = useNoteSelection();
  const [sheet, setSheet] = useState<'move' | 'tags' | null>(null);
  const [busy, setBusy] = useState(false);
  const { notes, folders } = useNotesData();
  const { tags } = useLinksData();
  const [filter, setFilter] = useState<ListFilter>('all');
  const [search, setSearch] = useState('');
  // `/notas?tag=<id>` (ex.: tag escolhida na busca universal) vira "#nome" no campo de busca.
  const { tag } = useLocalSearchParams<{ tag?: string }>();
  useEffect(() => {
    if (typeof tag !== 'string' || !tag) return;
    let active = true;
    void tags.list().then((all) => {
      const found = all.find((t) => t.id === tag);
      if (!active || !found) return;
      setFilter('all');
      setSearch(`#${found.name}`);
    });
    return () => {
      active = false;
    };
  }, [tags, tag]);
  const term = search.trim();
  // "#nome" na busca acha as notas com a tag (além das que têm o texto); não há chip de tag no filtro.
  const tagTerm = term.startsWith('#') ? term.replace(/^#+/, '').toLowerCase() : null;
  const query = LIST_FILTERS.find((f) => f.value === filter)!.query;
  const { items, failed } = useNoteList({ ...query, search: tagTerm === null ? term : '', limit: LIST_LIMIT });
  const create = useCreateNote();

  const { data: side, reload } = useFocusData(
    async () => {
      const [allFolders, trash] = await Promise.all([folders.list(), notes.countTrash()]);
      return { folders: allFolders, trash };
    },
  );
  const bulk = useBulkNoteActions(reload);
  const [searchTagged, setSearchTagged] = useState<Set<string>>(new Set());
  useEffect(() => {
    let active = true;
    if (!tagTerm) return;
    void (async () => {
      const matching = (await tags.list()).filter((t) => t.name.toLowerCase().startsWith(tagTerm));
      const ids = await Promise.all(matching.map((t) => tags.entitiesWithTag(t.id, 'note')));
      if (active) setSearchTagged(new Set(ids.flat()));
    })();
    return () => {
      active = false;
    };
  }, [tags, tagTerm, items]);

  // Seleção: as abas somem; o voltar do Android sai da seleção em vez de sair da tela.
  useLayoutEffect(() => {
    navigation.setOptions({ tabBarStyle: selection.active ? HIDDEN_TAB_BAR : undefined });
  }, [navigation, selection.active]);
  const { active: selecting, cancel } = selection;
  useEffect(() => {
    if (!selecting) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      cancel();
      return true;
    });
    return () => sub.remove();
  }, [selecting, cancel]);

  const visible = useMemo(() => {
    let list = items;
    if (list && tagTerm !== null) {
      const text = term.toLowerCase();
      list = list.filter(
        (n) => (tagTerm && searchTagged.has(n.id)) || n.title.toLowerCase().includes(text) || n.body_md.toLowerCase().includes(text),
      );
    }
    return list;
  }, [items, tagTerm, term, searchTagged]);
  const filtered = filter !== 'all' || term !== '';
  const total = items?.length ?? 0;
  const pinned = !filtered && visible ? visible.filter((n) => n.pinned) : [];
  const rest = !filtered && visible ? visible.filter((n) => !n.pinned) : visible;
  // Na seleção, uma lista só (fixadas primeiro), como no protótipo.
  const ordered = visible ? [...pinned, ...(rest ?? [])] : [];
  // Mesma lista enquanto a seleção e as notas não mudam (as folhas não recarregam a cada renderização).
  const key = selectionKey(selection.ids);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` resume `selection.ids`
  const chosen = useMemo(() => (visible ?? []).filter((n) => selection.ids.has(n.id)), [visible, key]);

  const finish = async (work: () => Promise<boolean>) => {
    setBusy(true);
    try {
      if (await work()) {
        setSheet(null);
        selection.cancel();
        reload();
      }
    } finally {
      setBusy(false);
    }
  };

  const onBulk = (action: BulkAction) => {
    if (!chosen.length || busy) return;
    if (action === 'move' || action === 'tags') setSheet(action);
    else if (action === 'pin') void finish(() => bulk.pin(chosen));
    else if (action === 'export') void finish(() => bulk.exportMd(chosen));
    else void finish(() => bulk.trash(chosen));
  };

  if (selection.active) {
    return (
      <View style={s.fill}>
        <Screen
          header={
            <View style={s.selectTop}>
              <Button label="Cancelar" variant="ghost" size="sm" selfAlign="center" onPress={selection.cancel} />
              <Text variant="emphasis" numeric accessibilityLiveRegion="polite">
                {selectionLabel(selection.ids.size)}
              </Text>
              <Button
                label="Todas"
                variant="ghost"
                size="sm"
                selfAlign="center"
                onPress={() => selection.selectAll(ordered.map((n) => n.id))}
              />
            </View>
          }
          tabBar
        >
          {ordered.length > 0 && (
            <NoteRows notes={ordered} onOpen={(n) => selection.toggle(n.id)} selection={selection.ids} />
          )}
        </Screen>
        <SelectionBar
          disabled={!chosen.length || busy}
          pinLabel={chosen.length && !bulkPinTarget(chosen) ? 'Desafixar' : 'Fixar'}
          onAction={onBulk}
        />
        <MoveNotesSheet
          visible={sheet === 'move'}
          folders={side?.folders ?? []}
          onClose={() => setSheet(null)}
          onPick={(f) => void finish(() => bulk.move(chosen, f && { id: f.id, name: f.name }))}
        />
        <BulkTagsSheet
          visible={sheet === 'tags'}
          notes={chosen}
          onClose={() => setSheet(null)}
          onDone={(change) => void finish(() => bulk.applyTags(chosen, change))}
        />
      </View>
    );
  }

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
          {LIST_FILTERS.map((f) => (
            <Chip
              key={f.value}
              size="sm"
              label={f.label}
              selected={filter === f.value}
              onPress={() => setFilter(f.value)}
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
              <NoteRows notes={rest} onOpen={(n) => openNote(n.id)} onLongPress={(n) => selection.start(n.id)} />
            </Section>
          )}
        </>
      )}
      <View style={s.footer}>
        <Button label="Tags" icon={Hash} variant="subtle" size="sm" onPress={() => router.push('/tags')} />
        {!!visible?.length && (
          <Button label="Selecionar" icon={ListChecks} variant="subtle" size="sm" onPress={() => selection.start()} />
        )}
        <Button
          label={side ? `Lixeira · ${side.trash}` : 'Lixeira'}
          icon={Trash2}
          variant="subtle"
          size="sm"
          onPress={() => router.push('/lixeira')}
        />
      </View>
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  fill: { flex: 1 },
  controls: { gap: t.space[3] },
  actions: { flexDirection: 'row', gap: t.space[2] },
  bleed: { marginHorizontal: -t.layout.gutter },
  chips: { gap: t.space[2], paddingHorizontal: t.layout.gutter },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space[3] },
  footer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: t.space[1] },
  selectTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: t.size.iconButton, gap: t.space[2] },
}));
