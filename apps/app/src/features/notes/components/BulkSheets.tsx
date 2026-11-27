// Folhas da seleção múltipla: mover para pasta (protótipo `moverPasta`) e tags (protótipo `tags`), em lote.
import { TAG_NAME_MAX, normalizeTagName, tagKey, type Tag } from '@glife/domain/tags';
import type { Note, NoteFolder } from '@glife/domain/notes';
import { Hash } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { useLinksData } from '@/features/links';
import { Button, Chip, Input, Sheet, Text, makeStyles } from '@/shared/ui';

import { commonTagState, nextTagState, tagChange, type TagState } from '../hooks/selection';
import { FolderPicker } from './FolderPicker';

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
      <FolderPicker folders={folders} onPick={onPick} />
    </Sheet>
  );
}

/**
 * Tags das notas selecionadas: chip marcado = todas têm; traço = só algumas (algumas → todas → nenhuma → algumas).
 * Carrega uma vez ao abrir. "Pronto" grava só o que mudou, numa transação (`applyMany`).
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
  // As notas são lidas ao abrir: re-renderizações da tela (lista nova a cada render) não recarregam a folha.
  const notesRef = useRef(notes);
  useEffect(() => {
    notesRef.current = notes;
  });

  useEffect(() => {
    if (!visible) return;
    const notes = notesRef.current;
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
  }, [visible, tags]);

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

  const done = () => onDone(tagChange(all, initial, wanted, fresh));

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
              mixed={wanted.get(x.id) === 'some'}
              onPress={() =>
                setWanted((m) => new Map(m).set(x.id, nextTagState(initial.get(x.id) ?? 'none', m.get(x.id) ?? 'none')))
              }
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
