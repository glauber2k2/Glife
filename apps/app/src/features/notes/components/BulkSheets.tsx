// Folhas da seleção múltipla: mover para pasta (protótipo `moverPasta`) e tags (protótipo `tags`), em lote.
import { TAG_NAME_MAX, normalizeTagName, tagKey, type Tag } from '@glife/domain/tags';
import type { Note, NoteFolder } from '@glife/domain/notes';
import { Folder, FolderOpen, Hash } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { useLinksData } from '@/features/links';
import { Button, Chip, Input, ListGroup, NavRow, Sheet, Text, makeStyles } from '@/shared/ui';

import { commonTagState, type TagState } from '../hooks/selection';

export function MoveNotesSheet({
  visible,
  folders,
  onClose,
  onPick,
}: {
  visible: boolean;
  folders: readonly NoteFolder[];
  onClose: () => void;
  onPick: (folder: NoteFolder | null) => void;
}) {
  return (
    <Sheet visible={visible} onClose={onClose} title="Mover para pasta">
      <ListGroup>
        {folders.map((f) => (
          <NavRow key={f.id} icon={Folder} module="notes" label={f.name} onPress={() => onPick(f)} />
        ))}
        <NavRow icon={FolderOpen} label="Sem pasta" meta="Tira as notas das pastas" onPress={() => onPick(null)} />
      </ListGroup>
    </Sheet>
  );
}

/**
 * Tags das notas selecionadas: chip marcado = todas têm (só algumas = desmarcado); tocar marca para todas ou tira de todas.
 * "Pronto" grava tudo numa transação (`applyMany`).
 */
export function BulkTagsSheet({
  visible,
  notes,
  onClose,
  onDone,
}: {
  visible: boolean;
  notes: readonly Note[];
  onClose: () => void;
  onDone: (change: { add: string[]; remove: string[] }) => void;
}) {
  const s = useStyles();
  const { tags } = useLinksData();
  const [all, setAll] = useState<Tag[]>([]);
  const [initial, setInitial] = useState<Map<string, TagState>>(new Map());
  const [wanted, setWanted] = useState<Map<string, TagState>>(new Map());
  const [fresh, setFresh] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!visible) return;
    let active = true;
    void (async () => {
      const [list, perNote] = await Promise.all([
        tags.list(),
        Promise.all(notes.map(async (n) => [n.id, new Set((await tags.forEntity({ type: 'note', id: n.id })).map((x) => x.id))] as const)),
      ]);
      if (!active) return;
      const tagsOf = new Map(perNote);
      const ids = notes.map((n) => n.id);
      const states = new Map(list.map((x) => [x.id, commonTagState(ids, tagsOf, x.id)]));
      setAll(list);
      setInitial(states);
      setWanted(new Map(states));
      setFresh([]);
      setDraft('');
      setError(undefined);
    })();
    return () => {
      active = false;
    };
  }, [visible, notes, tags]);

  const addDraft = () => {
    let name: string;
    try {
      name = normalizeTagName(draft);
    } catch {
      setError('Dê um nome à tag, numa linha só.');
      return;
    }
    const existing = all.find((x) => tagKey(x.name) === tagKey(name));
    if (existing) setWanted((m) => new Map(m).set(existing.id, 'all'));
    else if (!fresh.some((f) => tagKey(f) === tagKey(name))) setFresh((f) => [...f, name]);
    setDraft('');
  };

  const done = () => {
    const add = [...fresh];
    const remove: string[] = [];
    for (const x of all) {
      const before = initial.get(x.id);
      const after = wanted.get(x.id);
      if (after === 'all' && before !== 'all') add.push(x.name);
      if (after === 'none' && before !== 'none') remove.push(x.id);
    }
    onDone({ add, remove });
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Tags" subtitle={notes.length === 1 ? '1 nota' : `${notes.length} notas`}>
      <Input
        label="Nova tag"
        value={draft}
        onChangeText={(v) => {
          setDraft(v);
          setError(undefined);
        }}
        error={error}
        maxLength={TAG_NAME_MAX + 1}
        autoCapitalize="none"
        returnKeyType="done"
        onSubmitEditing={addDraft}
        submitBehavior="submit"
      />
      {(all.length > 0 || fresh.length > 0) && (
        <View style={s.chips}>
          {fresh.map((name) => (
            <Chip key={`novo-${name}`} label={`#${name}`} selected onPress={() => setFresh((f) => f.filter((x) => x !== name))} />
          ))}
          {all.map((x) => (
            <Chip
              key={x.id}
              label={`#${x.name}`}
              selected={wanted.get(x.id) === 'all'}
              onPress={() => setWanted((m) => new Map(m).set(x.id, m.get(x.id) === 'all' ? 'none' : 'all'))}
            />
          ))}
        </View>
      )}
      <View style={s.hint}>
        <Text variant="caption" tone="tertiary">
          Tags valem para qualquer coisa: notas, gastos e, depois, eventos e fotos.
        </Text>
      </View>
      <Button label="Pronto" icon={Hash} fullWidth onPress={done} />
    </Sheet>
  );
}

const useStyles = makeStyles((t) => ({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: t.space[2] },
  hint: { paddingHorizontal: t.space[1] },
}));
